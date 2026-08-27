/* ═══════════════════════════════════════════════════════════════════════════
   «رفيق» — social posts, generated.

   ── The one layout law ─────────────────────────────────────────────────────
   THE STROKE AND THE TYPE NEVER SHARE A BAND. The first draft let the route
   curve run straight through a headline and it became unreadable — the device
   has to frame the type or sit beside it, never behind it. Every archetype
   below therefore declares which region belongs to the stroke and which to the
   copy, and they do not overlap.

   Run:  node gen-posters.mjs
   ═══════════════════════════════════════════════════════════════════════════ */

import { writeFileSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import {
  INK, BRAND, BRAND_D, BRAND_L, AMBER, BONE, BONE_D, CHALK,
  N, KM, grain, stroke, imprint, rail, index, page, mark, SQ, PT, ST,
  skyline, car, gate, hills, olive, columns, castle, rooftop, bus,
} from './poster-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(HERE, 'build');
/*
 * Output paths are relative to THIS file, which lives at `docs/design/src`.
 *
 * They used to read `resolve(HERE, '../Rafeeq-JO/...')` — a path that only resolves
 * when the script is COPIED next to a checkout, which is how it was originally run.
 * Run from its committed location, as `docs/design/README.md` instructs, it silently
 * created a phantom `docs/design/src/Rafeeq-JO/` tree and left the real mockups
 * untouched — so a regeneration looked like it had succeeded and changed nothing.
 */
const OUT = resolve(HERE, '../../../marketing/posts');

/* ── shared fragments ─────────────────────────────────────────────────────── */

const foot = (dark) => `<div style="position:absolute;bottom:66px;right:64px;z-index:25">
  ${imprint({ color: dark ? '#fff' : INK, size: 33, dim: dark ? 0.6 : 0.55 })}</div>`;

const eyebrow = (t, color = BRAND) =>
  `<div style="font:700 27px/1 'Plex';color:${color};letter-spacing:.16em">${t}</div>`;

/**
 * Clearance between a big headline and the lede beneath it. THE SECOND LAW.
 *
 * The first law is that the stroke and the type never share a band. This is the
 * one I had not written down, and it broke a different set of posters: TYPE AND
 * TYPE must not share a band either.
 *
 * `margin-top:30px` was enough in Latin and is not enough in Arabic, because
 * Arabic collides from both directions at once:
 *
 *   • the headline reaches DOWN — «للمشي» ends in ي, whose bowl drops well past
 *     the 1.06 line-height the headline sets, and a line box does not contain it
 *   • the lede reaches UP — a shadda or a hamza on the lede's first line sits
 *     above its own cap height, so «بيسدّ» rises into the gap from below
 *
 * Neither overflows on its own. Together they met in the middle, and on poster 53
 * the descender of the headline was touching the tashkeel of the lede. The user's
 * report was exactly right: «في بعض الصور الكتابات فوق بعض».
 *
 * 54px is measured, not guessed: a 124px headline's ي reaches ~0.22em (27px)
 * below its line box, and a 33px lede's shadda reaches ~0.30em (10px) above its
 * cap — 37px of ink to clear, plus enough air that it reads as two blocks rather
 * than one crowded one.
 */
const LEDE_GAP = 54;

/** Big numeral + unit, on a shared baseline. Replaces every "stat card". */
const stat = (value, unit, { size = 220, color = INK, dim = 0.58 } = {}) => `
  <div style="display:flex;align-items:baseline;gap:20px;flex-direction:row-reverse">
    <span class="num" style="font-size:${size}px;color:${color}">${N(value)}</span>
    <span style="font:500 ${Math.round(size * 0.15)}px/1 'Plex';color:${color};opacity:${dim}">${unit}</span>
  </div>`;

/** A list as typographic lines on hairlines — never boxes. */
const lines = (items, { color = INK, size = 40, gap = 30 } = {}) => items.map((t, i) => `
  <div style="padding:${gap}px 0;${i ? `border-top:1px solid ${color};` : ''}
    ${i ? 'border-image:none;' : ''}">
    <div style="display:flex;align-items:baseline;gap:24px;flex-direction:row-reverse">
      <span style="font:700 ${Math.round(size * 0.62)}px/1 'Plex';color:${AMBER};min-width:44px">
        ${N(String(i + 1).padStart(2, '0'))}</span>
      <span style="font:500 ${size}px/1.35 'Plex';color:${color};flex:1">${t}</span>
    </div>
  </div>`).join('').replace(/border-top:1px solid ([^;]+);/g, (m, c) => `border-top:1px solid ${c};opacity:1;`);

/* ═════════════════════════ ARCHETYPES ═════════════════════════════════════ */

/**
 * 1 · NUMBER WALL — one clipped numeral is the whole image.
 *
 * BANDS (1350 tall), and they do not overlap:
 *     68 –  400  the numeral (clipped off the right edge ON PURPOSE)
 *    398 –  440  the unit, on the numeral's own baseline
 *    540 –  740  the stroke, and nothing else
 *    810 – 1114  headline + lede
 *
 * The stroke used to run from 0.615h (830) up to 0.395h (533) while the copy
 * block was anchored at `bottom:236` — which put its top at roughly 718. So the
 * stroke's left half crossed the headline for about 110px and the route ran
 * through «من حيّك لباب الجامعة». Same law, broken again: the stroke and the
 * type never share a band. It is now raised to 540–740 and the copy is anchored
 * from a measured top rather than only from the bottom, so the two cannot drift
 * into each other when a headline grows a third line.
 */
function numberWall({ i, total, value, unit, head, lede, bg = BONE, fg = INK, accent = BRAND }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    ${stroke({ w, h, d: `M-120 ${h * 0.545} C ${w * 0.30} ${h * 0.545} ${w * 0.30} ${h * 0.412} ${w * 0.62} ${h * 0.412} S ${w * 0.84} ${h * 0.400} ${w * 0.885} ${h * 0.398}`, width: 92, color: accent })}
    ${index(i, total, { color: fg })}
    ${rail('YOUR SEAT TO CAMPUS', { color: fg, opacity: dark ? 0.34 : 0.3 })}
    <div style="position:absolute;top:${h * 0.05}px;right:-26px;z-index:10">
      <div class="num" style="font-size:${String(value).length > 5 ? 330 : 400}px;color:${fg}">${N(value)}</div>
    </div>
    <div style="position:absolute;top:${h * 0.295}px;right:60px;z-index:10;
      font:500 44px/1 'Plex';color:${fg};opacity:.6">${unit}</div>
    <div style="position:absolute;top:${h * 0.60}px;bottom:236px;right:64px;left:64px;z-index:10">
      <div class="h" style="font-size:118px;color:${fg};max-width:900px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:33px;color:${fg};opacity:.64;max-width:770px">${lede}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.06, 3 + i)}
  `, bg);
}

/** 2 · SPLIT FIELD — a hard diagonal cut. Stroke lives only in the lower field. */
function splitField({ i, total, kicker, head, value, unit, note, top = BRAND, bottom = INK, kickerColor = AMBER }) {
  const [w, h] = PT;

  return page(w, h, `
    <div style="position:absolute;inset:0;background:${bottom}"></div>
    <div style="position:absolute;inset:0;background:${top};
      clip-path:polygon(0 0, 100% 0, 100% 32%, 0 52%)"></div>
    ${stroke({ w, h, d: `M-100 ${h * 0.88} C ${w * 0.32} ${h * 0.88} ${w * 0.30} ${h * 0.70} ${w * 0.66} ${h * 0.70} S ${w * 0.84} ${h * 0.665} ${w * 0.88} ${h * 0.66}`, width: 76, color: '#16233B', dot: AMBER, dotR: 40 })}
    ${index(i, total, { color: '#fff' })}
    ${rail('RAFEEQ · JORDAN', { color: '#fff', opacity: 0.34 })}
    <div style="position:absolute;top:92px;right:64px;left:64px;z-index:10">
      ${eyebrow(kicker, kickerColor)}
      <div class="h" style="margin-top:36px;font-size:142px;color:#fff;max-width:890px">${head}</div>
    </div>
    <div style="position:absolute;bottom:248px;right:64px;left:64px;z-index:10">
      ${stat(value, unit, { size: 226, color: '#fff', dim: 0.6 })}
      ${note ? `<div style="margin-top:22px;font:700 30px/1 'Plex';color:${AMBER}">${note}</div>` : ''}
    </div>
    ${foot(true)}${grain(0.07, 5 + i)}
  `, bottom);
}

/** 3 · STATEMENT — pure type. The stroke is a thin rule under the headline. */
function statement({ i, total, kicker, head, lede, bg = BRAND, fg = '#fff' }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    ${stroke({ w, h, d: `M ${w + 100} ${h * 0.845} C ${w * 0.68} ${h * 0.845} ${w * 0.70} ${h * 0.94} ${w * 0.30} ${h * 0.94} S ${w * 0.12} ${h * 0.965} ${w * 0.09} ${h * 0.97}`, width: 58, color: dark ? 'rgba(255,255,255,.16)' : BRAND, dot: AMBER, dotR: 30 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:${h * 0.13}px;right:66px;left:66px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:${kicker ? 40 : 0}px;font-size:158px;color:${fg};max-width:940px">${head}</div>
      <div style="margin-top:52px;width:190px;height:7px;background:${AMBER}"></div>
      ${lede ? `<div class="lede" style="margin-top:46px;font-size:36px;color:${fg};opacity:${dark ? 0.78 : 0.66};max-width:820px">${lede}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.075 : 0.055, 11 + i)}
  `, bg);
}

/** 4 · VERSUS — two numbers, brutal scale contrast, the loser struck through. */
function versus({ i, total, head, badLabel, bad, goodLabel, good, note, bg = BONE }) {
  const [w, h] = PT;

  return page(w, h, `
    ${stroke({ w, h, d: `M-110 ${h * 0.30} C ${w * 0.26} ${h * 0.30} ${w * 0.24} ${h * 0.20} ${w * 0.56} ${h * 0.20} S ${w * 0.80} ${h * 0.175} ${w * 0.845} ${h * 0.172}`, width: 66, color: BRAND })}
    ${index(i, total)}
    ${rail('FIXED SEAT PRICE')}
    <div style="position:absolute;top:${h * 0.30}px;right:64px;left:64px;z-index:10">
      <div class="h" style="font-size:118px;color:${INK};max-width:880px">${head}</div>
    </div>
    <div style="position:absolute;top:${h * 0.505}px;right:64px;z-index:10">
      <div style="font:500 34px/1 'Plex';color:${INK};opacity:.46">${badLabel}</div>
      <div class="num" style="margin-top:12px;font-size:132px;color:${INK};opacity:.26;
        text-decoration:line-through;text-decoration-thickness:8px">${N(bad)}</div>
    </div>
    <div style="position:absolute;top:${h * 0.665}px;right:64px;z-index:10">
      <div style="font:700 34px/1 'Plex';color:${BRAND}">${goodLabel}</div>
      <div class="num" style="margin-top:8px;font-size:250px;color:${BRAND}">${N(good)}</div>
    </div>
    ${note ? `<div style="position:absolute;bottom:170px;right:64px;left:64px;z-index:10;
      font:500 31px/1.45 'Plex';color:${INK};opacity:.6;max-width:800px">${note}</div>` : ''}
    ${foot(false)}${grain(0.058, 19 + i)}
  `, bg);
}

/** 5 · LIST — numbered lines on hairlines. Never cards. */
function listPost({ i, total, kicker, head, items, bg = CHALK, fg = INK }) {
  const [w, h] = PT;
  const dark = bg === INK;
  // Type scales to the item count so four items fill the canvas as willingly as
  // six do — the first draft sized them fixed and left two dead bands.
  const size = items.length <= 4 ? 52 : items.length === 5 ? 46 : 41;
  const gap = items.length <= 4 ? 44 : items.length === 5 ? 36 : 30;

  return page(w, h, `
    <!-- Full-height stroke down the left margin: a device, not a stub. -->
    ${stroke({ w, h, d: `M ${w * 0.075} ${-120} C ${w * 0.075} ${h * 0.30} ${w * 0.115} ${h * 0.34} ${w * 0.115} ${h * 0.62} S ${w * 0.115} ${h * 0.82} ${w * 0.075} ${h * 0.90}`, width: 40, color: dark ? '#1B2A46' : BONE_D, dot: AMBER, dotR: 25 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:118px;right:64px;left:180px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:34px;font-size:106px;color:${fg}">${head}</div>
    </div>
    <!-- Centred in the band BELOW the headline rather than pinned to a fraction -->
    <div style="position:absolute;top:${h * 0.36}px;bottom:210px;right:64px;left:180px;
      z-index:10;display:flex;flex-direction:column;justify-content:center">
      <div>${lines(items, { color: fg, size, gap })}</div>
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.05, 27 + i)}
  `, bg);
}

/** 6 · STORY — 9:16. Stroke pinned to the LEFT margin; all type clear of it. */
function storyPost({ i, total, kicker, head, value, unit, sub, bg = BONE, fg = INK, accent = BRAND }) {
  const [w, h] = ST;
  const dark = bg !== BONE && bg !== CHALK;
  // The stroke was claiming 30% of the width and squeezing headlines into
  // three-line wraps. It now hugs the margin at ~18%, and the copy column
  // starts at 27% — wide enough for two lines at 112px.
  const col = Math.round(w * 0.27);

  return page(w, h, `
    ${stroke({ w, h, d: `M ${w * 0.10} ${h + 120} C ${w * 0.10} ${h * 0.76} ${w * 0.185} ${h * 0.72} ${w * 0.185} ${h * 0.46} S ${w * 0.185} ${h * 0.23} ${w * 0.105} ${h * 0.15}`, width: 72, color: accent })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:${h * 0.155}px;right:74px;left:${col}px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:${kicker ? 32 : 0}px;font-size:112px;color:${fg}">${head}</div>
    </div>
    <!-- Pushed to the lower third so the 9:16 canvas has no dead tail. -->
    <div style="position:absolute;bottom:300px;right:74px;left:${col}px;z-index:10">
      ${stat(value, unit, { size: 210, color: accent, dim: 0.6 })}
      ${sub ? `<div class="lede" style="margin-top:36px;font-size:34px;color:${fg};opacity:.62">${sub}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.055, 35 + i)}
  `, bg);
}

/** 7 · QUOTE — an oversized opening mark, set as a shape. */
function quotePost({ i, total, quote, who, bg = INK, fg = '#fff' }) {
  const [w, h] = PT;
  const dark = bg === INK || bg === BRAND;

  return page(w, h, `
    ${stroke({ w, h, d: `M-100 ${h * 0.90} C ${w * 0.34} ${h * 0.90} ${w * 0.32} ${h * 0.80} ${w * 0.70} ${h * 0.80} S ${w * 0.88} ${h * 0.785} ${w * 0.905} ${h * 0.782}`, width: 56, color: dark ? '#16233B' : BONE_D, dot: AMBER, dotR: 28 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:${h * 0.075}px;right:56px;z-index:5;
      font:700 420px/1 'Plex';color:${AMBER};opacity:.22">”</div>
    <div style="position:absolute;top:${h * 0.30}px;right:66px;left:66px;z-index:10">
      <div class="h" style="font-size:108px;color:${fg};max-width:900px">${quote}</div>
      <div style="margin-top:56px;display:flex;align-items:center;gap:20px;flex-direction:row-reverse">
        <span style="width:56px;height:4px;background:${AMBER}"></span>
        <span style="font:500 34px/1 'Plex';color:${fg};opacity:.66">${who}</span>
      </div>
    </div>
    ${foot(dark)}${grain(dark ? 0.075 : 0.055, 43 + i)}
  `, bg);
}

/** 8 · BAND TABLE — the tariff as typography on bleeding hairlines. */
function bandTable({ i, total, head, rows, bg = BONE, note = 'السعر ثابت لكل نطاق — ما بيتغيّر بالزحمة ولا بالوقت ولا بعدد الركّاب.' }) {
  const [w, h] = PT;
  const pad = rows.length > 5 ? 20 : 26;

  return page(w, h, `
    ${index(i, total)}
    <div style="position:absolute;top:100px;right:64px;left:64px;z-index:10">
      ${eyebrow('التعرفة المعلنة')}
      <div class="h" style="margin-top:30px;font-size:100px;color:${INK};max-width:820px">${head}</div>
    </div>
    <!-- Anchored to a measured band, not a magic fraction, so the headline's
         descenders can never reach row one and the note always has room. -->
    <div style="position:absolute;top:${h * 0.40}px;bottom:236px;right:64px;left:64px;z-index:10">
      ${rows.map((r, k) => `
        <div style="display:flex;align-items:baseline;justify-content:space-between;
          flex-direction:row-reverse;padding:${pad}px 0;
          ${k ? 'border-top:1px solid rgba(11,18,32,.13);' : ''}">
          <span style="font:700 40px/1 'Plex';color:${INK};min-width:210px">${r[0]}</span>
          <!-- The distance column MUST come through KM(). Passed as a bare
               string, "3–5 كم" renders as «5–3 كم»: the en-dash is bidi-neutral,
               so the two digit runs get laid out right-to-left and every band
               advertised its range backwards. See KM() in poster-kit. -->
          <span style="font:500 27px/1 'Plex';color:${INK};opacity:.48;flex:1;text-align:center">${r[1]}</span>
          <span class="num" style="font-size:58px;color:${k === 2 ? BRAND : INK};min-width:190px;text-align:left">${N(r[2])}</span>
        </div>`).join('')}
    </div>
    <div style="position:absolute;bottom:158px;right:64px;left:64px;z-index:10;
      font:500 28px/1.5 'Plex';color:${INK};opacity:.55;max-width:840px">${note}</div>
    ${foot(false)}${grain(0.05, 51 + i)}
  `, bg);
}

/**
 * 9 · SQUARE MARK — brand moment. The mark large, one line of type.
 *
 * BANDS (1080 square), non-overlapping:
 *    80 –  240  the mark
 *   380 –  500  the stroke, and nothing else
 *   580 – 1000  headline + sub
 * The first version put the stroke at 0.60–0.735h with the copy anchored at
 * `bottom:190` — so the amber dot landed ON the first letter of the headline.
 */
function brandPost({ i, total, head, sub, bg = BRAND, fg = '#fff' }) {
  const [w, h] = SQ;
  const strokeColor = bg === INK ? '#1B2A46' : 'rgba(255,255,255,.20)';

  return page(w, h, `
    ${stroke({ w, h, d: `M-100 ${h * 0.455} C ${w * 0.32} ${h * 0.455} ${w * 0.32} ${h * 0.375} ${w * 0.68} ${h * 0.375} S ${w * 0.86} ${h * 0.368} ${w * 0.885} ${h * 0.366}`, width: 58, color: strokeColor, dot: AMBER, dotR: 31 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:78px;right:60px;z-index:10">${mark(148, { path: fg, dot: AMBER, w: 9 })}</div>
    <div style="position:absolute;top:${h * 0.545}px;right:64px;left:64px;z-index:10">
      <div class="h" style="font-size:124px;color:${fg};max-width:900px">${head}</div>
      ${sub ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:34px;color:${fg};opacity:.8;max-width:860px">${sub}</div>` : ''}
    </div>
    ${foot(true)}${grain(0.075, 59 + i)}
  `, bg);
}

/**
 * 10 · CITY — Irbid's own rooftops as a band along the bottom edge.
 *
 * BANDS (1350 tall), and they do not overlap:
 *   118 –  560  copy (kicker · headline · lede)
 *   700 –  880  the stroke arcs through here, and nowhere else
 *  1020 – 1350  hills + skyline
 * The first version put the stroke at 0.36h — straight through the headline,
 * with the amber dot landing on a letter. That is the exact mistake this
 * system's one law exists to prevent, and I made it anyway.
 */
function cityPost({ i, total, kicker, head, lede, bg = BONE, fg = INK, accent = BRAND, seed = 7 }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    ${hills({ w, h: 260, color: accent, opacity: dark ? 0.2 : 0.13 })}
    ${skyline({ w, h: 330, color: dark ? '#FFFFFF' : INK, opacity: dark ? 0.16 : 0.2, seed })}
    ${stroke({ w, h, d: `M-120 ${h * 0.655} C ${w * 0.28} ${h * 0.655} ${w * 0.30} ${h * 0.545} ${w * 0.64} ${h * 0.545} S ${w * 0.86} ${h * 0.525} ${w * 0.895} ${h * 0.522}`, width: 74, color: accent })}
    ${index(i, total, { color: fg })}
    ${rail('IRBID · JORDAN', { color: fg, opacity: dark ? 0.34 : 0.3 })}
    <div style="position:absolute;top:112px;right:64px;left:64px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:32px;font-size:124px;color:${fg};max-width:900px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:33px;color:${fg};opacity:.66;max-width:780px">${lede}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.06, 67 + i)}
  `, bg);
}

/**
 * 11 · VEHICLE — the car, with its four seats visible.
 *
 * BANDS (1350 tall):
 *   112 –  430  copy
 *   560 –  830  the car, sitting ON the road
 *   840 –  870  the stroke — the road under the wheels, and NOTHING else here
 *   940 – 1150  the number
 * The first version put the stroke at 0.70h and the number at bottom:210 —
 * so the road ran straight through «5.100» and the numeral also ran off the
 * left edge. A destroyed number is worse than no number.
 */
function carPost({ i, total, kicker, head, value, unit, note, bg = BONE, fg = INK, accent = BRAND, seats = 4 }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    <!-- A near-flat road so the car reads as standing on it, not climbing it. -->
    ${stroke({ w, h, d: `M-120 ${h * 0.645} C ${w * 0.30} ${h * 0.645} ${w * 0.34} ${h * 0.625} ${w * 0.68} ${h * 0.625} S ${w * 0.88} ${h * 0.622} ${w * 0.915} ${h * 0.621}`, width: 58, color: accent })}
    ${index(i, total, { color: fg })}
    ${rail('FOUR SEATS, ONE CAR', { color: fg, opacity: dark ? 0.34 : 0.3 })}
    <div style="position:absolute;top:112px;right:64px;left:64px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:32px;font-size:120px;color:${fg};max-width:870px">${head}</div>
    </div>
    <!-- Centred, wheels resting on the stroke. -->
    <div style="position:absolute;top:${Math.round(h * 0.645) - 214}px;left:50%;transform:translateX(-50%);z-index:12">
      ${car({ w: 620, color: dark ? '#FFFFFF' : INK, opacity: dark ? 0.94 : 0.9, seats })}
    </div>
    <div style="position:absolute;top:${h * 0.715}px;right:64px;left:64px;z-index:10">
      ${stat(value, unit, { size: 168, color: dark ? '#fff' : accent, dim: 0.58 })}
      ${note ? `<div style="margin-top:20px;font:700 30px/1 'Plex';color:${dark ? AMBER : BRAND_D}">${note}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.055, 75 + i)}
  `, bg);
}

/**
 * 12 · GATE — the destination. A bigger arch filling the lower third.
 *
 * BANDS (1350 tall):
 *   124 –  640  copy
 *   735 –  940  the stroke descends toward the opening, dot INSIDE it
 *   790 – 1350  the arch
 * The arch was 620 wide and left a dead band at 650–800; at 780 it starts
 * higher, so the canvas has no empty middle.
 */
function gatePost({ i, total, kicker, head, lede, bg = BRAND, fg = '#fff' }) {
  const [w, h] = PT;

  return page(w, h, `
    <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);z-index:2">
      ${gate({ w: 780, color: '#FFFFFF', opacity: 0.14 })}
    </div>
    ${stroke({ w, h, d: `M-110 ${h * 0.545} C ${w * 0.26} ${h * 0.545} ${w * 0.34} ${h * 0.585} ${w * 0.50} ${h * 0.625} S ${w * 0.50} ${h * 0.665} ${w * 0.50} ${h * 0.70}`, width: 56, color: 'rgba(255,255,255,.22)', dot: AMBER, dotR: 31 })}
    ${index(i, total, { color: fg })}
    ${rail('TO THE GATE', { color: fg, opacity: 0.34 })}
    <div style="position:absolute;top:124px;right:64px;left:64px;z-index:10">
      ${kicker ? eyebrow(kicker, AMBER) : ''}
      <div class="h" style="margin-top:32px;font-size:130px;color:${fg};max-width:900px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:34px;font-size:34px;color:${fg};opacity:.82;max-width:800px">${lede}</div>` : ''}
    </div>
    ${foot(true)}${grain(0.075, 83 + i)}
  `, bg);
}

/**
 * 15 · RUIN — Umm Qais, and it is in Irbid governorate.
 *
 * ── Why a specific ruin and not a generic skyline ──────────────────────────
 *
 * `cityPost` draws rooftops with a minaret and a dome, which says "somewhere in
 * the Arab world". The Decapolis colonnade at Umm Qais says IRBID, to anyone from
 * the north — it is twenty minutes from Yarmouk University and every student there
 * has been on a school trip to it. Place is only worth drawing if it is
 * recognisable enough to be a claim.
 *
 * The colonnade recedes to the LEFT, which is the reading direction's exit in
 * Arabic, so the eye leaves the headline and travels down the columns rather than
 * fighting back against them.
 *
 * BANDS (1350 tall):
 *   116 –  520  copy
 *   660 –  810  the stroke, alone
 *   980 – 1350  the colonnade
 */
function ruinPost({ i, total, kicker, head, lede, bg = BONE, fg = INK, accent = BRAND }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    ${hills({ w, h: 300, color: accent, opacity: dark ? 0.16 : 0.1 })}
    ${columns({ w, h: 370, color: dark ? '#FFFFFF' : INK, opacity: dark ? 0.17 : 0.19, n: 9 })}
    ${stroke({ w, h, d: `M-120 ${h * 0.60} C ${w * 0.28} ${h * 0.60} ${w * 0.30} ${h * 0.505} ${w * 0.64} ${h * 0.505} S ${w * 0.86} ${h * 0.492} ${w * 0.895} ${h * 0.49}`, width: 70, color: accent })}
    ${index(i, total, { color: fg })}
    ${rail('UMM QAIS · IRBID', { color: fg, opacity: dark ? 0.34 : 0.3 })}
    <div style="position:absolute;top:116px;right:64px;left:64px;z-index:10">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:32px;font-size:120px;color:${fg};max-width:900px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:33px;color:${fg};opacity:.66;max-width:780px">${lede}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.06, 91 + i)}
  `, bg);
}

/**
 * 16 · FORTRESS — Ajloun Castle on the ridge west of Irbid.
 *
 * A single mass on the right, standing on its own rock, with the copy given the
 * whole left field. The asymmetry is the point: a castle centred on a poster is a
 * tourism advert, and a castle pushed to one edge is a horizon.
 *
 * BANDS (1350 tall):
 *   120 –  600  copy (kept narrow, so it never reaches the castle)
 *   620 –  980  the castle mass, right, bleeding off that edge
 *  1040 – 1180  the stroke, below it, alone
 *
 * The stroke ENDS at 0.20w, not 0.06w. Terminating it further left put the amber
 * dot on top of the rotated Latin rail at `left:44` — a 31px-radius disc centred
 * at x=65 covers x=34–96, and the rail sits at 44–70. The law is about the stroke
 * and the TYPE, and the rail is type; it being rotated does not exempt it.
 */
function fortressPost({ i, total, kicker, head, lede, bg = INK, fg = '#fff', accent = BRAND_L }) {
  const [w, h] = PT;

  return page(w, h, `
    ${hills({ w, h: 340, color: accent, opacity: 0.13 })}
    <!-- Large and light enough to read as a horizon. At 520px/0.17 on an ink
         field it was a grey smudge, which is worse than no landmark: it costs the
         same attention and delivers no recognition. -->
    <div style="position:absolute;top:${h * 0.44}px;right:-70px;z-index:3">
      ${castle({ w: 720, color: '#FFFFFF', opacity: 0.26 })}
    </div>
    ${stroke({ w, h, d: `M ${w + 110} ${h * 0.79} C ${w * 0.70} ${h * 0.79} ${w * 0.66} ${h * 0.845} ${w * 0.34} ${h * 0.845} S ${w * 0.24} ${h * 0.858} ${w * 0.20} ${h * 0.861}`, width: 58, color: accent, dot: AMBER, dotR: 31 })}
    ${index(i, total, { color: fg })}
    ${rail('AJLOUN · NORTH JORDAN', { color: fg, opacity: 0.32 })}
    <div style="position:absolute;top:120px;right:64px;left:64px;z-index:10">
      ${kicker ? eyebrow(kicker, AMBER) : ''}
      <div class="h" style="margin-top:32px;font-size:122px;color:${fg};max-width:860px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:33px;color:${fg};opacity:.76;max-width:700px">${lede}</div>` : ''}
    </div>
    ${foot(true)}${grain(0.075, 97 + i)}
  `, bg);
}

/**
 * 17 · ROOFTOP — water tanks at poster scale.
 *
 * `skyline()` renders these as 13px texture. Here the same object is the subject,
 * because it is the detail that cannot be mistaken for anywhere else: no stock
 * skyline has three mismatched drums, a tilted solar collector and a dish on
 * every roof. Cropped hard off the left edge so it reads as a fragment of a real
 * roof rather than an illustration of one.
 *
 * BANDS (1080 square):
 *    92 –  500  copy — headline MUST fit two lines at 100px (see below)
 *   590 –  660  the stroke, alone
 *   700 – 1080  the roof, bleeding off the left and bottom
 *
 * The first draft took a headline long enough to wrap to THREE lines, which
 * pushed the lede down into the stroke's band — so the route ran through the lede
 * and the amber dot landed on a word. I wrote the law at the top of this file and
 * then broke it in the first archetype I added afterwards.
 *
 * The real lesson is that a band declared in a comment is not enforced by
 * anything: a headline three words longer silently invalidates it. So the copy
 * block now has a HARD max-height with the stroke starting below it, and the
 * headline is short enough to fit. Overrun clips instead of colliding — visible
 * in review, rather than shipping as an overlap.
 */
function rooftopPost({ i, total, kicker, head, lede, bg = BONE, fg = INK, accent = BRAND }) {
  const [w, h] = SQ;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    <!-- Bleeds off BOTH side edges and the bottom: a fragment of a roof, not a
         picture of one. 1180 wide on a 1080 canvas is the point. -->
    <div style="position:absolute;bottom:-26px;left:-58px;z-index:3">
      ${rooftop({ w: 1180, color: dark ? '#FFFFFF' : INK, opacity: dark ? 0.16 : 0.17 })}
    </div>
    ${stroke({ w, h, d: `M-110 ${h * 0.605} C ${w * 0.30} ${h * 0.605} ${w * 0.32} ${h * 0.565} ${w * 0.66} ${h * 0.565} S ${w * 0.88} ${h * 0.558} ${w * 0.905} ${h * 0.556}`, width: 56, color: accent, dot: AMBER, dotR: 30 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:92px;right:60px;left:60px;z-index:10;
      max-height:408px;overflow:hidden">
      ${kicker ? eyebrow(kicker, dark ? AMBER : BRAND) : ''}
      <div class="h" style="margin-top:30px;font-size:100px;color:${fg};max-width:840px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:${LEDE_GAP}px;font-size:31px;color:${fg};opacity:.64;max-width:660px">${lede}</div>` : ''}
    </div>
    ${foot(dark)}${grain(dark ? 0.07 : 0.06, 103 + i)}
  `, bg);
}

/**
 * 18 · TWO VEHICLES — the minibus above, the car below, at the same scale.
 *
 * The comparison posters made their case with numbers alone. This one makes it
 * with shapes: the blunt box that stops at the depot, and the saloon that stops
 * at the door. Both drawn at one scale on two roads, so the difference the reader
 * sees first is the object, not the caption.
 *
 * BANDS (1350 tall), five strict lanes and NOTHING crosses one:
 *    96 –  300  copy — two lines at 92px, hard-capped
 *   344 –  602  the bus, wheels on its road at 0.40h (540)
 *   684 –  940  the car, wheels on its road at 0.665h (898)
 *   985 – 1180  the two labels + note
 *  1218 – 1350  the imprint
 *
 * The first draft got this wrong at BOTH ends. A three-line headline ran down into
 * the bus, and the label block — anchored from the top at 0.775h — grew past the
 * footer so the wordmark printed on top of the note. Anchoring a growing block by
 * its top and the footer by its bottom means the two meet somewhere unpredictable,
 * which is a layout that works until the copy changes.
 *
 * So the label block is anchored by its BOTTOM (clear of the imprint) and the copy
 * is capped. Both roads also moved up to make the room this actually needs.
 */
function twoVehiclePost({ i, total, kicker, head, busLabel, carLabel, note, bg = CHALK, fg = INK }) {
  const [w, h] = PT;

  return page(w, h, `
    ${stroke({ w, h, d: `M-120 ${h * 0.404} C ${w * 0.34} ${h * 0.404} ${w * 0.40} ${h * 0.398} ${w * 0.74} ${h * 0.398} S ${w * 0.92} ${h * 0.397} ${w * 0.95} ${h * 0.397}`, width: 44, color: 'rgba(11,18,32,.18)', dotAt: null })}
    ${stroke({ w, h, d: `M-120 ${h * 0.669} C ${w * 0.34} ${h * 0.669} ${w * 0.40} ${h * 0.663} ${w * 0.74} ${h * 0.663} S ${w * 0.92} ${h * 0.662} ${w * 0.95} ${h * 0.662}`, width: 52, color: BRAND, dot: AMBER, dotR: 30 })}
    ${index(i, total, { color: fg })}
    ${rail('DEPOT vs DOOR', { color: fg, opacity: 0.3 })}
    <div style="position:absolute;top:96px;right:64px;left:64px;z-index:10;
      max-height:214px;overflow:hidden">
      ${kicker ? eyebrow(kicker, BRAND) : ''}
      <div class="h" style="margin-top:26px;font-size:92px;color:${fg};max-width:880px">${head}</div>
    </div>
    <!-- Each vehicle's wheels rest ON its own road: the bus offset by its 38px
         wheel radius plus body height, the car by its 42px. -->
    <div style="position:absolute;top:${Math.round(h * 0.404) - 196}px;left:52%;transform:translateX(-50%);z-index:12">
      ${bus({ w: 500, color: INK, opacity: 0.30 })}
    </div>
    <div style="position:absolute;top:${Math.round(h * 0.669) - 214}px;left:48%;transform:translateX(-50%);z-index:12">
      ${car({ w: 600, color: INK, opacity: 0.92, seats: 4 })}
    </div>
    <!-- Anchored from the BOTTOM so it can never grow into the imprint. -->
    <div style="position:absolute;bottom:170px;right:64px;left:64px;z-index:14">
      <div style="font:500 30px/1.4 'Plex';color:${fg};opacity:.44">${busLabel}</div>
      <div style="margin-top:16px;font:700 35px/1.35 'Plex';color:${BRAND}">${carLabel}</div>
      ${note ? `<div style="margin-top:26px;font:500 28px/1.5 'Plex';color:${fg};opacity:.56;max-width:820px">${note}</div>` : ''}
    </div>
    ${foot(false)}${grain(0.055, 109 + i)}
  `, bg);
}

/* ═════════════════════════ THE POSTS ══════════════════════════════════════ */

const T = 62;
const P = [];
const add = (name, html, size, caption) => P.push({ name, html, size, caption });

/* ── الطالب · السعر والقيمة (١–١٠) ─────────────────────────────────────── */
add('01-seat-price', numberWall({
  i: 1, total: T, value: '1.500', unit: 'دينار · للمقعد',
  head: 'من حيّك لباب الجامعة',
  lede: 'سعر معلن قبل ما تطلب — ما بيزيد بالزحمة ولا بعدد الركّاب.',
}), PT, `مقعدك من حيّك لباب الجامعة بـ 1.500 د.أ.\n\nمو تسعير لحظي. مو مضاعف زحمة. سعر النطاق معلن قبل ما تطلب، وهو نفسه كل يوم.\n\n#رفيق #الأردن #جامعة_اليرموك #إربد #نقل_جامعي`);

add('02-monthly-math', numberWall({
  i: 2, total: T, value: '48', unit: 'دينار · 40 رحلة',
  head: 'شهرك محسوب من قبل',
  lede: 'خصم 20% على سعر نطاقك. الخطّة مربوطة بخطّك، فما حد يدفع أكثر من سعره العادي.',
}), PT, `40 رحلة بـ 48 د.أ للنطاق المتوسط — 1.200 للرحلة بدل 1.500.\n\nوسعر الخطّة محسوب من نطاقك أنت، لا رقم واحد للجميع. يعني ما في طالب يشترك ويدفع أكثر من السعر العادي.\n\n#رفيق #اشتراك_شهري #طلاب_الأردن`);

add('03-vs-taxi', versus({
  i: 3, total: T, head: 'نفس الطريق. نص الحساب.',
  badLabel: 'تكسي منفرد', bad: '3.500', goodLabel: 'مقعدك برفيق', good: '1.500',
  note: 'باب لباب، بلا تبديل مركبة وبلا انتظار باص.',
}), PT, `التكسي المنفرد ~3.500. مقعدك برفيق 1.500 — نفس الطريق، باب لباب.\n\nالفرق إنك بتدفع مقعد، لا رحلة كاملة.\n\n#رفيق #إربد #توفير`);

add('04-vs-bus', versus({
  i: 4, total: T, head: 'الباص أرخص. وأغلى.',
  badLabel: 'باص + تكسي للمجمّع', bad: '2.000', goodLabel: 'مقعدك برفيق', good: '1.500',
  note: 'الباص بيوقّفك عند المجمّع. رفيق بيوصّلك للبوابة — بلا مشي وبلا انتظار.',
}), PT, `الباص 0.350، بس بيلزمك تكسي للمجمّع ووقت انتظار مفتوح. المجموع ~2.000 ووصول غير مضمون.\n\nرفيق 1.500 من باب بيتك لبوابة جامعتك.\n\n#رفيق #نقل_جامعي #إربد`);

add('05-fixed-price', statement({
  i: 5, total: T, kicker: 'وعد لا حساب',
  head: 'السعر ما بيتغيّر',
  lede: 'لا مضاعف زحمة. لا تعرفة ليلية. لا تسعير بالدقيقة. سعر نطاقك معلن، وهو نفسه الصبح والمساء.',
}), PT, `في تطبيقات النقل، السعر بيطلع لما تحتاجه أكثر.\n\nبرفيق السعر بيانات معلنة، مو خوارزمية. سعر النطاق ثابت — الصبح، بالمساء، بالامتحانات.\n\n#رفيق #سعر_ثابت`);

add('06-bands', bandTable({
  i: 6, total: T, head: 'ستّة نطاقات. سعر لكل واحد.',
  rows: [
    ['نطاق A', `حتى ${KM('3')}`, '1.000'],
    ['نطاق B', KM('3–5'), '1.250'],
    ['نطاق C', KM('5–7'), '1.500'],
    ['نطاق D', KM('7–10'), '1.750'],
    ['نطاق E', KM('10–14'), '2.000'],
    ['نطاق F', `أكثر من ${KM('14')}`, '2.250'],
  ],
}), PT, `التعرفة كاملة، معلنة:\n\nA حتى 3كم — 1.000\nB 3–5كم — 1.250\nC 5–7كم — 1.500\nD 7–10كم — 1.750\nE 10–14كم — 2.000\nF فوق 14كم — 2.250\n\nدوّر على نطاقك واحسب شهرك من هلق.\n\n#رفيق #التعرفة`);

add('07-door-to-door', gatePost({
  i: 7, total: T, kicker: 'باب لباب', head: 'ما في مشي',
  lede: 'من عند بيتك، لبوابة جامعتك. بلا مجمّع، بلا تبديل، بلا وقوف تحت الشمس.',
}), PT, `أسوأ جزء من يومك مو الأجرة — المشي من المجمّع للبوابة.\n\nرفيق بيوصّلك للبوابة.\n\n#رفيق #طلاب #إربد`);

add('08-return-trip', statement({
  i: 8, total: T, kicker: 'العودة', head: 'رجعتك محجوزة لحالها',
  lede: 'ما بنطلب منك تحدّد وقت عودتك قبل ما تعرف إيمتى تخلص محاضرتك الأخيرة. اطلب رجعتك لحالها.',
  bg: BRAND_D,
}), PT, `ليش ما بنحزم الذهاب مع العودة؟\n\nلأنك ما بتعرف إيمتى تخلص آخر محاضرة. تحزيمها معناه إنك تلتزم بوقت ما تعرفه، وتخلّف عن المقعد.\n\nالعودة تُطلب لحالها، وبنجمّع العائدين من رحلات مختلفة.\n\n#رفيق`);

add('09-solo', numberWall({
  i: 9, total: T, value: '5.250', unit: 'دينار · المركبة كاملة',
  head: 'بدك تنطلق هلق؟',
  lede: 'خُذ المقاعد الأربعة. سعر معروف، بلا انتظار تجميع — والخيار خيارك.',
}), PT, `مستعجل؟ خُذ المركبة كاملة بـ 5.250 للنطاق المتوسط.\n\nالمنفردة مو عقوبة — هي منتج بسعر معلن، بتختاره وأنت عارف.\n\n#رفيق #رحلة_منفردة`);

add('10-no-surprise', quotePost({
  i: 10, total: T,
  quote: 'أول مرّة أعرف حساب رحلتي قبل ما أطلبها',
  who: 'طالبة · جامعة اليرموك',
}), PT, `«أول مرّة أعرف حساب رحلتي قبل ما أطلبها.»\n\nهاض المقصود بالسعر المعلن.\n\n#رفيق #تجربة_طلاب`);

/* ── الثقة والسلامة (١١–١٨) ────────────────────────────────────────────── */
add('11-verified-captain', listPost({
  i: 11, total: T, kicker: 'قبل أول رحلة', head: 'كل كابتن مفحوص',
  items: [
    'رخصة سارية · وترخيص مركبة ساري',
    'تأمين فعّال، والمركبة مش أقدم من 7 سنين',
    'هويّة موثَّقة ومراجَعة يدوياً — لا اعتماد آلي',
    'تقييم ظاهر لكل راكب بعد كل رحلة',
  ],
}), PT, `ما في كابتن يشتغل قبل ما يمرّ من هاي الأربعة.\n\nالوثائق تُراجَع يدوياً، والمرفوضة تُحذف من عندنا بعد 30 يوم — ما نحتفظ بهويّة ما لها سبب.\n\n#رفيق #سلامة`);

add('12-boarding-code', numberWall({
  i: 12, total: T, value: '٤', unit: 'أرقام · كود الصعود',
  head: 'ما بتركب غلط',
  lede: 'كود قصير تقوله للكابتن. لا التباس بالمركبة، ولا صعود براكب غير صاحب المقعد.',
  accent: BRAND,
}), PT, `كود صعود من 4 أرقام — قصير عشان ما تتوه، ومحدود المحاولات عشان ما ينحلّ بالتخمين.\n\nنفس الشي عند النزول.\n\n#رفيق #سلامة`);

add('13-live-tracking', statement({
  i: 13, total: T, kicker: 'أثناء الرحلة', head: 'أهلك شايفينك',
  lede: 'رابط تتبّع حيّ تشاركه مع مين بدّك. وبنحذف مسار الرحلة بعد 30 يوم — نافذة النزاع، وبعدها ما له غرض.',
  bg: INK,
}), PT, `التتبّع الحيّ إلك ولأهلك.\n\nوبنحذفه بعد 30 يوم. تاريخ تحرّكاتك ما إلنا فيه مصلحة بعد ما تنتهي نافذة النزاع.\n\n#رفيق #خصوصية`);

add('14-sos', statement({
  i: 14, total: T, kicker: 'زرّ الطوارئ', head: 'ضغطة واحدة',
  lede: 'بيوصل لفريق السلامة وبيوصل لجهات اتصالك — بلا ما ينشر اسمك على قائمة موظّفين.',
  bg: '#7A1410', fg: '#fff',
}), PT, `زرّ الطوارئ بيشتغل بضغطة، وبيوصل للفريق ولجهات اتصالك مع رابط موقعك.\n\nوبلا اسمك: التنبيه للموظّفين برقم مرجع فقط. اللي بيحتاج يعرف مين، بيفتح مركز السلامة الموثَّق.\n\n#رفيق #طوارئ`);

add('15-predictable', cityPost({
  i: 15, total: T, kicker: 'لأنّ الجدول متوقَّع', head: 'نفس الوجوه كل صبح',
  lede: 'رحلتك مع طلاب من حيّك ومن جامعتك. مو غرباء من كل مكان.',
  seed: 11,
}), PT, `التجميع مو بس أرخص — هو أأمن.\n\nرحلتك مع طلاب من نفس منطقتك ونفس جامعتك، بجدول متوقَّع، بمركبة مرخَّصة وكابتن موثَّق.\n\n#رفيق #سلامة_الطالبات`);

add('16-no-phone', statement({
  i: 16, total: T, kicker: 'خصوصية', head: 'رقمك مو معروض',
  lede: 'موظّف الدعم بيشوف آخر رقمين فقط. الكشف الكامل بيحتاج صلاحية منفصلة، وكل كشف مُسجَّل.',
  bg: BRAND,
}), PT, `مين بيشوف رقمك؟ حرفياً: مو الدعم.\n\nالدعم بيشوف +962·······67 — بكفّي إنه يتأكّد من رقم بيتلوه عليه، وما بكفّي إنه يبني منه قائمة.\n\n#رفيق #خصوصية`);

add('17-encrypted', statement({
  i: 17, total: T, kicker: 'على القرص', head: 'اسمك مشفَّر',
  lede: 'الاسم والرقم والبريد والعنوان — كلّها مشفَّرة بقاعدة البيانات. نسخة مسروقة بلا المفتاح ما فيها ولا اسم مقروء.',
  bg: INK,
}), PT, `شفّرنا اسمك ورقمك وبريدك وعنوان بيتك ورقمك الوطني وجهات اتصال الطوارئ — كلّها.\n\nالخطر مو مخترق التطبيق، الخطر نسخة قاعدة بيانات تخرج بلا مفتاح. قبل هيك كانت قائمة تواصل جاهزة. هلق ما فيها ولا اسم.\n\n#رفيق #أمان_البيانات`);

add('18-rating', storyPost({
  i: 18, total: T, kicker: 'بعد كل رحلة', head: 'تقييمك بيوصل',
  value: '4.9', unit: 'متوسّط الكباتن', sub: 'وكل شكوى بتفتح ملف، مو بس رسالة.',
}), ST, `تقييمك بعد كل رحلة بيروح لملف الكابتن، والشكوى الحرجة بتفتح ملف تحقيق فوراً.\n\n#رفيق`);

/* ── الكابتن (١٩–٢٦) ───────────────────────────────────────────────────── */
add('19-four-seats', carPost({
  i: 19, total: T, kicker: 'للكابتن', head: 'أربع مقاعد مش مقعد',
  value: '5.100', unit: 'صافي الرحلة الممتلئة', note: '×٤ مقاعد · نطاق C',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), PT, `الرحلة الفاضية خسارة. الرحلة الممتلئة 5.100 صافي.\n\nرفيق بيجمّعلك أربع مقاعد على نفس الطريق — مو بيرسلك على راكب واحد.\n\n#رفيق #كباتن #فرصة_عمل`);

add('20-weekly-payout', splitField({
  i: 20, total: T, kicker: 'أرباحك', head: 'السحب أسبوعي على CliQ',
  value: '7', unit: 'أيام · بحدّ أدنى معلن', note: 'بلا وسيط وبلا تأخير',
  top: BRAND_D,
}), PT, `أرباحك بتوصلك أسبوعياً على CliQ، بحدّ أدنى معلن مسبقاً.\n\nوكل حركة بمحفظتك لها قيد — بتشوف من وين جاي كل قرش.\n\n#رفيق #كباتن`);

add('21-cash', splitField({
  i: 21, total: T, kicker: 'جديد', head: 'تقبض نقداً كذلك',
  value: '15', unit: '٪ عمولة فقط', note: 'والعمولة تتسوّى من رصيدك تلقائياً',
  top: '#0F3A8C',
}), PT, `صار فيك تقبض نقداً من الراكب.\n\nالأجرة تُسجَّل بسعر النطاق المعلن — الكابتن بيقبض الورق، مو بيحدّد السعر. والعمولة تتخصم من رصيدك، وإذا ما كفى تتسوّى من أرباحك الجاية تلقائياً.\n\n#رفيق #كباتن #دفع_نقدي`);

add('22-requirements', listPost({
  i: 22, total: T, kicker: 'للتسجيل', head: 'أربع ورقات وبتبدأ',
  items: [
    'رخصة سواقة سارية',
    'ترخيص مركبة ساري',
    'تأمين فعّال',
    'مركبة مش أقدم من 7 سنين',
  ],
  bg: INK, fg: '#fff',
}), PT, `التسجيل ككابتن: رخصة، ترخيص، تأمين، ومركبة مش أقدم من 7 سنين.\n\nالمراجعة يدوية وبتاخد وقتها — لأنّ اللي جوّا المركبة طلاب.\n\n#رفيق #كباتن #وظائف_الأردن`);

add('23-no-empty-return', statement({
  i: 23, total: T, kicker: 'العودة', head: 'ما ترجع فاضي',
  lede: 'بنجمّعلك ركّاب العودة من الجامعة للأحياء. نفس الطريق، مرّتين.',
  bg: INK,
}), PT, `الرجعة الفاضية هي أكبر خسارة بيوم الكابتن.\n\nرفيق بيجمّع العائدين من الجامعة — ومو بس ركّابك، أي عائد على نفس الاتجاه.\n\n#رفيق #كباتن`);

add('24-commission', numberWall({
  i: 24, total: T, value: '15', unit: '٪ عمولة · معلنة',
  head: 'بتعرف حصّتك قبل ما تقبل',
  lede: 'العمولة رقم واحد معلن، بلا بنود مخفية وبلا خصومات مفاجئة.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), PT, `العمولة 15٪. رقم واحد، معلن، وبتشوف صافيك قبل ما تقبل الرحلة.\n\nما في «رسوم خدمة» ولا «رسوم منصّة» ولا بنود تظهر بعدين.\n\n#رفيق #كباتن`);

add('25-guarantee', splitField({
  i: 25, total: T, kicker: 'شبكة أمان', head: 'ضمان حدّ أدنى للرحلة',
  value: '3.500', unit: 'حدّ أدنى مضمون', note: 'مدفوع من عمولتنا — لا من جيب الطالب',
  top: '#0E7A5F',
}), PT, `إذا انتهت نافذة التجميع وما اكتملت المقاعد، بنضمنلك 3.500 للرحلة.\n\nوبندفعها من عمولتنا، مو بنزيدها على الطالب. لأنّ تغطية عجز الامتلاء من جيب الراكب بتكسر وعد السعر الثابت.\n\n#رفيق #كباتن`);

add('26-join', brandPost({
  i: 26, total: T, head: 'سجّل ككابتن',
  sub: 'المراجعة يدوية · السحب أسبوعي · العمولة 15٪ معلنة',
  bg: INK,
}), SQ, `بتملك مركبة وبتشتغل على خط الجامعة؟\n\nسجّل ككابتن برفيق. أربع مقاعد بدل مقعد، سحب أسبوعي على CliQ، وعمولة معلنة.\n\nالرابط بالبايو.\n\n#رفيق #كباتن #وظائف_الأردن #إربد`);

/* ── كيف بيشتغل (٢٧–٣٢) ────────────────────────────────────────────────── */
add('27-how-1', storyPost({
  i: 27, total: T, kicker: 'الخطوة الأولى', head: 'حدّد جامعتك وحيّك',
  value: '٠١', unit: 'من أربع خطوات', sub: 'مرّة واحدة، وبتنحفظ لكل رحلاتك.',
}), ST, `الخطوة 1: حدّد جامعتك وحيّك. مرّة واحدة.\n\n#رفيق #كيف_بيشتغل`);

add('28-how-2', storyPost({
  i: 28, total: T, kicker: 'الخطوة الثانية', head: 'شوف السعر قبل ما تطلب',
  value: '٠٢', unit: 'من أربع خطوات', sub: 'سعر نطاقك ظاهر — مو تقدير ولا نطاق مفتوح.',
  accent: BRAND_D,
}), ST, `الخطوة 2: السعر بيظهرلك قبل ما تطلب. رقم واحد، مو «من … إلى».\n\n#رفيق`);

add('29-how-3', storyPost({
  i: 29, total: T, kicker: 'الخطوة الثالثة', head: 'بنجمّعك مع اللي على طريقك',
  value: '٠٣', unit: 'من أربع خطوات', sub: 'نافذة قصيرة، وبعدها المركبة تنطلق.',
}), ST, `الخطوة 3: بنجمّعك مع طلاب من حيّك ونفس جامعتك — نافذة 8 دقايق بالذروة.\n\nوالمركبة الممتلئة تنطلق فوراً، ما تنتظر حد.\n\n#رفيق`);

add('30-how-4', storyPost({
  i: 30, total: T, kicker: 'الخطوة الرابعة', head: 'كود، وبتركب',
  value: '٠٤', unit: 'من أربع خطوات', sub: 'أربع أرقام بينك وبين الكابتن.',
  accent: BRAND,
}), ST, `الخطوة 4: تقول كود الصعود، وبتركب. وكود ثاني عند النزول.\n\n#رفيق`);

add('31-window-why', statement({
  i: 31, total: T, kicker: 'ليش بنجمّع', head: '٨ دقايق بتوفّرلك نصّ الحساب',
  lede: 'التجميع هو اللي بيخلّي المقعد 1.500 بدل 3.500. وما بنأخّر مركبة اكتملت مقاعدها ولا دقيقة.',
  bg: BONE, fg: INK,
}), PT, `ليش نافذة تجميع؟\n\nلأنّ رحلة بمقعدين ما بتجدي الكابتن، وتغطية العجز من جيب الطالب بتكسر وعد السعر الثابت. فبنجمّع أول، وبعدين بنرسل.\n\n8 دقايق بالذروة، 18 خارجها. والمركبة الممتلئة تنطلق فوراً.\n\n#رفيق`);

add('32-coverage', listPost({
  i: 32, total: T, kicker: 'التغطية', head: 'بلّشنا من إربد',
  bg: BONE,
  items: [
    'جامعة اليرموك · وجامعة العلوم والتكنولوجيا',
    'أحياء إربد — والقائمة بتكبر كل أسبوع',
    'الرحلة العكسية من الجامعة للأحياء',
    'حيّك مو موجود؟ بعتلنا اسمه',
  ],
}), PT, `بلّشنا من إربد: اليرموك و«العلوم والتكنولوجيا».\n\nحيّك مو بالقائمة؟ اكتبه بالتعليقات — بنفتح المناطق حسب الطلب الحقيقي، مو حسب الخريطة.\n\n#رفيق #إربد #اليرموك #JUST`);

/* ── أسئلة (٣٣–٣٨) ─────────────────────────────────────────────────────── */
const faq = [
  ['إذا ما اكتملت المقاعد؟', 'المركبة تنطلق برضو. السعر ما بيتغيّر — الفرق بنغطّيه من عمولتنا، مو من جيبك.'],
  ['بقدر أختار مين معي؟', 'بنجمّعك مع طلاب من حيّك ونفس جامعتك. وإذا بدّك المركبة لحالك، خُذ المقاعد الأربعة بسعر معلن.'],
  ['كيف أدفع؟', 'محفظة داخل التطبيق بتشحنها بـ CliQ، أو نقداً للكابتن بنفس السعر المعلن.'],
  ['إذا تأخّر الكابتن؟', 'التتبّع الحيّ بيوريك وين هو. وإذا صار خلاف، مسار الرحلة والكود محفوظين 30 يوم كدليل.'],
  ['بقدر ألغي؟', 'قبل الصعود آه. بعد ما تركب، «مشكلة بالرحلة» بتفتح ملف — مو إلغاء صامت.'],
  ['بيانياتي وين تروح؟', 'مشفَّرة على القرص، وما نبيعها. وكل مدّة احتفاظ منشورة ومفروضة بالكود — لا بوثيقة.'],
];
faq.forEach(([q, a], k) => add(`${33 + k}-faq-${k + 1}`, quotePost({
  i: 33 + k, total: T, quote: q, who: a,
  bg: k % 2 ? BONE : INK, fg: k % 2 ? INK : '#fff',
}), PT, `${q}\n\n${a}\n\n#رفيق #أسئلة`));

/* ── ستوريز (٣٩–٤٦) ───────────────────────────────────────────────────── */
add('39-story-price', storyPost({
  i: 39, total: T, kicker: 'المقعد', head: 'تدفع مقعداً، لا رحلة',
  value: '1.500', unit: 'دينار', sub: 'بدل 5.250 للمركبة كاملة.',
}), ST, `تدفع مقعداً، لا رحلة.\n\n#رفيق`);

add('40-story-saving', storyPost({
  i: 40, total: T, kicker: 'شهرياً', head: 'وفّر أكثر من نصّ حسابك',
  value: '22', unit: 'دينار · شهرياً', sub: '40 رحلة: 48 بالخطّة بدل 70 بالتكسي.',
  accent: BRAND_D,
}), ST, `40 رحلة بالتكسي ~70 د.أ. بخطّة رفيق 48.\n\n#رفيق #توفير`);

add('41-story-seats', storyPost({
  i: 41, total: T, kicker: 'للكابتن', head: 'أربع مقاعد بكل رحلة',
  value: '5.100', unit: 'صافي الرحلة', sub: 'مو راكب واحد على طريق طويل.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), ST, `أربع مقاعد بكل رحلة، 5.100 صافي.\n\n#رفيق #كباتن`);

add('42-story-code', storyPost({
  i: 42, total: T, kicker: 'كود الصعود', head: 'أربع أرقام وبتركب',
  value: '٤', unit: 'أرقام', sub: 'قصير عشان ما تتوه — ومحدود المحاولات عشان ما ينحلّ بالتخمين.',
}), ST, `كود صعود من 4 أرقام.\n\n#رفيق #سلامة`);

add('43-story-privacy', storyPost({
  i: 43, total: T, kicker: 'خصوصية', head: 'ما بنحتفظ باللي ما بنحتاجه',
  value: '30', unit: 'يوم · مسار الرحلة', sub: 'وبعدها بيُحذف. نافذة النزاع خلصت، فما له غرض.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), ST, `مسار رحلتك بيُحذف بعد 30 يوم. موقع الكابتن خارج الرحلة بعد 7.\n\nكل مدّة مفروضة بالكود، ومنشورة.\n\n#رفيق #خصوصية`);

add('44-story-launch', storyPost({
  i: 44, total: T, kicker: 'إربد', head: 'بلّشنا',
  value: '٢', unit: 'جامعات · أول أسبوع', sub: 'اليرموك · العلوم والتكنولوجيا',
  accent: BRAND,
}), ST, `بلّشنا من إربد.\n\n#رفيق #اليرموك #JUST`);

add('45-story-cash', storyPost({
  i: 45, total: T, kicker: 'للكابتن', head: 'نقداً كذلك',
  value: '15', unit: '٪ عمولة', sub: 'بنفس السعر المعلن — الكابتن بيقبض، مو بيسعّر.',
  bg: INK, fg: '#fff', accent: AMBER,
}), ST, `صار فيك تقبض نقداً.\n\n#رفيق #كباتن`);

add('46-story-window', storyPost({
  i: 46, total: T, kicker: 'التجميع', head: 'ثماني دقايق',
  value: '٨', unit: 'دقايق بالذروة', sub: 'والمركبة الممتلئة تنطلق فوراً.',
}), ST, `8 دقايق تجميع بالذروة — هي اللي بتخلّي المقعد 1.500.\n\n#رفيق`);

/* ── العلامة والإطلاق (٤٧–٥٢) ─────────────────────────────────────────── */
add('47-slogan', brandPost({
  i: 47, total: T, head: 'مقعدك إلى الجامعة',
  sub: 'تدفع مقعداً، لا رحلة.',
}), SQ, `مقعدك إلى الجامعة.\n\n#رفيق`);

add('48-promise', brandPost({
  i: 48, total: T, head: 'السعر وعد، لا حساب',
  sub: 'بتعرف كلفتك قبل ما تطلب — وهي نفسها كل يوم.',
  bg: INK,
}), SQ, `السعر وعد، لا حساب.\n\n#رفيق`);

add('49-universities', listPost({
  i: 49, total: T, kicker: 'الجامعات', head: 'وين بنشتغل',
  items: [
    'جامعة اليرموك — إربد',
    'العلوم والتكنولوجيا الأردنية — الرمثا',
    'جامعتك جايّة — اكتب اسمها بالتعليقات',
  ],
  bg: BONE,
}), PT, `اليرموك و«العلوم والتكنولوجيا» أول محطّتين.\n\nجامعتك مو موجودة؟ اكتب اسمها — بنرتّب التوسّع حسب الطلب.\n\n#رفيق #جامعات_الأردن`);

add('50-why-name', statement({
  i: 50, total: T, kicker: 'الاسم', head: 'رفيق',
  lede: 'رفيقك في الطريق. والعلامة نفسها رحلة: حلقة من وين تبدأ، ومنحنى، ونقطة عنبرية عند وجهتك.',
  bg: BONE, fg: INK,
}), PT, `ليش «رفيق»؟\n\nلأنّه اللي يرافقك بالطريق. والعلامة نفسها رحلة — حلقة مفتوحة من وين تبدأ، ومنحنى، ونقطة عنبرية عند البوابة اللي تنزل عندها.\n\n#رفيق #هوية`);

add('51-numbers', bandTable({
  i: 51, total: T, head: 'أرقامنا مكشوفة',
  note: 'كل رقم من هدول مفروض بالكود ومُختبَر — لا مكتوب بوثيقة فقط.',
  rows: [
    ['العمولة', 'من أجرة كل مقعد', '15٪'],
    ['خصم الخطّة', 'على 40 رحلة', '20٪'],
    ['ضمان الكابتن', 'للرحلة الناقصة', '3.500'],
    ['نافذة التجميع', 'بالذروة', '٨ د'],
    ['مسار الرحلة', 'مدّة الاحتفاظ', '٣٠ ي'],
    ['موقع الكابتن', 'خارج الرحلة', '٧ ي'],
  ],
}), PT, `كل رقم بيحكم التطبيق، معلن:\n\nالعمولة 15٪ · خصم الخطّة 20٪ · ضمان الكابتن 3.500 · نافذة التجميع 8 دقايق · مسار الرحلة 30 يوم · موقع الكابتن خارج الرحلة 7 أيام.\n\nما في رقم بنخفيه، وما في مدّة احتفاظ مكتوبة بوثيقة وغير مفروضة بالكود.\n\n#رفيق #شفافية`);

add('52-download', brandPost({
  i: 52, total: T, head: 'نزّل رفيق',
  sub: 'إربد · اليرموك والعلوم والتكنولوجيا — والرابط بالبايو',
  bg: BRAND,
}), SQ, `نزّل رفيق وشوف سعر مقعدك قبل ما تطلب.\n\nالرابط بالبايو.\n\n#رفيق #إربد #اليرموك #JUST #نقل_جامعي #طلاب_الأردن`);


/* ── مكان · المركبة · الوجهة (٥٣–٥٨) ─────────────────────────────────────── */
add('53-irbid', cityPost({
  i: 53, total: T, kicker: 'إربد', head: 'مدينتك مو مصمّمة للمشي',
  lede: 'أحياء متفرّقة، تلال، وباص بيوقّف عند المجمّع. رفيق بيسدّ المسافة اللي ما حد بيحكي عنها.',
  seed: 23,
}), PT, `إربد أحياء متفرّقة وتلال، والباص بيوقّفك عند المجمّع.\n\nالمسافة اللي بينك وبين البوابة هي اللي بتتعب — ومنها بلّشنا.\n\n#رفيق #إربد #اليرموك`);

add('54-full-car', carPost({
  i: 54, total: T, kicker: 'المقعد الرابع', head: 'كل مقعد فاضي غلاء',
  value: '4', unit: 'مقاعد · مركبة واحدة', note: 'الامتلاء هو اللي بيخلّي المقعد ١.٥٠٠',
  seats: 4,
}), PT, `المقعد الفاضي مو خسارة الكابتن بس — هو سبب غلاء المقعد.\n\nالامتلاء هو اللي بيخلّي حصّتك ١.٥٠٠ بدل ٣.٥٠٠. ولهذا بنجمّع قبل ما نرسل.\n\n#رفيق #تجميع`);

add('55-solo-car', carPost({
  i: 55, total: T, kicker: 'مستعجل؟', head: 'خُذ المركبة كاملة',
  value: '5.250', unit: 'دينار · المقاعد الأربعة', note: 'بلا انتظار تجميع · سعر معلن',
  bg: BONE, fg: INK, accent: BRAND, seats: 1,
}), PT, `بدك تنطلق هلق؟ خُذ المقاعد الأربعة بـ ٥.٢٥٠.\n\nالمنفردة مو عقوبة — منتج بسعر معلن بتختاره وأنت عارف.\n\n#رفيق #رحلة_منفردة`);

add('56-gate', gatePost({
  i: 56, total: T, kicker: 'الوجهة', head: 'عند البوابة، لا عند المجمّع',
  lede: 'النقطة العنبرية في علامتنا هي هاي — البوابة اللي بتنزل عندها فعلاً.',
  bg: BRAND_D,
}), PT, `النقطة العنبرية في علامة رفيق هي وجهتك — البوابة نفسها.\n\nمو أقرب دوّار، ومو المجمّع.\n\n#رفيق #اليرموك #JUST`);

add('57-two-universities', cityPost({
  i: 57, total: T, kicker: 'أول محطّتين', head: 'اليرموك والعلوم والتكنولوجيا',
  lede: 'وجامعتك جايّة — اكتب اسمها بالتعليقات، وبنرتّب التوسّع حسب الطلب الحقيقي.',
  bg: INK, fg: '#fff', accent: BRAND_L, seed: 31,
}), PT, `بلّشنا باليرموك و«العلوم والتكنولوجيا».\n\nجامعتك مو موجودة؟ اكتب اسمها — التوسّع حسب الطلب، مو حسب الخريطة.\n\n#رفيق #جامعات_الأردن #إربد #الرمثا`);

add('58-morning', cityPost({
  i: 58, total: T, kicker: 'السابعة والنص', head: 'أصعب نصّ ساعة بيومك',
  lede: 'محاضرة الثامنة، وباص ما بتعرف إيمتى بيجي. رفيق بيحسب وقتك قبل ما تطلب.',
  bg: BONE, fg: INK, seed: 43,
}), PT, `محاضرة الثامنة، وباص ما بتعرف إيمتى بيجي.\n\nرفيق بيوريك وقت الوصول والسعر قبل ما تطلب — مو تقدير مفتوح.\n\n#رفيق #طلاب #إربد`);


/* ── معالم الشمال · مركبتان (٥٩–٦٢) ──────────────────────────────────────────
   Place made SPECIFIC. The skyline posts above say "a city"; these name the
   north. Umm Qais and Ajloun are both within an hour of Yarmouk's gate, the
   rooftop is the detail no stock photograph of "the Middle East" contains, and
   the two-vehicle post argues with shapes instead of numbers. */

add('59-umm-qais', ruinPost({
  i: 59, total: T, kicker: 'أم قيس · إربد',
  head: 'الشمال أقدم من كل خطوط الباص',
  lede: 'أعمدة أم قيس واقفة من ألفين سنة، وطالب اليرموك لسّا ما لقى طريقة يوصل بيها للبوابة. صار وقتها.',
}), PT, `أم قيس على ٢٠ دقيقة من بوابة اليرموك — مدينة رومانية كاملة.\n\nالشمال فيه كل شي إلا طريقة نقل تحترم وقت طالبه. من هون بلّشنا.\n\n#رفيق #أم_قيس #إربد #اليرموك #الأردن`);

add('60-ajloun', fortressPost({
  i: 60, total: T, kicker: 'عجلون',
  head: 'قلعة على تلّة، وطالب بلا مقعد',
  lede: 'بنوا قلعة على أعلى تلّة بالشمال قبل ثمان قرون. إحنا بس بدنا نوصّلك للمحاضرة بسعر تعرفه.',
}), PT, `قلعة عجلون على أعلى تلّة بالشمال، مبنية قبل ٨٠٠ سنة.\n\nإحنا هدفنا أبسط: مقعد لطالب، بسعر معلن، على وقت المحاضرة.\n\n#رفيق #عجلون #الأردن #الشمال`);

add('61-rooftop', rooftopPost({
  i: 61, total: T, kicker: 'من فوق',
  head: 'إربد من فوق السطوح',
  lede: 'ثلاث خزّانات وسخّان وطبق — وتحتهم طالب بيحسب أجرة الرجعة.',
}), SQ, `كل سطح بإربد: ثلاث خزّانات، سخّان شمسي، وطبق.\n\nوتحت كل واحد منهم طالب بيحسب أجرة الرجعة. رفيق للحساب هاض.\n\n#رفيق #إربد #الأردن`);

add('62-depot-vs-door', twoVehiclePost({
  i: 62, total: T, kicker: 'الفرق بالشكل',
  head: 'واحد بيوقّف بالمجمّع',
  busLabel: 'الباص: أجرة رخيصة + تكسي للمجمّع + مشي + انتظار مفتوح',
  carLabel: 'رفيق: من باب بيتك لبوابة جامعتك — ١.٥٠٠',
  note: 'مو مقارنة أسعار — مقارنة كم مرة لازم تبدّل مركبة وأنت رايح لمحاضرة الثامنة.',
}), PT, `الباص أرخص على الورق: أجرة + تكسي للمجمّع + مشي + انتظار.\n\nرفيق: مقعد واحد، من الباب للبوابة، بسعر تعرفه قبل ما تطلب.\n\n#رفيق #إربد #نقل_جامعي`);

/* ═════════════════════════ RENDER ═════════════════════════════════════════ */

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(resolve(HERE, 'fonts'), resolve(BUILD, 'fonts'), { recursive: true });

/*
 * `CHROMIUM_PATH` — for an environment where the browser is already on disk.
 *
 * Playwright pins an exact browser revision and refuses to launch anything else, so
 * on a container that ships its own Chromium (or a CI image with the browsers baked
 * in at a different revision) `chromium.launch()` fails with "Executable doesn't
 * exist" and the only documented fix is a fresh download. Honouring an explicit path
 * makes the design pipeline runnable there. Unset, behaviour is unchanged.
 */
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--font-render-hinting=none'],
});

let bytes = 0;
for (const { name, html, size, caption } of P) {
  const [w, h] = size;
  const file = resolve(BUILD, `${name}.html`);
  writeFileSync(file, html);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto('file://' + file, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  await p.screenshot({ path: resolve(OUT, `${name}.png`) });
  await ctx.close();
  writeFileSync(resolve(OUT, `${name}.txt`), caption.trim() + '\n');
  process.stdout.write(`${String(P.indexOf(P.find((x) => x.name === name)) + 1).padStart(2, '0')} ${name.padEnd(24)} ${w}×${h}\n`);
}
await browser.close();
console.log(`\n${P.length} posts + ${P.length} captions → marketing/posts/`);
