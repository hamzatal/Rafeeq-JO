import { brand, live, neutral } from './color';

/* ═══════════════════════════════════════════════════════════════════════════
   THE MARK — «الطريق هو الحرف»

   ── Why this had to become code ────────────────────────────────────────────

   The approved identity (`docs/design/v2/00-logo.png`) specifies a VECTOR mark on a
   96×96 grid at a single stroke weight of 7: an open ring for the origin, a curve for
   the route, a solid amber dot for the destination. Together they read as «ر».

   What the product actually rendered was `r-logo.png` — a raster Latin "R" in
   cyan/teal with an orange triangle, i.e. the RETIRED identity, byte-identical in two
   places (`packages/ui/assets/` and `admin-dashboard/public/`). A third identity, a
   black-green-and-gold "Petra" badge, sat unused in `packages/shared/assets/`.

   Three identities, and the one on every screen was the retired one.

   ── Why no gate caught it ─────────────────────────────────────────────────

   `check:design`'s `retired-identity` gate is a HARD ZERO and passed on every CI run,
   because it greps SOURCE TEXT for retired hex values. A PNG's pixels are not text.
   So the gate truthfully reported zero while the retired palette was the logo in the
   sidebar and on both apps' welcome screens.

   The fix is not a better PNG. It is that the mark is now GEOMETRY, in the one package
   both the Expo apps and the Next dashboard already depend on, rendered by each with
   its own primitives. There is no raster to go stale, and `check:identity` compares
   this geometry against `docs/design/src/ui.mjs` so the drawing and the design sheet
   cannot drift apart again.

   ── Why geometry and not an SVG component ─────────────────────────────────

   `admin-dashboard` must never import `@rafeeq/ui` or `react-native` — that is the
   `layer-violation` gate, and it is what keeps the dashboard from pulling a React
   Native tree into a webpack bundle. So this package cannot export a component. It
   exports the numbers, and the two renderers stay one file each.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * The mark, as measured on the 96×96 grid of the approved sheet.
 *
 * Every number here is load-bearing and none of them is a taste call:
 *   · `strokeWidth` is ONE weight for the whole mark — the sheet forbids a second
 *     («وزن حدّ واحد 7»), because two weights stop reading as one letter at 18px.
 *   · the ring is OPEN, which is what makes it an origin rather than a full stop.
 *   · the dot is FILLED, which is what makes it an arrival.
 */
export const BRAND_MARK = {
  /** The design grid. Both renderers use it as the SVG viewBox. */
  viewBox: 96,
  strokeWidth: 7,
  /** الحلقة المفتوحة — نقطة الانطلاق. */
  origin: { cx: 70, cy: 26, r: 8.5 },
  /** المنحنى — المسار، وهو جسم الـ«ر». */
  route: 'M70 43.5 C70 58 60 68 45 72',
  /** النقطة المصمتة — الوجهة (وصلت). */
  destination: { cx: 27, cy: 73.5, r: 7.5 },
} as const;

/**
 * The mark's two colours.
 *
 * The dot is `live.base`, not a hex: amber in this system means exactly "a destination
 * and a live state" (decision 13), and the destination dot IS that meaning. Reaching
 * for the literal would also have pushed the `raw-hex` budget over.
 */
export const brandMarkColors = {
  /** On light surfaces. */
  path: brand[600],
  dot: live.base,
  /**
   * On a dark surface the ring and route go white — and ONLY they do. The
   * destination dot stays amber, which is what the sheet means by «الوجهة بلون
   * الحيّ — الاستخدام الوحيد المسموح لتلوين جزء من العلامة». A white dot would make
   * the mark one flat colour and lose the arrival.
   *
   * `neutral[0]`, not a literal: two `'#FFFFFF'`s in the renderers pushed `raw-hex`
   * from 24 to 26 and failed the gate, which was right to complain — a colour in two
   * files is a colour that can differ in two files.
   */
  onDark: neutral[0],
} as const;

/**
 * Ink box of the mark inside its viewBox.
 *
 * The mark is diagonal, so its ink does not fill the grid and is not centred in it:
 * sizing a canvas by the viewBox renders the mark both too small and pushed off
 * centre. The store-asset generator corrects with these, and they belong here beside
 * the geometry they describe rather than in the generator that happens to need them.
 */
export const BRAND_MARK_INK = {
  /** Larger ink dimension, as a fraction of the viewBox. */
  ratio: 67 / 96,
  /** Optical centre correction, in viewBox fractions. */
  dx: (48 - 50.8) / 96,
  dy: (48 - 47.5) / 96,
} as const;

export interface BrandMarkOptions {
  /** Stroke colour for the ring and the route. */
  path?: string;
  /** Fill for the destination dot. */
  dot?: string;
}

/**
 * The mark as an SVG string — for generating store assets and favicons.
 *
 * Components render from `BRAND_MARK` directly; this exists so a build script can
 * write a file without a React runtime.
 */
export function brandMarkSvg(size: number, options: BrandMarkOptions = {}): string {
  const path = options.path ?? brandMarkColors.path;
  const dot = options.dot ?? brandMarkColors.dot;
  const { viewBox, strokeWidth, origin, route, destination } = BRAND_MARK;

  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}" fill="none" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="رفيق">` +
    `<circle cx="${origin.cx}" cy="${origin.cy}" r="${origin.r}" stroke="${path}" stroke-width="${strokeWidth}"/>` +
    `<path d="${route}" stroke="${path}" stroke-width="${strokeWidth}" stroke-linecap="round"/>` +
    `<circle cx="${destination.cx}" cy="${destination.cy}" r="${destination.r}" fill="${dot}"/>` +
    `</svg>`
  );
}
