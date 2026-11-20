import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.TEST_URL || "http://127.0.0.1:8000/okome-drawit.html";
const outputs = "artifacts";
await mkdir(outputs, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

async function checkViewport(name, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: "reduce",
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("response", response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });

  try {
    const response = await page.goto(BASE, { waitUntil: "networkidle" });
    if (!response || !response.ok()) throw new Error("HTML did not load");
    await page.locator("#chart polyline").first().waitFor();
    if (!(await page.locator("#reveal").isDisabled())) throw new Error("Reveal should start disabled");
    if (await page.locator("#result").isVisible()) throw new Error("Result should start hidden");

    await page.screenshot({ path: `${outputs}/${name}-initial.png`, fullPage: true });

    // SVG logical coordinates: viewBox 0 0 400 300, drawing from 2016 to 2026.
    const rect = await page.locator("#chart").boundingBox();
    if (!rect) throw new Error("Chart is not visible");
    const pos = (x, y) => ({
      x: rect.x + rect.width * x / 400,
      y: rect.y + rect.height * y / 300
    });
    const yearX = year => 40 + (400 - 40 - 14) * (year - 1975) / (2026 - 1975);
    const p = pos(yearX(2016), 160);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    for (let year = 2017; year <= 2026; year++) {
      const q = pos(yearX(year), 160 - (year - 2016) * 3);
      await page.mouse.move(q.x, q.y, { steps: 3 });
    }
    await page.mouse.up();

    if (!(await page.locator("#reveal").isEnabled())) throw new Error("Drawing did not enable reveal");
    await page.locator("#reveal").click();
    if (!(await page.locator("#result").isVisible())) throw new Error("Result did not appear");
    if (!(await page.locator("#reveal").isDisabled())) throw new Error("Reveal did not disable");
    if (!(await page.locator("#scoreNum").innerText()).match(/\\d/)) throw new Error("Score missing");
    await page.screenshot({ path: `${outputs}/${name}-result.png`, fullPage: true });

    await page.locator("#reset").click();
    if (await page.locator("#result").isVisible()) throw new Error("Reset did not hide result");
    if (!(await page.locator("#reveal").isDisabled())) throw new Error("Reset did not clear prediction");

    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth
    }));
    if (metrics.width > metrics.viewport + 2) throw new Error(`Horizontal overflow: ${JSON.stringify(metrics)}`);
    if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);

    process.stdout.write(`PASS ${name}: load, draw, reveal, reset, layout, no runtime errors\\n`);
  } catch (e) {
    failures.push(`${name}: ${e?.stack || e}`);
  } finally {
    await context.close();
  }
}

try {
  await checkViewport("mobile-390", 390, 844);
  await checkViewport("desktop-1280", 1280, 900);
} finally {
  await browser.close();
}

if (failures.length) {
  for (const failure of failures) console.error("FAIL " + failure);
  process.exitCode = 1;
}
