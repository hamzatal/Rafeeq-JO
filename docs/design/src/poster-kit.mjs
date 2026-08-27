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

/**
 * A measurement inside Arabic text: «٣–٥ كم».
 *
 * ── The bug this exists to kill ────────────────────────────────────────────
 *
 * The fare table printed EVERY band's distance backwards. The source said
 * `'3–5 كم'` and the poster rendered «5–3 كم» — so band B advertised "5 to 3
 * kilometres", and so did C, D and E. Six posters published a reversed tariff.
 *
 * The cause is the bidirectional algorithm, not a typo. In an RTL paragraph the
 * en-dash is a NEUTRAL character, so "3–5" is not one left-to-right run — it is
 * two digit runs with a neutral between them, and neutrals take the direction of
 * their surroundings. The surroundings are Arabic, so the two runs are laid out
 * right-to-left and the range inverts. Nothing is misspelled and nothing warns
 * you; the string is correct in the file and wrong on the page.
 *
 * `N()` alone is not the fix: wrapping the whole «3–5 كم» in `direction:ltr`
 * straightens the digits and then throws «كم» to the wrong side of them. The
 * numeral must be isolated and the unit must stay in the Arabic run — which is
 * why this is a helper rather than a thing each caller is trusted to remember.
 */
export const KM = (range, unit = 'كم') => `${N(range)}&nbsp;${unit}`;

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
let strokeSeq = 0;

export function stroke({
  w, h, d, width = 84, color = BRAND, dot = AMBER, dotAt = 1,
  dotR = null, opacity = 1, dash = null, cap = 'round',
} = {}) {
  const r = dotR ?? Math.round(width * 0.62);

  /*
   * The path id must be UNIQUE per call.
   *
   * It used to be the literal `id="rt"`, which is fine on a poster with one
   * stroke and silently wrong on a poster with two: `<mpath href="#rt">` resolves
   * to the FIRST matching id in the document, so the second stroke's amber
   * destination dot was positioned along the FIRST stroke's path. On the
   * two-vehicle poster that put the dot on the bus's road instead of the car's —
   * the destination marker landed on the thing we are arguing against.
   *
   * It failed silently and only on multi-stroke layouts, so no existing poster
   * revealed it until one was drawn.
   */
  const id = `rt${++strokeSeq}`;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"
    style="position:absolute;inset:0;opacity:${opacity};z-index:1">
    <path id="${id}" d="${d}" stroke="${color}" stroke-width="${width}"
      stroke-linecap="${cap}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>
    ${dotAt !== null ? `<circle r="${r}" fill="${dot}">
      <animateMotion dur="0.001s" fill="freeze" keyPoints="${dotAt};${dotAt}"
        keyTimes="0;1" calcMode="linear"><mpath href="#${id}"/></animateMotion>
    </circle>` : ''}
  </svg>`;
}

/**
 * The mark — canonical geometry, copied from `ui.mjs`.
 *
 * ── What was wrong here ────────────────────────────────────────────────────
 * The poster version I first wrote was a different logo. Two errors:
 *   1. the direction was REVERSED — the route ran bottom-left → top-right with
 *      the amber dot at the top, when the real mark runs top-right → bottom-left
 *   2. the OUTLINED ORIGIN CIRCLE was missing entirely
 * The mark is a journey: a hollow ring where you start, a curve, and a solid
 * amber disc where you arrive. Dropping the ring removes the "from", which is
 * half the idea.
 */
export function mark(size, { path = BRAND, dot = AMBER, w = 7 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">
    <circle cx="70" cy="26" r="8.5" stroke="${path}" stroke-width="${w}"/>
    <path d="M70 43.5 C70 58 60 68 45 72" stroke="${path}" stroke-width="${w}" stroke-linecap="round"/>
    <circle cx="27" cy="73.5" r="7.5" fill="${dot}"/>
  </svg>`;
}

/**
 * Wordmark. Type, not a logo lockup in a bar — it sits in a corner like a
 * publisher's imprint, at the same weight as the rest of the page.
 *
 * The product is **رفيق**. «مسار» is the name of the DESIGN SYSTEM
 * (`Rafeeq DS v2 «مسار»` in ui.mjs) — I read the roadmap's "الهوية: «مسار»"
 * as the brand and printed the wrong name on all 52 posters.
 */
export function imprint({ color = INK, size = 30, dim = 0.55 } = {}) {
  return `<div style="display:flex;align-items:center;gap:${Math.round(size * 0.34)}px">
    ${mark(Math.round(size * 1.15), { path: color, dot: AMBER, w: 8 })}
    <span style="font:700 ${size}px/1 'Plex';color:${color};letter-spacing:-.02em">رفيق</span>
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


/* ═══════════════════════════════════════════════════════════════════════════
   PLACE — Irbid and northern Jordan, drawn.

   Why silhouettes and not photographs: a stock photo of "students in a car"
   is instantly recognisable as stock, and licensed photography of Irbid that
   we actually own does not exist. Drawn silhouettes in the brand's own line
   weight belong to the brand, cost nothing to license, and can bleed off a
   canvas edge the way a photo cannot.

   Everything here is a BAND that sits along an edge — never a centred
   illustration, which would recreate the "card floating in the middle" problem
   the whole poster language exists to avoid.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Irbid rooftops. The giveaway detail is the water tanks — every Jordanian roof
 * carries them, and no generic skyline does. Minarets and a dome place it
 * without naming it.
 */
export function skyline({ w, h = 300, color = INK, opacity = 0.14, seed = 7 } = {}) {
  let z = seed;
  const rnd = () => (z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let out = '';
  let x = -40;

  while (x < w + 40) {
    const bw = 54 + Math.round(rnd() * 96);
    const bh = Math.round(h * (0.34 + rnd() * 0.52));
    const y = h - bh;
    out += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}"/>`;

    // Water tanks — two or three drums on most roofs.
    if (rnd() > 0.34) {
      const n = 1 + Math.round(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const tx = x + 12 + k * 20;
        if (tx + 14 < x + bw) {
          out += `<rect x="${tx}" y="${y - 15}" width="13" height="15" rx="5"/>`;
        }
      }
    }
    // Window grid, so the mass reads as inhabited rather than as a bar chart.
    for (let r = 0; r < Math.floor(bh / 42); r++) {
      for (let c = 0; c < Math.floor(bw / 34); c++) {
        if (rnd() > 0.42) out += `<rect x="${x + 12 + c * 34}" y="${y + 16 + r * 42}" width="13" height="17"/>`;
      }
    }
    x += bw + 8 + Math.round(rnd() * 14);
  }

  // A minaret and a dome — the two silhouettes that say "here".
  const mx = Math.round(w * 0.24);
  out += `<rect x="${mx}" y="${h - h * 0.94}" width="19" height="${h * 0.94}"/>`;
  out += `<rect x="${mx - 6}" y="${h - h * 0.96}" width="31" height="11"/>`;
  out += `<path d="M${mx + 9.5} ${h - h * 1.06} l9 20 h-18 z"/>`;
  const dx = Math.round(w * 0.68);
  out += `<path d="M${dx - 46} ${h} v-34 a46 46 0 0 1 92 0 v34 z"/>`;
  out += `<rect x="${dx - 3}" y="${h - 96}" width="6" height="18"/>`;

  return `<svg width="${w}" height="${h + 30}" viewBox="0 -30 ${w} ${h + 30}"
    style="position:absolute;left:0;bottom:0;z-index:2;opacity:${opacity}"
    fill="${color}">${out}</svg>`;
}

/**
 * The vehicle — a private saloon, which is what actually does these trips.
 * Four visible headrests, because "four seats" is the entire product claim and
 * an empty car would contradict the copy beside it.
 */
export function car({ w = 620, color = INK, opacity = 1, seats = 4 } = {}) {
  const h = Math.round(w * 0.40);
  const heads = Array.from({ length: seats }, (_, k) =>
    `<circle cx="${196 + k * 66}" cy="112" r="17"/>`).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 620 248" fill="${color}"
    style="opacity:${opacity}">
    <!-- body -->
    <path d="M40 186 C40 156 62 146 96 142 L150 96 C168 78 196 70 228 70
      h132 c34 0 62 10 82 28 l52 46 c34 6 54 18 54 42 v18
      c0 8-6 14-14 14 h-56 a40 40 0 0 0-80 0 h-158 a40 40 0 0 0-80 0 H54
      c-8 0-14-6-14-14 z"/>
    <!-- glass, cut out so the passengers read -->
    <path d="M172 132 L212 92 c10-10 26-14 44-14 h30 v54 z" fill="#FFFFFF" opacity=".42"/>
    <path d="M312 78 h44 c26 0 46 8 62 22 l36 32 h-142 z" fill="#FFFFFF" opacity=".42"/>
    <!-- passengers -->
    <g opacity=".55" fill="#0B1220">${heads}</g>
    <!-- wheels -->
    <circle cx="150" cy="196" r="42"/><circle cx="150" cy="196" r="18" fill="#FFFFFF" opacity=".3"/>
    <circle cx="470" cy="196" r="42"/><circle cx="470" cy="196" r="18" fill="#FFFFFF" opacity=".3"/>
  </svg>`;
}

/**
 * A university gate arch — the destination, and the thing every student
 * pictures when they hear "to campus".
 */
export function gate({ w = 420, color = INK, opacity = 0.16 } = {}) {
  const h = Math.round(w * 0.62);

  return `<svg width="${w}" height="${h}" viewBox="0 0 420 260" fill="${color}"
    style="opacity:${opacity}">
    <rect x="14" y="70" width="46" height="190"/>
    <rect x="360" y="70" width="46" height="190"/>
    <path d="M60 70 h300 v34 H60 z"/>
    <path d="M104 260 v-92 a106 106 0 0 1 212 0 v92 h-30 v-92 a76 76 0 0 0-152 0 v92 z"/>
    <rect x="150" y="14" width="120" height="14"/>
    <circle cx="210" cy="46" r="15"/>
  </svg>`;
}

/**
 * Northern Jordan hills — the terrain between the neighbourhoods and campus,
 * and the reason the walk from the depot is worse than the distance suggests.
 */
export function hills({ w, h = 210, color = BRAND, opacity = 0.1 } = {}) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="${color}"
    style="position:absolute;left:0;bottom:0;z-index:2;opacity:${opacity}">
    <path d="M0 ${h} V${h * 0.52} C ${w * 0.16} ${h * 0.22} ${w * 0.3} ${h * 0.66} ${w * 0.46} ${h * 0.46}
      S ${w * 0.66} ${h * 0.1} ${w * 0.8} ${h * 0.4} S ${w * 0.94} ${h * 0.6} ${w} ${h * 0.34} V${h} z"/>
  </svg>`;
}

/**
 * Umm Qais — the Roman colonnade, and it is IN Irbid governorate.
 *
 * This matters more than it sounds. A generic minaret says "somewhere Arab"; the
 * Decapolis colonnade at Umm Qais says Irbid specifically, to anyone from the
 * north. It is a twenty-minute drive from Yarmouk University and every student
 * there has been on a school trip to it.
 *
 * Drawn as a receding row: columns shorten and fade toward the left so the band
 * has depth without perspective tricks. Two are deliberately BROKEN — a ruin with
 * every column intact reads as a museum reconstruction, not a ruin.
 */
export function columns({ w, h = 300, color = INK, opacity = 0.16, n = 9 } = {}) {
  const gap = w / (n - 0.4);
  let out = '';

  for (let k = 0; k < n; k++) {
    const x = w - 40 - k * gap;
    // Recede: shorter and thinner as they go left (further away).
    const t = 1 - k / (n + 3);
    const ch = Math.round(h * 0.78 * t);
    const cw = Math.round(26 * t) + 12;
    const y = h - ch;
    const broken = k === 3 || k === 6;
    const shaft = broken ? Math.round(ch * (k === 3 ? 0.46 : 0.66)) : ch;
    const sy = h - shaft;

    // Shaft, with fluting suggested by two hairlines rather than drawn grooves.
    out += `<rect x="${x - cw / 2}" y="${sy}" width="${cw}" height="${shaft}"/>`;

    if (!broken) {
      // Capital and abacus.
      out += `<rect x="${x - cw / 2 - 7}" y="${y - 4}" width="${cw + 14}" height="16" rx="3"/>`;
      out += `<rect x="${x - cw / 2 - 11}" y="${y - 18}" width="${cw + 22}" height="15" rx="2"/>`;
    }
    // Base block — the stylobate every column stands on.
    out += `<rect x="${x - cw / 2 - 9}" y="${h - 16}" width="${cw + 18}" height="16"/>`;
  }

  // The stylobate itself, bleeding off both edges.
  out += `<rect x="-20" y="${h - 16}" width="${w + 40}" height="16"/>`;

  // A fallen drum on the ground, because that is what a ruin actually looks like.
  out += `<ellipse cx="${Math.round(w * 0.30)}" cy="${h - 26}" rx="46" ry="15"/>`;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
    style="position:absolute;left:0;bottom:0;z-index:2;opacity:${opacity}"
    fill="${color}">${out}</svg>`;
}

/**
 * Ajloun Castle — the silhouette on the ridge west of Irbid.
 *
 * Twelfth-century, square towers, and it sits on top of a hill rather than in a
 * town, which is why it works as a shape on a horizon instead of inside a skyline.
 * Used as a single mass on the right, never centred.
 */
export function castle({ w = 460, color = INK, opacity = 0.16 } = {}) {
  const h = Math.round(w * 0.58);

  // Crenellations along a wall run, drawn rather than hand-listed so the merlon
  // rhythm stays even at any width.
  const merlons = (x0, x1, y, step = 26) => {
    let s = '';
    for (let x = x0; x < x1 - 12; x += step) s += `<rect x="${x}" y="${y - 14}" width="14" height="15"/>`;

    return s;
  };

  return `<svg width="${w}" height="${h}" viewBox="0 0 460 268" fill="${color}"
    style="opacity:${opacity}">
    <!-- the rock the whole thing stands on -->
    <path d="M0 268 C 60 240 96 232 150 228 L330 224 C 392 230 430 244 460 268 z" opacity=".55"/>
    <!-- curtain wall -->
    <rect x="86" y="150" width="292" height="82"/>
    ${merlons(90, 378, 150)}
    <!-- keep, and two flanking towers of different heights: a castle grown in
         stages, not designed in one -->
    <rect x="182" y="86" width="104" height="146"/>
    ${merlons(186, 286, 86)}
    <rect x="96" y="120" width="62" height="112"/>
    ${merlons(100, 158, 120)}
    <rect x="312" y="106" width="70" height="126"/>
    ${merlons(316, 382, 106)}
    <!-- arrow slits -->
    <rect x="210" y="126" width="10" height="30" fill="#F4EFE4" opacity=".5"/>
    <rect x="248" y="126" width="10" height="30" fill="#F4EFE4" opacity=".5"/>
    <rect x="120" y="156" width="9" height="26" fill="#F4EFE4" opacity=".5"/>
    <rect x="340" y="146" width="9" height="26" fill="#F4EFE4" opacity=".5"/>
    <!-- the gate -->
    <path d="M212 232 v-42 a22 22 0 0 1 44 0 v42 z" fill="#F4EFE4" opacity=".42"/>
  </svg>`;
}

/**
 * A rooftop, close up — water tanks, a dish, a washing line.
 *
 * The one detail that is unmistakably Jordanian and appears in no stock skyline.
 * `skyline()` uses tanks at 13px as texture; this is the same object at poster
 * scale, where it becomes the subject instead of the background.
 */
export function rooftop({ w = 1180, color = INK, opacity = 0.18 } = {}) {
  // Deliberately WIDE (0.33, not 0.52). A rooftop band has to bleed off both
  // canvas edges to read as a fragment of a real roof; at a squarer aspect it
  // either has to be shrunk until it sits in one corner as an illustration — which
  // is the "graphic floating in the middle" this whole system exists to avoid — or
  // scaled up until it collides with the stroke above it.
  const h = Math.round(w * 0.33);

  /** A tank on its stand. Heights vary because nobody installs these level. */
  const tank = (x, y, tw, th) => `
    <rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="${Math.round(tw * 0.26)}"/>
    <rect x="${x - 6}" y="${y - 9}" width="${tw + 12}" height="14" rx="7"/>
    <rect x="${x + 10}" y="${y + th}" width="12" height="${262 - y - th}"/>
    <rect x="${x + tw - 22}" y="${y + th}" width="12" height="${262 - y - th}"/>`;

  return `<svg width="${w}" height="${h}" viewBox="0 0 980 322" fill="${color}"
    style="opacity:${opacity}">
    <!-- parapet, bleeding the full width -->
    <rect x="0" y="276" width="980" height="46"/>
    <rect x="0" y="262" width="980" height="16" opacity=".7"/>

    <!-- first cluster: three drums, uneven -->
    ${tank(78, 152, 104, 108)}
    ${tank(228, 118, 112, 142)}
    ${tank(392, 168, 92, 92)}

    <!-- solar collector, angled — the other thing on every roof here -->
    <path d="M508 212 l112-36 v22 l-112 36 z"/>
    <rect x="512" y="232" width="10" height="30"/><rect x="602" y="206" width="10" height="56"/>

    <!-- second cluster, further along the roof, so the band has rhythm rather
         than one group and then emptiness -->
    ${tank(668, 160, 96, 100)}
    ${tank(800, 134, 104, 126)}

    <!-- the stair head — every roof is reached through one -->
    <rect x="556" y="196" width="86" height="66" opacity=".0"/>
    <path d="M916 262 v-58 h58 v58 z"/>
    <path d="M916 204 h58 l-10-16 h-38 z"/>

    <!-- satellite dish -->
    <ellipse cx="44" cy="198" rx="30" ry="34" transform="rotate(-22 44 198)"/>
    <rect x="40" y="224" width="9" height="38"/>

    <!-- the pipe run that ties them together -->
    <path d="M120 262 h120 M284 262 h116 M500 262 h180 M712 262 h96"
      stroke="${color}" stroke-width="7"/>

    <!-- a washing line, because a roof here is also where laundry goes -->
    <path d="M188 128 C 320 154 470 152 596 132" stroke="${color}"
      stroke-width="4" fill="none" opacity=".6"/>
  </svg>`;
}

/**
 * A minibus — «الكوستر», the thing this product competes with.
 *
 * Drawn deliberately blunter than `car()`: a flat front, a taller box, more
 * windows. When it appears beside the saloon in a comparison the shapes have to
 * be distinguishable at thumbnail size, or the comparison is a caption doing all
 * the work.
 */
export function bus({ w = 560, color = INK, opacity = 1 } = {}) {
  const h = Math.round(w * 0.46);
  const windows = Array.from({ length: 5 }, (_, k) =>
    `<rect x="${132 + k * 74}" y="64" width="58" height="56" rx="6" fill="#FFFFFF" opacity=".40"/>`).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 560 258" fill="${color}"
    style="opacity:${opacity}">
    <path d="M28 196 V70 c0-16 12-28 28-28 h420 c18 0 32 12 38 30 l20 62 v62
      c0 8-6 14-14 14 h-42 a38 38 0 0 0-76 0 H188 a38 38 0 0 0-76 0 H42
      c-8 0-14-6-14-14 z"/>
    ${windows}
    <!-- driver's screen, split by the A-pillar -->
    <path d="M494 122 l-16-50 c-3-10 3-16 12-16 h6 l22 66 z" fill="#FFFFFF" opacity=".40"/>
    <circle cx="150" cy="196" r="38"/><circle cx="150" cy="196" r="16" fill="#FFFFFF" opacity=".3"/>
    <circle cx="426" cy="196" r="38"/><circle cx="426" cy="196" r="16" fill="#FFFFFF" opacity=".3"/>
    <!-- destination board, blank: it never says where you actually want to go -->
    <rect x="64" y="58" width="52" height="26" rx="4" fill="#FFFFFF" opacity=".28"/>
  </svg>`;
}

/** An olive tree — the most Jordanian object there is. Used small, as punctuation. */
export function olive({ s = 190, color = INK, opacity = 0.15 } = {}) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 190 190" fill="${color}"
    style="opacity:${opacity}">
    <rect x="88" y="104" width="14" height="76"/>
    <path d="M95 116 L62 92 M95 122 L128 96 M95 106 L95 74"
      stroke="${color}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="60" cy="80" rx="40" ry="30"/><ellipse cx="126" cy="84" rx="38" ry="28"/>
    <ellipse cx="94" cy="56" rx="42" ry="32"/>
  </svg>`;
}
