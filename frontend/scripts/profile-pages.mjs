import puppeteer from "puppeteer-core";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const email = process.argv[3] || "admin@medica.com";
const password = process.argv[4] || "admin123";
const backendHealthUrl = process.argv[5] || process.env.BACKEND_HEALTH_URL || "http://127.0.0.1:8000/health";

const pagesToProfile = [
  { key: "appointments", path: "/appointments", waitForText: "Appointments" },
  { key: "patients", path: "/patients", waitForText: "Patients" },
  { key: "administration", path: "/administration", waitForText: "Administration" },
];

const SCRIPT_TIMEOUT_MS = 120000;
const STEP_TIMEOUT_MS = 20000;
const startedAt = Date.now();

function log(message, extra) {
  const elapsed = Date.now() - startedAt;
  if (extra) {
    console.error(`[profile-pages +${elapsed}ms] ${message}`, extra);
  } else {
    console.error(`[profile-pages +${elapsed}ms] ${message}`);
  }
}

async function withTimeout(promise, label, timeoutMs = STEP_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkBackend() {
  log("checking backend health");
  const deadline = Date.now() + 20000;
  let lastError = "unknown";
  while (Date.now() < deadline) {
    try {
      const res = await withTimeout(fetch(backendHealthUrl), "backend health check", 4000);
      if (res.ok) return;
      lastError = `health status ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(`backend not running: ${lastError}`);
}

function summarizeApiRequests(requests, startedAtMs) {
  const apiReq = requests.filter((r) => r.url.includes("/api/v1/") && r.startedAtMs >= startedAtMs);
  return {
    apiTotal: apiReq.length,
    slowestApi: [...apiReq].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8),
  };
}

async function run() {
  let browser;
  let page;
  const requests = [];
  const starts = new Map();
  const result = {
    baseUrl,
    finalUrl: "",
    pages: [],
    errors: [],
    loginError: null,
    success: false,
  };

  try {
    await checkBackend();
    log("starting browser");
    browser = await withTimeout(
      puppeteer.launch({
        headless: true,
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      }),
      "browser launch"
    );

    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.setDefaultNavigationTimeout(STEP_TIMEOUT_MS);
    page.setDefaultTimeout(STEP_TIMEOUT_MS);

    page.on("request", (req) => starts.set(req, Date.now()));
    page.on("requestfinished", (req) => {
      const start = starts.get(req) || Date.now();
      starts.delete(req);
      const res = req.response();
      requests.push({
        url: req.url(),
        method: req.method(),
        type: req.resourceType(),
        status: res?.status() || 0,
        durationMs: Date.now() - start,
        startedAtMs: start,
      });
    });
    page.on("requestfailed", (req) => {
      const start = starts.get(req) || Date.now();
      starts.delete(req);
      requests.push({
        url: req.url(),
        method: req.method(),
        type: req.resourceType(),
        status: 0,
        durationMs: Date.now() - start,
        startedAtMs: start,
        failed: true,
      });
    });

    log("opening login page");
    await withTimeout(page.goto(`${baseUrl}/login?perf=1`, { waitUntil: "domcontentloaded" }), "open login page");
    await withTimeout(page.waitForSelector("#email"), "wait email input");
    await withTimeout(page.waitForSelector("#password"), "wait password input");

    log("logging in");
    await withTimeout(page.type("#email", email, { delay: 8 }), "type email");
    await withTimeout(page.type("#password", password, { delay: 8 }), "type password");
    await withTimeout(page.click('button[type="submit"]'), "click submit");
    await withTimeout(
      page.waitForFunction(
        () => window.location.pathname.includes("/dashboard") || document.body.innerText.includes("Login failed") || document.body.innerText.includes("Invalid email or password")
      ),
      "wait dashboard route"
    );
    if (!page.url().includes("/dashboard")) {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1200));
      result.loginError = `login did not reach dashboard`;
      result.errors.push({
        stage: "login",
        message: result.loginError,
        currentUrl: page.url(),
        visibleText: bodyText,
      });
      throw new Error(`${result.loginError}: ${bodyText}`);
    }
    await withTimeout(
      page.waitForFunction(() => document.body.innerText.includes("Total Patients")),
      "wait dashboard content"
    );

    const pages = [];
    for (const route of pagesToProfile) {
      try {
        log(`profiling ${route.key}`);
        const routeStart = Date.now();
        await withTimeout(page.goto(`${baseUrl}${route.path}?perf=1`, { waitUntil: "domcontentloaded" }), `${route.key} goto`);
        await withTimeout(
          page.waitForFunction(
            (expected) => {
              const body = document.body.innerText || "";
              const h1 = document.querySelector("h1")?.textContent || "";
              return body.includes(expected) || h1.includes(expected);
            },
            {},
            route.waitForText
          ),
          `${route.key} wait content`,
          25000
        );
        await withTimeout(new Promise((resolve) => setTimeout(resolve, 900)), `${route.key} settle`, 3000);

        pages.push({
          page: route.key,
          path: route.path,
          timeToUsableMs: Date.now() - routeStart,
          ...summarizeApiRequests(requests, routeStart),
        });
      } catch (pageErr) {
        const message = pageErr instanceof Error ? pageErr.message : String(pageErr);
        const currentUrl = page.url();
        const visibleText = await page.evaluate(() => document.body.innerText.slice(0, 1200));
        result.errors.push({
          stage: route.key,
          message,
          currentUrl,
          visibleText,
        });
        log(`failed page ${route.key}`, { message, currentUrl });
      }
    }

    result.finalUrl = page.url();
    result.pages = pages;
    result.success = result.errors.length === 0;
    log("success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (page) {
      const currentUrl = page.url();
      let visibleText = "";
      try {
        visibleText = await page.evaluate(() => document.body.innerText.slice(0, 1200));
      } catch {}
      result.errors.push({ stage: "fatal", message, currentUrl, visibleText });
      result.finalUrl = currentUrl;
      log("failed", { reason: message, currentUrl });
    } else {
      result.errors.push({ stage: "fatal", message, currentUrl: "", visibleText: "" });
      log("failed", { reason: message });
    }
    console.error(`[profile-pages] failure reason: ${message}`);
    process.exitCode = 1;
  } finally {
    try {
      console.log(JSON.stringify(result, null, 2));
    } catch (jsonErr) {
      console.error(`[profile-pages] failed writing JSON: ${jsonErr instanceof Error ? jsonErr.message : String(jsonErr)}`);
    }
    if (browser) await browser.close();
  }
}

await withTimeout(run(), "full page profiling script", SCRIPT_TIMEOUT_MS);
