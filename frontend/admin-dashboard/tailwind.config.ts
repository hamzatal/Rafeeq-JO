/* ╔═══════════════════════════════════════════════════════════════════════════╗
   ║  GENERATED FILE — DO NOT EDIT.                                            ║
   ║                                                                           ║
   ║  Source:    frontend/packages/tokens/src/*.ts                             ║
   ║  Regenerate: cd frontend && npm run build:tokens                          ║
   ║                                                                           ║
   ║  CI runs `npm run check:tokens`, which regenerates and diffs. A hand edit  ║
   ║  here fails the build — because four hand-written copies of these values   ║
   ║  is exactly how the card radius came to differ by 4px between the design   ║
   ║  source, the apps and the dashboard.                                      ║
   ╚═══════════════════════════════════════════════════════════════════════════╝ */
import type { Config } from 'tailwindcss';
import { tailwindPreset } from '@rafeeq/tokens';

/*
 * Everything visual comes from the preset. This file exists only to tell
 * Tailwind which files to scan.
 *
 * It used to hand-copy the whole ramp, which is how it ended up with a 12px card
 * radius against kit.css's 16 and a 44px control height against 46 — the same
 * component, three shapes, across the design source, the apps and the web.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: tailwindPreset.theme,
};

export default config;
