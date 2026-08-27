import { describe, expect, it } from 'vitest';
import {
  bareJod,
  DINAR,
  dinarsFromFils,
  formatJod,
  formatJodSigned,
  isolateDigits,
  parseDinarsToFils,
} from './money';

/** Strip the bidi isolates so assertions read as the human-visible text. */
const bare = (s: string) => s.replace(/[\u2066\u2069]/g, '');

describe('three decimals, because a dinar is 1000 fils', () => {
  // These are the exact values that rendered wrongly in production. `toFixed(2)`
  // does not drop a trailing zero here, it ROUNDS, and shows a different amount
  // than the one stored — on the pages where an operator sets prices.
  it.each([
    [1250, '1.250'],
    [1255, '1.255'], // toFixed(2) showed 1.25 — off by 5 fils
    [1999, '1.999'], // toFixed(2) showed 2.00 — a dinar that does not exist
    [1005, '1.005'], // toFixed(2) showed 1.00 — off by 5 fils
    [2996, '2.996'], // toFixed(2) showed 3.00
    [1000, '1.000'],
    [1, '0.001'], // one fils must be visible at all
    [0, '0.000'],
  ])('%i fils renders as %s', (fils, expected) => {
    expect(bare(dinarsFromFils(fils))).toBe(expected);
  });

  it('never rounds a stored amount away', () => {
    for (let fils = 990; fils <= 1010; fils++) {
      const shown = bare(dinarsFromFils(fils));
      expect(Math.round(Number(shown) * 1000)).toBe(fils);
    }
  });
});

describe('bidi isolation', () => {
  it('wraps digits in an isolate so they cannot reorder', () => {
    expect(dinarsFromFils(1050)).toBe('\u20661.050\u2069');
  });

  it('keeps the sign attached to the number', () => {
    // Without isolation a leading hyphen is bidi-neutral and can end up trailing:
    // "1.050-" instead of "-1.050".
    expect(bare(formatJodSigned(-1050))).toBe(`\u22121.050 ${DINAR}`);
    expect(bare(formatJodSigned(10000))).toBe(`+10.000 ${DINAR}`);
  });

  it('uses a real minus sign rather than a hyphen', () => {
    expect(formatJodSigned(-1)).toContain('\u2212');
    expect(formatJodSigned(-1)).not.toContain('-');
  });

  it('puts the currency after the isolate so RTL places it left of the number', () => {
    // The currency must sit OUTSIDE the isolate. Inside it, the whole run becomes
    // LTR and the number precedes the currency, which is backwards in Arabic.
    const out = formatJod(1500);
    expect(out.indexOf('\u2069')).toBeLessThan(out.indexOf(DINAR));
  });
});

describe('formatting entry points', () => {
  it('formats fils', () => {
    expect(bare(formatJod(1999))).toBe(`1.999 ${DINAR}`);
  });

  /*
   * The decimal-dinar entry points are GONE, not deprecated.
   *
   * `formatDinars(1.999)` and `formatJod(1999)` printed the same string from
   * arguments a thousand times apart, and nothing could tell a mistake from an
   * intent. This asserts the surface is the three fils functions and nothing else,
   * because an alias that still compiles is the old API with a comment on it.
   */
  it('formats a bare amount for when the unit is already in the label', () => {
    expect(bare(bareJod(1999))).toBe('1.999');
    expect(bareJod(1999)).not.toContain(DINAR);
  });

  it('has no decimal-dinar entry point left', async () => {
    const money = await import('./money');

    expect(Object.keys(money).sort()).toEqual([
      'DINAR', 'DINAR_DECIMALS', 'FILS_PER_DINAR',
      'bareJod', 'dinarsFromFils', 'formatJod', 'formatJodSigned',
      'isolateDigits', 'parseDinarsToFils',
    ]);
  });

  it('does not emit NaN for bad input', () => {
    expect(bare(formatJod(Number.NaN))).toBe(`0.000 ${DINAR}`);
    expect(bare(formatJod(Number.POSITIVE_INFINITY))).toBe(`0.000 ${DINAR}`);
    expect(bare(formatJodSigned(Number.NaN))).toBe(`+0.000 ${DINAR}`);
  });

  it('exposes isolateDigits for ranges and counts, not just money', () => {
    expect(isolateDigits('48 / 126')).toBe('\u206648 / 126\u2069');
  });
});

describe('parsing operator input', () => {
  it.each([
    ['1.500', 1500],
    ['1.999', 1999],
    ['1', 1000],
    ['0.001', 1],
    ['12.5', 12500],
    ['1,250.500', 1250500],
  ])('parses %s to %i fils', (input, fils) => {
    expect(parseDinarsToFils(input)).toBe(fils);
  });

  it('accepts Arabic-Indic digits so a form does not reject ١.٥٠٠', () => {
    expect(parseDinarsToFils('١.٥٠٠')).toBe(1500);
    expect(parseDinarsToFils('٢٠')).toBe(20000);
  });

  it('rounds to whole fils rather than truncating', () => {
    expect(parseDinarsToFils('1.9994')).toBe(1999);
    expect(parseDinarsToFils('1.9996')).toBe(2000);
  });

  it('returns null on unparseable input instead of zero', () => {
    // Treating bad input as 0 is how a price silently becomes free.
    for (const bad of ['', '   ', 'abc', '.', '-', '1.2.3', '١٢abc']) {
      expect(parseDinarsToFils(bad)).toBeNull();
    }
  });

  it('survives its own output', () => {
    for (const fils of [1, 5, 1000, 1250, 1999, 250000]) {
      expect(parseDinarsToFils(bare(dinarsFromFils(fils)))).toBe(fils);
    }
  });
});
