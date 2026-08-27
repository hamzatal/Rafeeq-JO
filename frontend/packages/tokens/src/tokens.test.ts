/* ═══════════════════════════════════════════════════════════════════════════
   Tests for @rafeeq/tokens.

   ── What is deliberately NOT here ──────────────────────────────────────────

   Colour-contrast ratios, the retired palette, the `extrabold` weight and the raw
   hexes in app code are all asserted by `frontend/scripts/check-design-tokens.mjs`,
   which scans the whole workspace. Repeating them here would be a second place to
   update when a value changes, which is the exact failure this whole phase is about.

   What is here is the two things a scanner cannot see: the BEHAVIOUR of the pure
   functions, and the STRUCTURAL invariants that make the token set a system rather
   than a bag of constants — "three radii on purpose", "four real font faces",
   "every type role resolves to a real family".
   ═══════════════════════════════════════════════════════════════════════════ */

import { describe, expect, it } from 'vitest';

import { alpha, brand, neutral, RETIRED } from './color';
import { colors } from './semantic';
import { fontFamily, fontWeight, legacyText, rnType, type } from './type';
import { radius, space } from './space';
import { count, isolate, percent, range, tabularNums } from './num';
import { lucideName, RTL_MIRRORED, shouldMirror } from './icon';

const LRI = '\u2066';
const PDI = '\u2069';

describe('num — digits inside an Arabic paragraph', () => {
  it('wraps a value in a left-to-right isolate', () => {
    expect(isolate(42)).toBe(`${LRI}42${PDI}`);
  });

  /*
   * The poster bug, as a test.
   *
   * Six printed posters shipped a REVERSED tariff — "5–3 كم" instead of "3–5" —
   * because the two numbers were isolated separately. The dash between two isolated
   * runs is still bidi-neutral, so the runs themselves got laid out right to left
   * and the range inverted. The whole expression has to sit inside ONE isolate.
   */
  it('isolates a range as one run, not two', () => {
    const r = range(3, 5);

    expect(r).toBe(`${LRI}3\u20135${PDI}`);
    expect(r.indexOf(LRI)).toBe(r.lastIndexOf(LRI));
    expect(r.indexOf(PDI)).toBe(r.lastIndexOf(PDI));
  });

  it('separates a range with an en dash, not a hyphen', () => {
    expect(range(1, 2)).toContain('\u2013');
    expect(range(1, 2)).not.toContain('-');
  });

  /*
   * The unit belongs to the Arabic run and reads to the LEFT of the number, so it
   * must stay outside the isolate. Wrapping both put "مقاعد" on the wrong side.
   */
  it('keeps a unit outside the isolate', () => {
    expect(count(4, 'مقاعد')).toBe(`${LRI}4${PDI} مقاعد`);
    expect(count(4)).toBe(`${LRI}4${PDI}`);
  });

  it('isolates a percentage together with its sign', () => {
    expect(percent(15)).toBe(`${LRI}15%${PDI}`);
  });

  /*
   * React Native's `TextStyle` rejects a readonly tuple, so `tabularNums` is
   * deliberately not `as const`. A mutable array is the requirement, not an
   * oversight — assert it so nobody "tidies" it into a frozen literal.
   */
  it('exposes tabular figures for both platforms', () => {
    expect(tabularNums.rn.fontVariant).toEqual(['tabular-nums']);
    expect(Array.isArray(tabularNums.rn.fontVariant)).toBe(true);
    expect(tabularNums.web.fontVariantNumeric).toBe('tabular-nums');
    expect(tabularNums.className).toBe('tabular-nums');
  });
});

describe('colour', () => {
  it('converts a hex to rgba', () => {
    expect(alpha('#1259E3', 0.08)).toBe('rgba(18, 89, 227, 0.08)');
    expect(alpha('1259E3', 1)).toBe('rgba(18, 89, 227, 1)');
  });

  /*
   * The retired navy/teal identity survived phase 4 in three places nobody looked
   * at — including the splash screen of both apps, which therefore OPENED on the
   * dead brand. `RETIRED` exists so a gate can recognise those hexes by value; if
   * one ever leaks back into a live role, the gate is the thing being bypassed.
   */
  it('shares no value between the live roles and the retired identity', () => {
    const dead = new Set(Object.values(RETIRED).map((h) => h.toUpperCase()));
    const live = Object.entries(colors).filter(([, v]) => dead.has(String(v).toUpperCase()));

    expect(live).toEqual([]);
  });

  it('builds every semantic role out of the ramp, never a loose hex', () => {
    const ramp = new Set(
      [...Object.values(brand), ...Object.values(neutral)].map((h) => h.toUpperCase()),
    );
    const opaque = Object.entries(colors).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(String(v)));
    const strays = opaque.filter(([, v]) => !ramp.has(String(v).toUpperCase()));

    /*
     * Only the status and live scales sit outside the ramp, and they are listed by
     * name rather than counted — so ADDING a role that is a loose hex fails here
     * instead of passing a threshold. `info` is not in this list because it is a
     * brand blue, which is the point: an informational tint is the brand, not a
     * fifth colour someone picked.
     */
    expect(strays.map(([k]) => k).sort()).toEqual([
      'danger', 'dangerSoft', 'live', 'liveSoft',
      'success', 'successSoft', 'warning', 'warningSoft',
    ]);
  });
});

describe('type', () => {
  /*
   * There were FIVE weights, and one of them did not exist.
   *
   * `fontFamily.extrabold` was aliased to the 700 face and used on 89 app sites plus
   * 25 admin classes — IBM Plex Sans Arabic ships no 800 weight, so "extrabold" and
   * "bold" rendered identically while the code claimed a hierarchy that the screen
   * could not show. These four are the faces that actually ship.
   */
  it('has exactly the four font faces that exist', () => {
    expect(Object.keys(fontFamily).sort()).toEqual(['bold', 'medium', 'regular', 'semibold']);
    expect(Object.keys(fontWeight).sort()).toEqual(['bold', 'medium', 'regular', 'semibold']);
    expect(Object.values(fontFamily)).not.toContain('IBMPlexSansArabic_800ExtraBold');
  });

  it('pairs each family with its numeric weight', () => {
    expect(fontWeight.regular).toBe('400');
    expect(fontWeight.medium).toBe('500');
    expect(fontWeight.semibold).toBe('600');
    expect(fontWeight.bold).toBe('700');
  });

  it('resolves every role in the scale to a real family and a sane line height', () => {
    for (const [role, spec] of Object.entries(type)) {
      expect(fontFamily, `${role} weight`).toHaveProperty(spec.weight);
      /* Arabic needs more leading than Latin — 1.06 is the floor, never 0.9. */
      expect(spec.lineHeight / spec.size, `${role} leading`).toBeGreaterThanOrEqual(1.06);
    }
  });

  /*
   * `rnType` returns `fontFamily`, never `fontWeight`. React Native on Android
   * IGNORES a numeric weight for a custom family — the weight has to be baked into
   * the family name — so a role rendered with `fontWeight: '700'` came out regular on
   * Android and bold on iOS. That is why the scale lists faces instead of numbers,
   * and why this asserts the family rather than the weight.
   */
  it('gives the React Native scale the same numbers as the source scale', () => {
    for (const role of Object.keys(type) as (keyof typeof type)[]) {
      const spec = type[role];
      const rn = rnType(role);

      expect(rn.fontSize, `${role} size`).toBe(spec.size);
      expect(rn.lineHeight, `${role} lineHeight`).toBe(spec.lineHeight);
      expect(rn.letterSpacing, `${role} tracking`).toBe(spec.letterSpacing);
      expect(rn.fontFamily, `${role} family`).toBe(fontFamily[spec.weight]);
      expect(rn, `${role} must not carry a numeric weight`).not.toHaveProperty('fontWeight');
    }
  });

  /*
   * `legacyText` is a FROZEN copy of the pre-token scale, kept at its exact old
   * values for the 16 sites in `home.tsx` and `ride-request.tsx` that phase 8
   * rewrites. Remapping them onto the new scale now would be an unreviewed pixel
   * change on two screens that are about to be replaced. The `legacy-type-scale`
   * gate holds the count at 2 files so it cannot spread; this test holds the VALUES
   * so a well-meaning "alignment" pass cannot quietly move them.
   */
  it('keeps the legacy scale at its original values', () => {
    expect(legacyText.headlineMd.fontSize).toBe(24);
    expect(legacyText.headlineMd.lineHeight).toBe(32);
    expect(legacyText.bodyLg.fontSize).toBe(18);
    expect(legacyText.bodyLg.lineHeight).toBe(28);
    expect(legacyText.caption.fontSize).toBe(12);
    expect(legacyText.caption.lineHeight).toBe(16);
  });
});

describe('space and radius', () => {
  /*
   * There were SEVEN radii across 49 files — 8, 12, 14, 16, 20, 24, 28 — chosen per
   * call site. Four ROLES replace them, so the question at a call site is "what kind
   * of surface is this" and not "what number looked right". Adding a fifth is how the
   * seven came back, so the count is asserted.
   */
  it('has four radius roles and no loose numbers', () => {
    expect(Object.keys(radius).sort()).toEqual(['card', 'control', 'pill', 'sheet']);
    expect(radius.control).toBe(12);
    expect(radius.card).toBe(16);
    expect(radius.sheet).toBe(24);
    expect(radius.pill).toBe(9999);
  });

  it('keeps the spacing scale on a 4px grid, strictly ascending', () => {
    const steps = Object.values(space);

    for (const step of steps) expect(step % 4, `${step} off-grid`).toBe(0);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
  });
});

describe('icons', () => {
  it('leaves a name alone when no rename applies', () => {
    expect(lucideName('search')).toBe('search');
    expect(lucideName('map-pin')).toBe('map-pin');
  });

  /*
   * Both of these render NOTHING under the current Lucide if unmapped — a gap the
   * right size, so the layout still looks deliberate and the missing icon survives
   * review. Found by generating the registry against the installed package.
   */
  it('maps the Lucide renames that would otherwise render nothing', () => {
    expect(lucideName('home')).toBe('house');
    expect(lucideName('help-circle')).toBe('circle-question-mark');
  });

  it('mirrors directional glyphs under RTL and leaves symmetric ones alone', () => {
    expect(shouldMirror('chevron-left')).toBe(true);
    expect(shouldMirror('arrow-right')).toBe(true);
    expect(shouldMirror('log-out')).toBe(true);
    expect(shouldMirror('search')).toBe(false);
    expect(shouldMirror('settings')).toBe(false);
  });

  /* `home` mirrors nothing, but a name whose RENAMED target is directional must. */
  it('mirrors through a rename, not only on the raw name', () => {
    expect(shouldMirror('trending-up')).toBe(true);
    expect(RTL_MIRRORED.has('trending-up')).toBe(true);
  });
});
