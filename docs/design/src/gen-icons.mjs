import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ic } from './ui.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../Rafeeq-JO/docs/design/readme/icons');
mkdirSync(OUT, { recursive: true });

// Feature-grid glyphs. PNG (not SVG) so GitHub renders them with zero ambiguity.
const ICONS = ['school', 'cash', 'route', 'crosshair', 'shield', 'wallet',
  'id', 'star', 'chart', 'lock', 'globe', 'sparkle', 'msg', 'bell', 'car', 'file'];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 48, height: 48 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
for (const name of ICONS) {
  await page.setContent(`<html><body style="margin:0;width:48px;height:48px;display:grid;place-items:center;background:transparent">
    ${ic(name, { s: 40, c: '#1259E3', w: 1.9 })}</body></html>`);
  await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
}
await browser.close();
console.log('icons:', ICONS.join(' '));
