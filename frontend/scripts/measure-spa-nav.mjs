import puppeteer from "puppeteer-core";

const baseUrl = process.argv[2] || "http://127.0.0.1:5174";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const reqs = [];
const starts = new Map();

page.on("request", (r) => starts.set(r, Date.now()));
page.on("requestfinished", (r) => {
  const s = starts.get(r) || Date.now();
  starts.delete(r);
  const u = r.url();
  if (u.includes("/api/v1/")) {
    reqs.push({
      url: u,
      method: r.method(),
      status: r.response()?.status() || 0,
      durationMs: Date.now() - s,
      ts: s,
    });
  }
});

page.on("requestfailed", (r) => {
  const s = starts.get(r) || Date.now();
  starts.delete(r);
  const u = r.url();
  if (u.includes("/api/v1/")) {
    reqs.push({ url: u, method: r.method(), status: 0, durationMs: Date.now() - s, ts: s, failed: true });
  }
});

await page.goto(`${baseUrl}/login?perf=1`, { waitUntil: "domcontentloaded" });
await page.type("#email", "admin@medica.com");
await page.type("#password", "admin123");
await page.click('button[type="submit"]');
await page.waitForFunction(() => location.pathname.includes("/dashboard"), { timeout: 30000 });
await page.waitForSelector('a[href="/patients"]');
await new Promise((r) => setTimeout(r, 1200));

const flows = [
  { name: "dashboard", click: null, expect: "/dashboard", data: "/api/v1/dashboard/" },
  { name: "patients", click: 'a[href="/patients"]', expect: "/patients", data: "/api/v1/patients/" },
  { name: "appointments", click: 'a[href="/appointments"]', expect: "/appointments", data: "/api/v1/appointments/" },
  { name: "administration", click: 'a[href="/administration"]', expect: "/administration", data: "/api/v1/users/" },
  { name: "patients-back", click: 'a[href="/patients"]', expect: "/patients", data: "/api/v1/patients/" },
  { name: "dashboard-back", click: 'a[href="/dashboard"]', expect: "/dashboard", data: "/api/v1/dashboard/" },
];

const results = [];

for (const f of flows) {
  const t0 = Date.now();
  if (f.click) {
    await page.click(f.click);
    await page.waitForFunction((p) => location.pathname === p, { timeout: 30000 }, f.expect);
  }
  await new Promise((r) => setTimeout(r, 1600));

  const seg = reqs.filter((x) => x.ts >= t0);
  const dataReq = [...seg].filter((x) => x.url.includes(f.data)).sort((a, b) => b.ts - a.ts)[0] || null;
  const authMe = seg.filter((x) => x.url.includes("/api/v1/auth/me")).length;
  const notif = seg.filter((x) => x.url.includes("/api/v1/notifications/")).length;

  results.push({
    page: f.name,
    dataTiming: dataReq
      ? `${dataReq.method} ${new URL(dataReq.url).pathname} ${dataReq.status} ${dataReq.durationMs}ms`
      : "none",
    authMeOnNav: authMe,
    notificationsOnNav: notif,
    allApi: [...new Set(seg.map((x) => `${x.method} ${new URL(x.url).pathname}`))],
  });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
