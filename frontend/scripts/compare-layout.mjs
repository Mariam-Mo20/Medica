import puppeteer from "puppeteer-core";

const targets = [
  { name: "dev", url: process.argv[2] || "http://127.0.0.1:5173" },
  { name: "preview", url: process.argv[3] || "http://127.0.0.1:4173" },
  { name: "deployed", url: process.argv[4] || "https://frontend-neon-eta-yhbfdcoe8c.vercel.app" },
];

const email = process.argv[5] || "admin@medica.com";
const password = process.argv[6] || "admin123";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

async function profileTarget(target) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(20000);
  page.setDefaultTimeout(20000);

  await page.goto(`${target.url}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#email");
  await page.type("#email", email, { delay: 10 });
  await page.type("#password", password, { delay: 10 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
  ]);

  await page.goto(`${target.url}/dashboard`, { waitUntil: "networkidle2" });
  await page.waitForSelector("h1");

  const metrics = await page.evaluate(() => {
    const grid = document.querySelector(".grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-4");
    const cards = grid ? Array.from(grid.querySelectorAll(":scope > *")) : [];
    const tops = cards.map((c) => Math.round(c.getBoundingClientRect().top));
    const uniqueRows = Array.from(new Set(tops));
    const firstRowTop = uniqueRows[0];
    const firstRowCards = cards.filter((c) => Math.round(c.getBoundingClientRect().top) === firstRowTop);
    const firstRowCardWidths = firstRowCards.map((c) => Math.round(c.getBoundingClientRect().width));

    const cssLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.getAttribute("href"));

    return {
      viewport: {
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        devicePixelRatio: window.devicePixelRatio,
      },
      computed: {
        htmlFontSize: getComputedStyle(document.documentElement).fontSize,
        bodyFontSize: getComputedStyle(document.body).fontSize,
        bodyZoom: getComputedStyle(document.body).zoom || "normal",
        bodyTransform: getComputedStyle(document.body).transform,
      },
      dashboardGrid: {
        cardCount: cards.length,
        rowCount: uniqueRows.length,
        firstRowCards: firstRowCards.length,
        firstRowCardWidths,
      },
      cssLinks,
      fontsReady: document.fonts.status,
      interLoaded: document.fonts.check('16px "Inter"'),
      manropeLoaded: document.fonts.check('700 24px "Manrope"'),
    };
  });

  await page.screenshot({ path: `C:/Users/VIPCOM~1/AppData/Local/Temp/opencode/${target.name}-dashboard.png`, fullPage: true });
  await page.close();
  return { name: target.name, ...metrics };
}

const results = [];
for (const t of targets) {
  try {
    const r = await profileTarget(t);
    results.push(r);
  } catch (err) {
    results.push({ name: t.name, error: err instanceof Error ? err.message : String(err) });
  }
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
