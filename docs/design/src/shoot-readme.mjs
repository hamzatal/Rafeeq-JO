import { chromium } from 'playwright';
import { readdirSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
const OUT  = resolve(HERE, '../readme');
mkdirSync(OUT, { recursive: true });

const only = process.argv[2];
const PAGES = readdirSync(HERE)
  .filter(f => /^r-.*\.html$/.test(f))
  .map(f => f.replace('.html', ''))
  .filter(n => !only || n.includes(only))
  .sort();

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
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--font-render-hinting=none'] });
for (const name of PAGES) {
  const html = readFileSync(resolve(HERE, name + '.html'), 'utf8');
  const m = html.match(/body\{[^}]*width:(\d+)px/);
  const width = m ? parseInt(m[1]) : 1400;
  const ctx = await browser.newContext({ viewport: { width, height: 600 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + resolve(HERE, name + '.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /*
   * MEASURE the content, resize to it, then capture WITHOUT `fullPage`.
   *
   * This used to open an 80px-tall viewport and rely on `fullPage`, so that a page
   * whose wrapper is shorter than the viewport did not get padded out to viewport
   * height. It stopped working: on Chromium 1232 a `fullPage` capture from a viewport
   * that short HANGS — it reports "fonts loaded" and then never returns, so the
   * failure surfaced as a 30-second timeout that read like a font problem. Verified:
   * identical page, viewport 1000 and 400 both capture in ~190ms, 80 times out.
   *
   * Measuring the union of the body's children gives the same answer `fullPage` was
   * being asked for, and more directly — it is the content box, so it cannot include
   * viewport padding no matter what the viewport is.
   */
  const height = await page.evaluate(() => Math.ceil(
    [...document.body.children].reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom), 0),
  ));
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name.slice(2)}.png`, timeout: 180_000 });
  const b = readFileSync(`${OUT}/${name.slice(2)}.png`);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const over = (w > 8000 || h > 8000) ? '  <-- OVER 8000px LIMIT' : '';
  console.log(`${name.slice(2).padEnd(14)} ${w}x${h}  ${(b.length / 1024 / 1024).toFixed(2)}MB${over}`);
  if (over) process.exitCode = 1;
  await ctx.close();
}
await browser.close();
