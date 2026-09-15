#!/usr/bin/env node
// Deterministic gate for orbit-lab.html: renders headless, zero console/page errors,
// canvas drew, required ids exist, and the Hohmann numbers match known physics.
import { chromium } from "/Users/mhlaghari/Documents/Documents/MyProjects/film-crew/tools/node_modules/playwright-core/index.mjs";
import { pathToFileURL } from "url";
import { existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

function findChromium() {
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (!existsSync(cache)) return null;
  const dirs = readdirSync(cache).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
  for (const d of dirs) {
    const bin = join(cache, d, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
    if (existsSync(bin)) return bin;
  }
  return null;
}

const file = resolve(process.argv[2] || "orbit-lab.html");
const shot = process.argv[3] || null;
const fails = [];
if (!existsSync(file)) { console.log(JSON.stringify({ pass: false, fails: ["file missing: " + file] })); process.exit(1); }
const exe = findChromium();
if (!exe) { console.log(JSON.stringify({ pass: false, fails: ["no cached chromium"] })); process.exit(2); }

const browser = await chromium.launch({ headless: true, executablePath: exe });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e)));
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  for (const e of errors) fails.push(e);
  const seenErrors = errors.length;

  const ids = ["canvas", "hud", "info", "planner", "origin", "dest", "plan", "result", "date", "warp"];
  const missing = await page.evaluate((ids) => ids.filter((i) => !document.getElementById(i)), ids);
  if (missing.length) fails.push("missing ids: " + missing.join(","));

  const drew = await page.evaluate(() => {
    const c = document.getElementById("canvas"); if (!c) return false;
    const ctx = c.getContext("2d"); const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0; for (let i = 0; i < d.length; i += 4 * 13) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
    return lit > 30;
  });
  if (!drew) fails.push("canvas blank");

  const api = await page.evaluate(() => {
    const o = window.OrbitLab; if (!o) return { err: "window.OrbitLab missing" };
    try {
      const h = o.hohmann("earth", "mars");
      const p = o.positionAt ? o.positionAt("earth", 0) : null;
      return { h, planets: (o.planets || []).length, state: o.state, p };
    } catch (e) { return { err: String(e) }; }
  });
  if (api.err) fails.push(api.err);
  else {
    if (api.planets !== 8) fails.push("planets length " + api.planets + " != 8");
    const h = api.h || {};
    const near = (v, want, tol, name) => { if (typeof v !== "number" || Math.abs(v - want) > tol) fails.push(`${name}=${v} (want ${want}±${tol})`); };
    near(h.dv_total_kms, 5.6, 0.25, "dv_total_kms");
    near(h.transfer_days, 259, 8, "transfer_days");
    near(h.phase_angle_deg, 44, 4, "phase_angle_deg");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(h.window_date))) fails.push("window_date not YYYY-MM-DD: " + JSON.stringify(h.window_date));
    if (typeof h.window_in_days !== "number") fails.push("window_in_days not a number");
    if (!api.state || typeof api.state.simDays !== "number") fails.push("state.simDays missing");
    if (api.p && typeof api.p.x === "number") { const r = Math.hypot(api.p.x, api.p.y); if (Math.abs(r - 1) > 0.03) fails.push("earth r at t=0 = " + r.toFixed(3) + " AU"); }
  }

  // Interaction: plan button fills #result; Space toggles pause.
  await page.click("#plan"); await page.waitForTimeout(300);
  const resultText = await page.$eval("#result", (e) => e.textContent.trim());
  if (resultText.length < 20) fails.push("#result empty after Plan");
  // Transfer arc must actually be painted: accent-colored pixels in the Earth–Mars annulus.
  const arcPixels = await page.evaluate(() => {
    const c = document.getElementById("canvas"); const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1; const W = c.width, H = c.height;
    const s = Math.min(W / dpr, H / dpr) / 900; const R = (d) => (50 + 100 * Math.log(1 + d)) * s * dpr;
    const rIn = R(1.0) + 2, rOut = R(1.524) - 2; const cx = W / 2, cy = H / 2;
    const img = ctx.getImageData(0, 0, W, H).data; let hits = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const r = Math.hypot(x - cx, y - cy); if (r < rIn || r > rOut) continue;
      const i = (y * W + x) * 4; const [pr, pg, pb] = [img[i], img[i + 1], img[i + 2]];
      if (Math.abs(pr - 126) < 40 && Math.abs(pg - 200) < 40 && pb > 200) hits++;
    }
    return hits;
  });
  if (arcPixels < 15) fails.push("transfer arc not painted (accent pixels in annulus: " + arcPixels + ")");
  const before = await page.evaluate(() => window.OrbitLab && window.OrbitLab.state.paused);
  await page.keyboard.press("Space"); await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.OrbitLab && window.OrbitLab.state.paused);
  if (before === after) fails.push("Space did not toggle pause");
  for (const e of errors.slice(seenErrors)) fails.push(e);

  if (shot) await page.screenshot({ path: shot });
  console.log(JSON.stringify({ pass: fails.length === 0, fails, hohmann: api.h || null }, null, 1));
  process.exit(fails.length === 0 ? 0 : 1);
} finally { await browser.close(); }
