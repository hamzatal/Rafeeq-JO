import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mark, markOnDark, mapGhost } from './ui.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../Rafeeq-JO');

/**
 * Store and launcher assets, generated from the same mark as everything else so
 * they cannot drift from the identity.
 *
 * Sizes are what Expo and the stores actually require:
 *   icon                1024x1024, no transparency, no rounded corners (stores mask)
 *   adaptive-icon       1024x1024 foreground. Android crops this to a circle, a
 *                       squircle or a rounded rect depending on the launcher, so the
 *                       ink is held at 58% — inside the 66% safe zone with margin.
 *   splash              1284x2778 portrait, art centred in the middle third since
 *                       the OS crops the edges on every aspect ratio
 *   notification-icon   96x96 white-on-transparent; Android tints it and discards
 *                       colour entirely, so anything but a white silhouette breaks
 *   favicon             48x48
 */
const APPS = {
  student: { bg: '#1259E3', markColor: '#FFFFFF', label: 'student-app' },
  driver: { bg: '#0E1524', markColor: '#FFFFFF', label: 'driver-app' },
};

/**
 * Optically centred mark at a target ink ratio.
 *
 * The mark is diagonal, so its ink box is not its viewBox: ink spans 62.5x67 of a
 * 96 unit box, centred at (50.8, 47.5) rather than (48, 48). Sizing by the viewBox
 * therefore renders it both too small and pushed left of centre. `size` here is the
 * fraction of the CANVAS the ink should occupy, and the offset corrects the centre.
 */
const INK = 67 / 96;              // the larger ink dimension, as a fraction of the viewBox
const INK_DX = (48 - 50.8) / 96;  // horizontal correction, in viewBox fractions
const INK_DY = (48 - 47.5) / 96;

const centredMark = (canvas, inkRatio, opts) => {
  const box = Math.round((canvas * inkRatio) / INK);

  return `<div style="transform:translate(${(box * INK_DX).toFixed(2)}px, ${(box * INK_DY).toFixed(2)}px)">
    ${mark(box, opts)}</div>`;
};

const page = (w, h, body, bg = '#fff') => `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css">
<style>html,body{margin:0;padding:0}body{width:${w}px;height:${h}px;background:${bg};overflow:hidden}</style>
</head><body>${body}</body></html>`;

const shots = [];

for (const [app, cfg] of Object.entries(APPS)) {
  const dir = `${REPO}/frontend/${cfg.label}/assets`;
  mkdirSync(dir, { recursive: true });

  // ── icon: full bleed, the stores apply their own mask ──
  shots.push({
    out: `${dir}/icon.png`, w: 1024, h: 1024,
    html: page(1024, 1024,
      `<div style="width:1024px;height:1024px;background:${cfg.bg};display:grid;place-items:center">
        ${centredMark(1024, 0.60, { path: cfg.markColor, w: 7 })}</div>`, cfg.bg),
  });

  // ── adaptive foreground: art must live inside the middle 66% or Android crops it ──
  shots.push({
    out: `${dir}/adaptive-icon.png`, w: 1024, h: 1024,
    html: page(1024, 1024,
      `<div style="width:1024px;height:1024px;display:grid;place-items:center;background:transparent">
        ${centredMark(1024, 0.58, { path: cfg.markColor, w: 7 })}</div>`, 'transparent'),
  });

  // ── splash: centred in the middle third, edges get cropped on every device ──
  shots.push({
    out: `${dir}/splash.png`, w: 1284, h: 2778,
    html: page(1284, 2778, `
      <div style="position:relative;width:1284px;height:2778px;background:${app === 'driver' ? '#0E1524' : '#FFFFFF'};overflow:hidden">
        <div style="position:absolute;top:0;left:0;width:428px;height:926px;transform:scale(3);transform-origin:top left;opacity:.5">
        ${mapGhost({
      w: 428, h: 926,
      tint: app === 'driver' ? 'rgba(255,255,255,.045)' : 'rgba(18,89,227,.065)',
      road: app === 'driver' ? 'rgba(255,255,255,.062)' : 'rgba(18,89,227,.10)',
      routeC: app === 'driver' ? 'rgba(255,255,255,.20)' : 'rgba(18,89,227,.24)',
      seed: 13,
    })}
        </div>
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse 980px 1180px at 50% 47%,
          ${app === 'driver' ? 'rgba(14,21,36,.95)' : 'rgba(255,255,255,.97)'} 0%,
          ${app === 'driver' ? 'rgba(14,21,36,.95)' : 'rgba(255,255,255,.97)'} 34%,
          ${app === 'driver' ? 'rgba(14,21,36,.66)' : 'rgba(255,255,255,.72)'} 62%, transparent 88%)"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
          justify-content:center;z-index:5">
          ${centredMark(1284, 0.30, { path: app === 'driver' ? '#fff' : '#1259E3' })}
          <div style="font:700 172px/1 'IBM Plex Sans Arabic';color:${app === 'driver' ? '#fff' : '#0E1524'};margin-top:66px">رفيق</div>
          <div style="font:500 56px/1 'IBM Plex Sans Arabic';color:${app === 'driver' ? 'rgba(255,255,255,.72)' : '#1259E3'};margin-top:40px">مقعدك إلى الجامعة</div>
        </div>
      </div>`, app === 'driver' ? '#0E1524' : '#FFFFFF'),
  });

  // ── notification icon: Android tints it and throws colour away. White only. ──
  shots.push({
    out: `${dir}/notification-icon.png`, w: 96, h: 96,
    html: page(96, 96,
      `<div style="width:96px;height:96px;display:grid;place-items:center;background:transparent">
        ${centredMark(96, 0.72, { path: '#FFFFFF', dot: '#FFFFFF', w: 8.5 })}</div>`, 'transparent'),
  });

  shots.push({
    out: `${dir}/favicon.png`, w: 48, h: 48,
    html: page(48, 48,
      `<div style="width:48px;height:48px;background:${cfg.bg};display:grid;place-items:center">
        ${centredMark(48, 0.58, { path: cfg.markColor, w: 8.5 })}</div>`, cfg.bg),
  });
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const tmp = resolve(HERE, '_asset.html');
  writeFileSync(tmp, s.html);
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
  // Wait on the font itself rather than a timeout: `font-display:block` means the
  // glyphs are invisible until the file lands, and a screenshot taken too early
  // captures nothing where the Arabic should be.
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const transparent = s.html.includes("background:transparent");
  await p.screenshot({ path: s.out, omitBackground: transparent });
  console.log(`${s.out.replace(REPO + '/', '')}  ${s.w}x${s.h}${transparent ? '  (alpha)' : ''}`);
  await ctx.close();
}
rmSync(resolve(HERE, '_asset.html'), { force: true });
await browser.close();
