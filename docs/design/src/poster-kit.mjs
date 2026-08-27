/* ═══════════════════════════════════════════════════════════════════════════
   «مسار» — POSTER LANGUAGE
   A deliberately NON-UI visual system for social posts.

   ── Why this file exists instead of reusing kit.css ────────────────────────
   The previous marketing set was built on the app's own stylesheet, so every
   post inherited the app's furniture and read as a screenshot: rounded cards
   with 1px borders (an app list view), a filled pill CTA (a tappable button),
   a bottom brand strip (a tab bar), everything centred and stacked on a
   near-white canvas with the app's faint grid behind it.

   So this system BANS those things outright:
     ✗ no cards, no borders, no pills, no buttons, no tab strips
     ✗ nothing centred by default, no near-white canvas, no UI grid
   and replaces them with poster mechanics:
     ✓ warm paper, or a full-bleed colour field
     ✓ THE STROKE — one thick route curve bleeding off two edges, ending in
       the amber destination dot. The identity's own geometry, made huge.
     ✓ type as image: headlines 120–200px, numerals 300–560px, clipped by the
       canvas edge on purpose
     ✓ asymmetry — content flush to an edge, never floating in the middle
     ✓ paper grain, so it does not look rendered
     ✓ editorial furniture: index numerals, a rotated Latin rail, hairlines
       that bleed off the page
   ═══════════════════════════════════════════════════════════════════════════ */

export const INK = '#0B1220';       // deep field — captain-facing (decision 15)
export const BRAND = '#1259E3';     // brand-600
export const BRAND_D = '#0E47B4';   // brand-700
export const BRAND_L = '#5AA2FB';   // brand-400
export const AMBER = '#F59E0B';     // the ONLY second colour — destination + live
export const BONE = '#F4EFE4';      // warm paper. the single biggest anti-UI move
export const BONE_D = '#E7DECD';
export const CHALK = '#FBF8F2';

/** Digits isolated so bidi cannot reorder them — same rule the apps follow. */
export const N = (t) => `<span style="unicode-bidi:isolate;direction:ltr">${t}</span>`;
export const JOD = (v) => `${N(v)}<span style="font-size:.42em;font-weight:500;margin-inline-start:.18em">د.أ</span>`;

/* ── Paper grain ─────────────────────────────────────────────────────────────
   feTurbulence at low opacity. Without it large flat fields read as "rendered
   in a browser"; with it they read as printed. */
export const grain = (opacity = 0.055, seed = 3) => `
<svg width="0" height="0" style="position:absolute"><filter id="gr${seed}">
  <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" seed="${seed}"/>
  <feColorMatrix type="saturate" values="0"/>
</filter></svg>
<div style="position:absolute;inset:0;filter:url(#gr${seed});opacity:${opacity};
  mix-blend-mode:multiply;pointer-events:none;z-index:60"></div>`;

/**
 * THE STROKE — the signature device.
 *
 * A single thick route curve that enters one edge and leaves another, so the
 * eye reads continuation rather than a contained graphic. It terminates in the
 * amber dot, which is the destination marker from the logo. Never decorative:
 * it is always the same object, at different scales.
 */
export function stroke({
  w, h, d, width = 84, color = BRAND, dot = AMBER, dotAt = 1,
  dotR = null, opacity = 1, dash = null, cap = 'round',
} = {}) {
  const r = dotR ?? Math.round(width * 0.62);

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"
    style="position:absolute;inset:0;opacity:${opacity};z-index:1">
    <path id="rt" d="${d}" stroke="${color}" stroke-width="${width}"
      stroke-linecap="${cap}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>
    ${dotAt !== null ? `<circle r="${r}" fill="${dot}">
      <animateMotion dur="0.001s" fill="freeze" keyPoints="${dotAt};${dotAt}"
        keyTimes="0;1" calcMode="linear"><mpath href="#rt"/></animateMotion>
    </circle>` : ''}
  </svg>`;
}

/** The mark, drawn at poster scale. A route that turns, with the amber terminus. */
export function mark(size, { path = BRAND, dot = AMBER, w = 7 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">
    <path d="M20 76 C20 44 44 44 60 44 C74 44 78 34 78 24" stroke="${path}"
      stroke-width="${w}" stroke-linecap="round"/>
    <circle cx="78" cy="20" r="${w * 1.15}" fill="${dot}"/>
  </svg>`;
}

/**
 * Wordmark. Type, not a logo lockup in a bar — it sits in a corner like a
 * publisher's imprint, at the same weight as the rest of the page.
 */
export function imprint({ color = INK, size = 30, dim = 0.55 } = {}) {
  return `<div style="display:flex;align-items:center;gap:${Math.round(size * 0.34)}px">
    ${mark(Math.round(size * 1.15), { path: color, dot: AMBER, w: 8 })}
    <span style="font:700 ${size}px/1 'Plex';color:${color};letter-spacing:-.02em">مسار</span>
    <span style="width:1px;height:${Math.round(size * 0.72)}px;background:${color};opacity:.28"></span>
    <span style="font:500 ${Math.round(size * 0.6)}px/1 'Plex';color:${color};opacity:${dim}">مقعدك إلى الجامعة</span>
  </div>`;
}

/** Rotated Latin rail up an edge — editorial furniture, never a label. */
export function rail(text, { color = INK, opacity = 0.34, size = 15, side = 'left' } = {}) {
  return `<div style="position:absolute;${side}:44px;bottom:150px;z-index:20;
    writing-mode:vertical-rl;transform:rotate(180deg);
    font:500 ${size}px/1 'Plex';letter-spacing:.42em;color:${color};opacity:${opacity}">
    ${text}</div>`;
}

/** Index numeral, e.g. ٠٣ / ٥٢ — tells the reader this is a series. */
export function index(i, total, { color = INK, opacity = 0.4 } = {}) {
  const ar = (n) => String(n).padStart(2, '0').replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

  return `<div style="position:absolute;top:52px;left:52px;z-index:20;
    font:700 20px/1 'Plex';letter-spacing:.16em;color:${color};opacity:${opacity}">
    ${ar(i)} <span style="opacity:.5">/ ${ar(total)}</span></div>`;
}

/** A hairline that bleeds off both edges — never a box. */
export const bleedRule = (top, { color = INK, opacity = 0.16, height = 1 } = {}) =>
  `<div style="position:absolute;inset-inline:0;top:${top}px;height:${height}px;
    background:${color};opacity:${opacity};z-index:5"></div>`;

/** The page shell. Fonts are loaded from a real file so @font-face resolves. */
export function page(w, h, body, bg = BONE) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>
@font-face{font-family:'Plex';src:url('./fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2')format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Plex';src:url('./fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2')format('woff2');font-weight:500;font-display:block}
@font-face{font-family:'Plex';src:url('./fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2')format('woff2');font-weight:700;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:'Plex',system-ui,sans-serif;background:${bg};
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.stage{position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg}}
/* Type as image. Tight leading and negative tracking so a headline reads as a
   shape; the app never sets type this large so it cannot look like a screen. */
.h{font-weight:700;line-height:1.06;letter-spacing:-.03em;text-wrap:balance}
.num{font-weight:700;line-height:.82;letter-spacing:-.045em;unicode-bidi:isolate;direction:ltr;font-variant-numeric:lining-nums}
.lede{font-weight:500;line-height:1.5;letter-spacing:-.005em;text-wrap:pretty}
</style></head><body><div class="stage">${body}</div></body></html>`;
}

/* Canvas sizes. Portrait 4:5 is the feed default because it takes the most
   vertical space in the timeline; story is 9:16. */
export const SQ = [1080, 1080];
export const PT = [1080, 1350];
export const ST = [1080, 1920];
