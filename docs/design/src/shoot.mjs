import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const OUT = resolve('/projects/sandbox/Rafeeq-JO/docs/design/identity');
mkdirSync(OUT, { recursive: true });

// name -> viewport
const TARGETS = {
  'phone': { width: 390, height: 844, dsf: 2 },
  'wide':  { width: 1440, height: 900, dsf: 2 },
};

const PAGES = [
  ['01-foundations',     'wide'],
  ['02-components',      'wide'],
  ['03-student-home',    'phone'],
  ['04-student-ride',    'phone'],
  ['05-student-wallet',  'phone'],
  ['06-driver-cockpit',  'phone'],
  ['07-driver-offer',    'phone'],
  ['08-admin',           'wide'],
  ['09-before-after',    'wide'],
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
for (const [name, target] of PAGES) {
  const { width, height, dsf } = TARGETS[target];
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto('file:///projects/sandbox/.shots/' + name + '.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200); // let webfont settle
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('shot', name, `${width}x${height}@${dsf}x`);
  await ctx.close();
}
await browser.close();
console.log('\nfiles:', readdirSync(OUT).join(' '));
