param(
  [string]$BaseUrl = "http://127.0.0.1:5174",
  [string]$BackendHost = "127.0.0.1",
  [int]$BackendPort = 8001,
  [int]$FrontendPort = 5174,
  [string]$Email = "admin@medica.com",
  [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  $ts = Get-Date -Format "HH:mm:ss.fff"
  [Console]::Out.WriteLine("[profile-run $ts] $Message")
}

function Wait-HttpReady([string]$Url, [int]$Attempts = 80, [int]$SleepMs = 500) {
  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      $res = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($res.StatusCode -eq 200) { return $true }
    } catch {}
    Start-Sleep -Milliseconds $SleepMs
  }
  return $false
}

function Stop-ProcessTree([object]$Proc, [string]$Name) {
  if (-not $Proc) { return }

  $procs = @($Proc)
  foreach ($p in $procs) {
    if (-not $p) { continue }
    try {
      $childProcessId = $p.Id
      if (-not $childProcessId) { continue }

      $live = Get-Process -Id $childProcessId -ErrorAction SilentlyContinue
      if ($live) {
        Write-Step "Stopping $Name PID=$childProcessId"
        Stop-Process -Id $childProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 450
        Wait-Process -Id $childProcessId -Timeout 6 -ErrorAction SilentlyContinue
      }
    } catch {
      Write-Warning ("Cleanup warning for {0}: {1}" -f $Name, $_.Exception.Message)
    }
  }
}

function Start-LoggedProcess(
  [string]$FilePath,
  [string]$Arguments,
  [string]$WorkingDirectory,
  [string]$StdOutPath,
  [string]$StdErrPath,
  [string]$Label
) {
  $p = Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -PassThru -WindowStyle Hidden -RedirectStandardOutput $StdOutPath -RedirectStandardError $StdErrPath
  Write-Step "$Label PID=$($p.Id)"
  return ,$p
}

function Get-ExitCodeOrDiagnostic([System.Diagnostics.Process]$Proc, [string]$Label) {
  if (-not $Proc) {
    Write-Warning "$Label process is null"
    return $null
  }

  try {
    $Proc.Refresh()
    $exitCode = $Proc.ExitCode
    if ($null -eq $exitCode -or "$exitCode" -eq "") {
      Write-Warning "$Label exit code is null/empty"
      Write-Warning ("{0} PID={1} HasExited={2}" -f $Label, $Proc.Id, $Proc.HasExited)
      Write-Warning ("{0} StartInfo FileName={1} Args={2}" -f $Label, $Proc.StartInfo.FileName, $Proc.StartInfo.Arguments)
      return $null
    }
    return [int]$exitCode
  } catch {
    Write-Warning ("Failed reading {0} exit code: {1}" -f $Label, $_.Exception.Message)
    Write-Warning ("{0} PID={1} HasExited={2}" -f $Label, $Proc.Id, $Proc.HasExited)
    Write-Warning ("{0} StartInfo FileName={1} Args={2}" -f $Label, $Proc.StartInfo.FileName, $Proc.StartInfo.Arguments)
    return $null
  }
}

function Report-Artifact([string]$Label, [string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    $file = Get-Item -LiteralPath $Path
    Write-Step ("{0}: exists ({1} bytes)" -f $Label, $file.Length)
  } else {
    Write-Step ("{0}: missing" -f $Label)
  }
}

$tmp = "C:\Users\VIPCOM~1\AppData\Local\Temp\opencode"
$runId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$healthUrl = "http://$BackendHost`:$BackendPort/health"

$backendOut = Join-Path $tmp "perf-backend-$runId.out.log"
$backendErr = Join-Path $tmp "perf-backend-$runId.err.log"
$frontendOut = Join-Path $tmp "perf-frontend-$runId.out.log"
$frontendErr = Join-Path $tmp "perf-frontend-$runId.err.log"
$startupOut = Join-Path $tmp "perf-startup-$runId.json"
$startupErr = Join-Path $tmp "perf-startup-$runId.err.log"
$pagesOut = Join-Path $tmp "perf-pages-$runId.json"
$pagesErr = Join-Path $tmp "perf-pages-$runId.err.log"

Write-Step "Run id: $runId"
Write-Step "Log files will be unique per run"

$backendProc = $null
$frontendProc = $null
$startupProc = $null
$pagesProc = $null
$startupExit = $null
$pagesExit = $null

try {
  $backendProc = Start-LoggedProcess -FilePath "cmd.exe" -Arguments "/c python -u -m uvicorn app.main:app --host $BackendHost --port $BackendPort" -WorkingDirectory "C:\Projects\Medica\backend" -StdOutPath $backendOut -StdErrPath $backendErr -Label "Backend started"

  $frontendProc = Start-LoggedProcess -FilePath "cmd.exe" -Arguments "/c set VITE_API_PROXY_TARGET=http://$BackendHost`:$BackendPort&& npm run dev -- --host 127.0.0.1 --port $FrontendPort" -WorkingDirectory "C:\Projects\Medica\frontend" -StdOutPath $frontendOut -StdErrPath $frontendErr -Label "Frontend started"

  if (-not (Wait-HttpReady -Url $healthUrl)) {
    throw "Backend did not become ready at $healthUrl"
  }
  Write-Step "Backend ready: $healthUrl"

  if (-not (Wait-HttpReady -Url "$BaseUrl/login")) {
    throw "Frontend did not become ready at $BaseUrl/login"
  }
  Write-Step "Frontend ready: $BaseUrl/login"

  $startupProc = Start-LoggedProcess -FilePath "cmd.exe" -Arguments "/c node C:\Projects\Medica\frontend\scripts\profile-startup.mjs $BaseUrl $Email $Password $healthUrl" -WorkingDirectory "C:\Projects\Medica" -StdOutPath $startupOut -StdErrPath $startupErr -Label "Startup profiler started"
  if (-not ($startupProc -is [System.Diagnostics.Process])) {
    throw "startupProc is not a process object"
  }
  $null = $startupProc.WaitForExit()
  $startupExit = Get-ExitCodeOrDiagnostic -Proc $startupProc -Label "startup-profiler"
  Write-Step "Startup profiler exit code: $startupExit"

  $pagesProc = Start-LoggedProcess -FilePath "cmd.exe" -Arguments "/c node C:\Projects\Medica\frontend\scripts\profile-pages.mjs $BaseUrl $Email $Password $healthUrl" -WorkingDirectory "C:\Projects\Medica" -StdOutPath $pagesOut -StdErrPath $pagesErr -Label "Pages profiler started"
  if (-not ($pagesProc -is [System.Diagnostics.Process])) {
    throw "pagesProc is not a process object"
  }
  $null = $pagesProc.WaitForExit()
  $pagesExit = Get-ExitCodeOrDiagnostic -Proc $pagesProc -Label "pages-profiler"
  Write-Step "Pages profiler exit code: $pagesExit"

  ""
  Write-Step "Artifacts"
  "startup-json: $startupOut"
  "startup-err : $startupErr"
  "pages-json  : $pagesOut"
  "pages-err   : $pagesErr"
  "backend-out : $backendOut"
  "backend-err : $backendErr"
  "frontend-out: $frontendOut"
  "frontend-err: $frontendErr"

  ""
  Write-Step "Dashboard query timings"
  if (Test-Path -LiteralPath $backendOut) {
    Select-String -Path $backendOut -Pattern "\[perf\]\[dashboard\]" -ErrorAction SilentlyContinue
  }

  Write-Step "Artifact existence and sizes"
  Report-Artifact -Label "startup-json" -Path $startupOut
  Report-Artifact -Label "pages-json" -Path $pagesOut

  if (($startupExit -ne 0) -or ($pagesExit -ne 0) -or ($null -eq $startupExit) -or ($null -eq $pagesExit)) {
    throw "One or more profilers failed (startup=$startupExit, pages=$pagesExit)"
  }
}
finally {
  try { Stop-ProcessTree -Proc $pagesProc -Name "pages-profiler" } catch { Write-Warning $_.Exception.Message }
  try { Stop-ProcessTree -Proc $startupProc -Name "startup-profiler" } catch { Write-Warning $_.Exception.Message }
  try { Stop-ProcessTree -Proc $frontendProc -Name "frontend" } catch { Write-Warning $_.Exception.Message }
  try { Stop-ProcessTree -Proc $backendProc -Name "backend" } catch { Write-Warning $_.Exception.Message }

  Start-Sleep -Milliseconds 500
  Write-Step "Cleanup complete (processes stopped, file handles released)"
}
