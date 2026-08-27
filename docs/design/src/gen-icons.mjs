import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ic } from './ui.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
/*
 * Output paths are relative to THIS file, which lives at `docs/design/src`.
 *
 * They used to read `resolve(HERE, '../Rafeeq-JO/...')` — a path that only resolves
 * when the script is COPIED next to a checkout, which is how it was originally run.
 * Run from its committed location, as `docs/design/README.md` instructs, it silently
 * created a phantom `docs/design/src/Rafeeq-JO/` tree and left the real mockups
 * untouched — so a regeneration looked like it had succeeded and changed nothing.
 */
const OUT = resolve(HERE, '../readme/icons');
mkdirSync(OUT, { recursive: true });

// Feature-grid glyphs. PNG (not SVG) so GitHub renders them with zero ambiguity.
const ICONS = ['school', 'cash', 'route', 'crosshair', 'shield', 'wallet',
  'id', 'star', 'chart', 'lock', 'globe', 'sparkle', 'msg', 'bell', 'car', 'file'];

/*
 * `CHROMIUM_PATH` — for an environment where the browser is already on disk.
 *
 * Playwright pins an exact browser revision and refuses to launch anything else, so
 * on a container that ships its own Chromium (or a CI image with the browsers baked
 * in at a different revision) `chromium.launch()` fails with "Executable doesn't
 * exist" and the only documented fix is a fresh download. Honouring an explicit path
 * makes the design pipeline runnable there. Unset, behaviour is unchanged.
 */
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

/*
 * Laid out in a 128px viewport and CLIPPED back to 48, not shot at 48 directly.
 *
 * Chromium will not screenshot a viewport smaller than about 50x50 — it does not
 * error, it HANGS, and `screenshot()` dies on Playwright's timeout after reporting
 * "fonts loaded", which reads like a font problem on a page that has no text. It
 * stalled on a different icon each run, so it looked like flakiness rather than a
 * floor. Measured on Chromium 1232: 48x48 times out, 96x96 captures in 12ms.
 *
 * The body is `margin:0` at exactly 48x48, so the icon's box starts at the origin and
 * the clip is a straight crop of the extra room away.
 */
for (const name of ICONS) {
  const ctx = await browser.newContext({ viewport: { width: 128, height: 128 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.setContent(`<html><body style="margin:0;width:48px;height:48px;display:grid;place-items:center;background:transparent">
    ${ic(name, { s: 40, c: '#1259E3', w: 1.9 })}</body></html>`);
  await page.screenshot({
    path: `${OUT}/${name}.png`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: 48, height: 48 },
  });
  await ctx.close();
}
await browser.close();
console.log('icons:', ICONS.join(' '));
