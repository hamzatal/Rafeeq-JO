/**
 * The one place money becomes text.
 *
 * Two defects made this necessary, both found in production code:
 *
 * 1. A dinar is 1000 fils, so amounts need THREE decimals. Twelve call sites used
 *    `toFixed(2)`, which does not drop a trailing zero — it rounds, and shows a
 *    different amount than the one stored. 1999 fils rendered as "2.00" and 1005
 *    fils as "1.00". The two worst were the pages where an operator *sets* prices,
 *    so they read a number that was not the stored one and priced against it.
 *
 * 2. There was no bidi isolation for numerals anywhere in any of the three clients
 *    — zero occurrences of `unicodeBidi` or `writingDirection`. A Latin-digit run
 *    inside an Arabic paragraph gets reordered by the bidi algorithm, so a negative
 *    amount can render as "1.050-" and a range as "40 / 34".
 *
 * The fix for (2) is Unicode isolates rather than CSS, because these strings are
 * consumed by both React Native `<Text>` and the DOM, and only the character-level
 * controls work in both. U+2066 LRI opens a left-to-right isolate and U+2069 PDI
 * closes it, so the digits keep their internal order and cannot drag the
 * surrounding Arabic around.
 *
 * Word order matters too: in Arabic the currency sits to the LEFT of the number.
 * That happens naturally when only the digits are isolated and the whole string is
 * left in the RTL paragraph — which is why the currency is deliberately outside the
 * isolate. Wrapping the whole thing put the number first, which is backwards.
 */

/** Left-to-right isolate: digits keep their order and do not reorder their neighbours. */
const LRI = '\u2066';
/** Pop directional isolate. */
const PDI = '\u2069';

export const FILS_PER_DINAR = 1000;

/** The Jordanian dinar symbol. Never write this literal anywhere else. */
export const DINAR = 'د.أ';

/** Dinars have three decimal places, because 1 dinar = 1000 fils. Not two. */
export const DINAR_DECIMALS = 3;

/** Wrap a numeric run so the bidi algorithm cannot reorder it or its neighbours. */
export function isolateDigits(text: string): string {
  return `${LRI}${text}${PDI}`;
}

/**
 * Fils to a bare, bidi-safe decimal string. No currency.
 * 1999 → "1.999" · 1005 → "1.005" · -1050 → "-1.050"
 */
export function dinarsFromFils(fils: number): string {
  const safe = Number.isFinite(fils) ? fils : 0;
  return isolateDigits((safe / FILS_PER_DINAR).toFixed(DINAR_DECIMALS));
}

/* ═══════════════════════════════════════════════════════════════════════════
   THE THREE. There is nothing else, and nothing deprecated.

   ── Why seven functions became three ───────────────────────────────────────

   This module exported `formatFils`, `formatDinars`, `formatFilsSigned`,
   `formatDinarsSigned`, `dinarsFromFils`, `dinarsOf` and `DINAR` — seven ways to
   render money, split down the middle by INPUT UNIT: half took integer fils, half
   took the decimal `*_jod` mirror the API also returns.

   Every one of them was individually correct. The set was the problem: at each
   call site a developer had to pick both a formatter and a unit, and the wrong
   pairing is silent. `formatFils(w.balance_jod)` renders 4.500 dinars as
   "0.004 د.أ" and nothing complains. That is not a hypothetical — the wallet-type
   bug fixed in the previous phase was exactly this shape, a screen reading the
   field that was available rather than the field that was correct.

   So there is now ONE input unit: integer fils, which is what the ledger stores,
   what every backend column holds, and the only representation that cannot lose a
   third decimal place. The `*_jod` fields on API responses are a display
   convenience the client no longer reads.

   The four decimal-dinar functions were briefly kept as `@deprecated` aliases so the
   rename could land separately from the call sites. They are GONE: all 27 call sites
   moved in the same change, and a deprecated alias that still compiles is just the
   old API with a comment on it — the next new screen picks whichever name it finds
   first, and the unit confusion comes back. `check:money` enforces the absence.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Fils to a full amount. 1999 → "1.999 د.أ". THE function for showing money. */
export function formatJod(fils: number): string {
  return `${dinarsFromFils(fils)} ${DINAR}`;
}

/** Fils to bare bidi-safe digits, no currency — for when the unit is in a label. */
export function bareJod(fils: number): string {
  return dinarsFromFils(fils);
}

/**
 * A ledger movement, with an explicit sign.
 * +10000 → "+10.000 د.أ" · -1050 → "−1.050 د.أ"
 *
 * The minus is U+2212 MINUS SIGN, not the hyphen-minus. A hyphen at the edge of an
 * isolate is a bidi-neutral character and can end up on the wrong side of the
 * number; the real minus sign is unambiguous and reads better at small sizes.
 */
export function formatJodSigned(fils: number): string {
  const safe = Number.isFinite(fils) ? fils : 0;
  const sign = safe < 0 ? '\u2212' : '+';
  const digits = (Math.abs(safe) / FILS_PER_DINAR).toFixed(DINAR_DECIMALS);
  return `${isolateDigits(sign + digits)} ${DINAR}`;
}

/**
 * Parse operator input into fils. Accepts Arabic-Indic digits, Arabic and Western
 * decimal separators, and thousands separators, so a form does not reject "١.٥٠٠".
 *
 * Returns null on anything unparseable rather than 0, because silently treating bad
 * input as zero is how a price becomes free.
 */
export function parseDinarsToFils(input: string): number | null {
  if (input == null) return null;

  const western = input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Extended Arabic-Indic
    .replace(/[\u066B\u060C,]/g, '') // Arabic decimal/thousands separators and comma
    .replace(/[\u066C\u2066\u2069\s]/g, '')
    .trim();

  if (western === '' || !/^-?\d*\.?\d*$/.test(western) || western === '.' || western === '-') {
    return null;
  }

  const dinars = Number(western);
  if (!Number.isFinite(dinars)) return null;

  // Round rather than truncate: 1.9994 dinars is 1999 fils, not 1999.4.
  return Math.round(dinars * FILS_PER_DINAR);
}
