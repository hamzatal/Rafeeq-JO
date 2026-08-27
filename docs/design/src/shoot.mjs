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
const OUT  = resolve(HERE, '../v2');
mkdirSync(OUT, { recursive: true });

// Sheets are wide posters holding many 390x844 phone frames; width is set per file.
const only = process.argv[2];
const PAGES = readdirSync(HERE)
  .filter(f => /^\d\d.*\.html$/.test(f))
  .map(f => f.replace('.html',''))
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
  const width = m ? parseInt(m[1]) : 1500;
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + resolve(HERE, name + '.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  /*
   * An explicit timeout. These sheets are up to 3120x6500 at deviceScaleFactor 2,
   * i.e. ~80 megapixels, and a `fullPage` capture of one can exceed Playwright's
   * 30-second default — which fails AFTER "fonts loaded", so the error reads like a
   * font problem rather than a slow encode.
   */
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, timeout: 180_000 });
  const b = readFileSync(`${OUT}/${name}.png`);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const over = (w > 8000 || h > 8000) ? '  <-- OVER 8000px LIMIT, SPLIT THIS SHEET' : '';
  console.log(`${name.padEnd(26)} ${w}x${h}  ${(b.length/1024/1024).toFixed(2)}MB${over}`);
  if (over) process.exitCode = 1;
  await ctx.close();
}
await browser.close();
