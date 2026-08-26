import { chromium } from 'playwright';
import { readdirSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT  = resolve(HERE, '../Rafeeq-JO/docs/design/readme');
mkdirSync(OUT, { recursive: true });

const only = process.argv[2];
const PAGES = readdirSync(HERE)
  .filter(f => /^r-.*\.html$/.test(f))
  .map(f => f.replace('.html', ''))
  .filter(n => !only || n.includes(only))
  .sort();

const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
for (const name of PAGES) {
  const html = readFileSync(resolve(HERE, name + '.html'), 'utf8');
  const m = html.match(/body\{[^}]*width:(\d+)px/);
  const width = m ? parseInt(m[1]) : 1400;
  // Keep the viewport short so fullPage captures the real content height, not viewport padding.
  const ctx = await browser.newContext({ viewport: { width, height: 80 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('file://' + resolve(HERE, name + '.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name.slice(2)}.png`, fullPage: true });
  const b = readFileSync(`${OUT}/${name.slice(2)}.png`);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const over = (w > 8000 || h > 8000) ? '  <-- OVER 8000px LIMIT' : '';
  console.log(`${name.slice(2).padEnd(14)} ${w}x${h}  ${(b.length / 1024 / 1024).toFixed(2)}MB${over}`);
  if (over) process.exitCode = 1;
  await ctx.close();
}
await browser.close();
