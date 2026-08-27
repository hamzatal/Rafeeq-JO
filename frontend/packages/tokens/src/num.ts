/* ═══════════════════════════════════════════════════════════════════════════
   NUMBERS in an RTL paragraph.

   ── The problem, and why money alone was not enough ────────────────────────

   `money.ts` isolates currency amounts, and that fixed the worst of it. But money
   is a minority of the numbers on screen. A seat count, an ETA, a rider count, a
   distance, a boarding code, a percentage, a phone number and a date range are all
   Latin digit runs sitting inside Arabic text, and NONE of them were isolated —
   `unicodeBidi` and `writingDirection` appeared in exactly zero TypeScript files
   across all three clients.

   Two distinct failures follow from that:

   **Reordering.** A digit run is bidi-neutral at its edges. So "4 مقاعد · 6 كم"
   can render with the numbers swapped, and a range like "3–5" inverts to "5–3" —
   which is not theoretical: six marketing posters shipped a REVERSED tariff for
   exactly this reason, and the fix there was the same isolate this file provides.

   **Ragged columns.** Proportional digits make a list of amounts or counts
   impossible to scan, because the ones column does not line up. `tabular-nums`
   fixes it and was set nowhere in any app — only in kit.css, i.e. only in the
   mockups, so the design looked tidier than the product.

   ── Why the primitive is here and the component is per-app ─────────────────

   The isolate is a pure string operation, so it belongs in tokens with the
   `tabularNums` style token beside it. The COMPONENT differs by platform —
   React Native needs `fontVariant`, the DOM needs `font-variant-numeric` — so each
   app has a thin `<Num>` over these two exports. Phase 7 folds those into
   `packages/ui`, which is where a shared component belongs.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Left-to-right isolate: the run keeps its order and cannot reorder neighbours. */
const LRI = '\u2066';
/** Pop directional isolate. */
const PDI = '\u2069';

/**
 * Wrap a numeric run so the bidi algorithm cannot touch it.
 *
 * Deliberately duplicated from `money.ts`'s `isolateDigits` rather than imported:
 * `@rafeeq/tokens` must not depend on `@rafeeq/shared`, or the design layer starts
 * pulling in API types and i18n. Two three-line functions is a smaller cost than
 * that edge, and `check:design` asserts the two constants stay identical.
 */
export function isolate(value: string | number): string {
  return `${LRI}${value}${PDI}`;
}

/**
 * A range, isolated as ONE run. `range(3, 5)` → an unbreakable "3–5".
 *
 * Isolating the two numbers separately does not work — the dash between them is
 * still neutral, so the two isolated runs get laid out right-to-left and the range
 * inverts anyway. The whole expression has to be inside one isolate. This is the
 * exact bug that put "5–3 كم" on six posters.
 *
 * The separator is an EN DASH (U+2013), which is the correct typography for a
 * numeric range and, unlike a hyphen, is unambiguous next to a minus sign.
 */
export function range(from: string | number, to: string | number): string {
  return isolate(`${from}\u2013${to}`);
}

/** A percentage. `percent(15)` → "15%" as one isolated run. */
export function percent(value: number): string {
  return isolate(`${value}%`);
}

/**
 * A count with its unit. `count(4, 'مقاعد')` → "4 مقاعد", digits isolated.
 *
 * The unit stays OUTSIDE the isolate on purpose: in Arabic it belongs to the RTL
 * run and reads to the left of the number. Wrapping both put the unit on the wrong
 * side — the same mistake `money.ts` documents for the currency symbol.
 */
export function count(value: number, unit?: string): string {
  return unit ? `${isolate(value)} ${unit}` : isolate(value);
}

/**
 * Tabular figures, as a style token.
 *
 * React Native takes `fontVariant` as an array; the DOM takes
 * `font-variant-numeric` as a string. Both are exported so neither platform has to
 * remember which.
 */
export const tabularNums: {
  /** React Native `<Text style={...}>`. Mutable array — RN's `TextStyle` rejects
   *  a readonly tuple, so this object is deliberately not `as const`. */
  rn: { fontVariant: ['tabular-nums'] };
  /** DOM inline style */
  web: { fontVariantNumeric: 'tabular-nums' };
  /** Tailwind class name, for `className` */
  className: string;
} = {
  rn: { fontVariant: ['tabular-nums'] },
  web: { fontVariantNumeric: 'tabular-nums' },
  className: 'tabular-nums',
};
