import puppeteer from "puppeteer-core";

const baseUrl = process.argv[2] || "http://127.0.0.1:5173";
const email = process.argv[3] || "admin@medica.com";
const password = process.argv[4] || "admin123";
const backendHealthUrl = process.argv[5] || process.env.BACKEND_HEALTH_URL || "http://127.0.0.1:8000/health";

const SCRIPT_TIMEOUT_MS = 60000;
const STEP_TIMEOUT_MS = 10000;

const startedAt = Date.now();

function log(message, extra) {
  const elapsed = Date.now() - startedAt;
  if (extra) {
    console.error(`[profile +${elapsed}ms] ${message}`, extra);
  } else {
    console.error(`[profile +${elapsed}ms] ${message}`);
  }
}

function fail(reason, details) {
  const message = details ? `${reason}: ${details}` : reason;
  throw new Error(message);
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
  if (!baseUrl.includes(":5173") && !baseUrl.includes(":4173")) return;
  log("checking backend health");
  const deadline = Date.now() + 20000;
  let lastError = "unknown";
  while (Date.now() < deadline) {
    try {
      const res = await withTimeout(fetch(backendHealthUrl), "backend health check", 4000);
      if (res.ok) {
        return;
      }
      lastError = `health status ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  fail("backend not running", lastError);
}

async function run() {
  let browser;
  const requests = [];
  const starts = new Map();

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

    const page = await browser.newPage();
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
        failed: true,
      });
    });

    log("opening login page");
    const navStart = Date.now();
    await withTimeout(page.goto(`${baseUrl}/login?perf=1`, { waitUntil: "domcontentloaded" }), "open login page");

    await withTimeout(page.waitForSelector("#email"), "wait email input");
    await withTimeout(page.waitForSelector("#password"), "wait password input");

    const paint = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        fp: performance.getEntriesByName("first-paint")[0]?.startTime || null,
        fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime || null,
        dcl: nav?.domContentLoadedEventEnd || null,
        load: nav?.loadEventEnd || null,
      };
    });

    log("filling login form");
    await withTimeout(page.type("#email", email, { delay: 8 }), "type email");
    await withTimeout(page.type("#password", password, { delay: 8 }), "type password");

    log("submitting login");
    const loginClick = Date.now();
    await withTimeout(page.click('button[type="submit"]'), "click submit");

    log("waiting for dashboard route");
    await withTimeout(
      page.waitForFunction(() => window.location.pathname.includes("/dashboard") || document.body.innerText.includes("Login failed")),
      "wait route change"
    );

    const currentUrl = page.url();
    if (!currentUrl.includes("/dashboard")) {
      const text = await page.evaluate(() => document.body.innerText.slice(0, 1000));
      if (text.includes("Invalid email or password") || text.includes("Login failed")) {
        fail("login failed", "wrong credentials or auth error message visible");
      }
      fail("dashboard route did not load", `current URL ${currentUrl}`);
    }

    await withTimeout(
      page.waitForFunction(() => {
        const headings = Array.from(document.querySelectorAll("h1, h2"));
        return headings.some((el) => (el.textContent || "").toLowerCase().includes("good"))
          || document.body.innerText.includes("Total Patients");
      }),
      "wait dashboard content"
    );

    const usable = Date.now();

    log("collecting timings");
    await withTimeout(new Promise((resolve) => setTimeout(resolve, 1000)), "settle requests", 3000);

    const apiReq = requests.filter((r) => r.url.includes("/api/v1/"));
    const map = new Map();
    for (const r of apiReq) {
      const key = `${r.method} ${r.url}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const result = {
      baseUrl,
      startup: {
        firstPaintMs: paint.fp,
        firstContentfulPaintMs: paint.fcp,
        domContentLoadedMs: paint.dcl,
        loadEventMs: paint.load,
        timeToLoginRouteVisibleMs: Date.now() - navStart,
        timeToDashboardUsableMs: usable - loginClick,
      },
      requests: {
        total: requests.length,
        apiTotal: apiReq.length,
        duplicates: [...map.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count })),
        slowestApi: [...apiReq].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8),
      },
      finalUrl: currentUrl,
      success: true,
    };

    log("writing output");
    console.log(JSON.stringify(result, null, 2));
    log("success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("failed", { reason: message });
    console.error(`[profile] failure reason: ${message}`);
    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

await withTimeout(run(), "full profiling script", SCRIPT_TIMEOUT_MS);
