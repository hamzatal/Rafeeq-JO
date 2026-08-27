/* ═══════════════════════════════════════════════════════════════════════════
   «مسار» — 52 social posts, generated.

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
  N, grain, stroke, imprint, rail, index, page, mark, SQ, PT, ST,
} from './poster-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(HERE, 'build');
const OUT = resolve(HERE, '../Rafeeq-JO/marketing/posts');

/* ── shared fragments ─────────────────────────────────────────────────────── */

const foot = (dark) => `<div style="position:absolute;bottom:66px;right:64px;z-index:25">
  ${imprint({ color: dark ? '#fff' : INK, size: 33, dim: dark ? 0.6 : 0.55 })}</div>`;

const eyebrow = (t, color = BRAND) =>
  `<div style="font:700 27px/1 'Plex';color:${color};letter-spacing:.16em">${t}</div>`;

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

/** 1 · NUMBER WALL — one clipped numeral is the whole image. */
function numberWall({ i, total, value, unit, head, lede, bg = BONE, fg = INK, accent = BRAND }) {
  const [w, h] = PT;
  const dark = bg !== BONE && bg !== CHALK;

  return page(w, h, `
    ${stroke({ w, h, d: `M-120 ${h * 0.615} C ${w * 0.30} ${h * 0.615} ${w * 0.30} ${h * 0.44} ${w * 0.62} ${h * 0.44} S ${w * 0.84} ${h * 0.40} ${w * 0.885} ${h * 0.395}`, width: 92, color: accent })}
    ${index(i, total, { color: fg })}
    ${rail('YOUR SEAT TO CAMPUS', { color: fg, opacity: dark ? 0.34 : 0.3 })}
    <div style="position:absolute;top:${h * 0.05}px;right:-26px;z-index:10">
      <div class="num" style="font-size:${String(value).length > 5 ? 330 : 400}px;color:${fg}">${N(value)}</div>
    </div>
    <div style="position:absolute;top:${h * 0.295}px;right:60px;z-index:10;
      font:500 44px/1 'Plex';color:${fg};opacity:.6">${unit}</div>
    <div style="position:absolute;bottom:236px;right:64px;left:64px;z-index:10">
      <div class="h" style="font-size:126px;color:${fg};max-width:900px">${head}</div>
      ${lede ? `<div class="lede" style="margin-top:30px;font-size:33px;color:${fg};opacity:.64;max-width:770px">${lede}</div>` : ''}
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
    ${rail('MASAR · JORDAN', { color: '#fff', opacity: 0.34 })}
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
          <span style="font:500 27px/1 'Plex';color:${INK};opacity:.48;flex:1;text-align:center">${r[1]}</span>
          <span class="num" style="font-size:58px;color:${k === 2 ? BRAND : INK};min-width:190px;text-align:left">${N(r[2])}</span>
        </div>`).join('')}
    </div>
    <div style="position:absolute;bottom:158px;right:64px;left:64px;z-index:10;
      font:500 28px/1.5 'Plex';color:${INK};opacity:.55;max-width:840px">${note}</div>
    ${foot(false)}${grain(0.05, 51 + i)}
  `, bg);
}

/** 9 · SQUARE MARK — brand moment. The mark large, one line of type. */
function brandPost({ i, total, head, sub, bg = BRAND, fg = '#fff' }) {
  const [w, h] = SQ;
  // Stroke raised to sit BEHIND the type as a horizon line, and given a real
  // tone — the previous dark grey on ink read as a smudge.
  const strokeColor = bg === INK ? '#1B2A46' : 'rgba(255,255,255,.18)';

  return page(w, h, `
    ${stroke({ w, h, d: `M-100 ${h * 0.735} C ${w * 0.34} ${h * 0.735} ${w * 0.32} ${h * 0.60} ${w * 0.70} ${h * 0.60} S ${w * 0.86} ${h * 0.588} ${w * 0.885} ${h * 0.585}`, width: 66, color: strokeColor, dot: AMBER, dotR: 34 })}
    ${index(i, total, { color: fg })}
    <div style="position:absolute;top:84px;right:60px;z-index:10">${mark(158, { path: fg, dot: AMBER, w: 9 })}</div>
    <!-- Anchored to the lower half so the square never opens a dead middle. -->
    <div style="position:absolute;bottom:190px;right:64px;left:64px;z-index:10">
      <div class="h" style="font-size:132px;color:${fg};max-width:900px">${head}</div>
      ${sub ? `<div class="lede" style="margin-top:32px;font-size:35px;color:${fg};opacity:.8;max-width:860px">${sub}</div>` : ''}
    </div>
    ${foot(true)}${grain(0.075, 59 + i)}
  `, bg);
}

/* ═════════════════════════ THE 52 POSTS ═══════════════════════════════════ */

const T = 52;
const P = [];
const add = (name, html, size, caption) => P.push({ name, html, size, caption });

/* ── الطالب · السعر والقيمة (١–١٠) ─────────────────────────────────────── */
add('01-seat-price', numberWall({
  i: 1, total: T, value: '1.500', unit: 'دينار · للمقعد',
  head: 'من حيّك لباب الجامعة',
  lede: 'سعر معلن قبل ما تطلب — ما بيزيد بالزحمة ولا بعدد الركّاب.',
}), PT, `مقعدك من حيّك لباب الجامعة بـ 1.500 د.أ.\n\nمو تسعير لحظي. مو مضاعف زحمة. سعر النطاق معلن قبل ما تطلب، وهو نفسه كل يوم.\n\n#مسار #الأردن #جامعة_اليرموك #إربد #نقل_جامعي`);

add('02-monthly-math', numberWall({
  i: 2, total: T, value: '48', unit: 'دينار · 40 رحلة',
  head: 'شهرك محسوب من قبل',
  lede: 'خصم 20% على سعر نطاقك. الخطّة مربوطة بخطّك، فما حد يدفع أكثر من سعره العادي.',
}), PT, `40 رحلة بـ 48 د.أ للنطاق المتوسط — 1.200 للرحلة بدل 1.500.\n\nوسعر الخطّة محسوب من نطاقك أنت، لا رقم واحد للجميع. يعني ما في طالب يشترك ويدفع أكثر من السعر العادي.\n\n#مسار #اشتراك_شهري #طلاب_الأردن`);

add('03-vs-taxi', versus({
  i: 3, total: T, head: 'نفس الطريق. نص الحساب.',
  badLabel: 'تكسي منفرد', bad: '3.500', goodLabel: 'مقعدك بمسار', good: '1.500',
  note: 'باب لباب، بلا تبديل مركبة وبلا انتظار باص.',
}), PT, `التكسي المنفرد ~3.500. مقعدك بمسار 1.500 — نفس الطريق، باب لباب.\n\nالفرق إنك بتدفع مقعد، لا رحلة كاملة.\n\n#مسار #إربد #توفير`);

add('04-vs-bus', versus({
  i: 4, total: T, head: 'الباص أرخص. وأغلى.',
  badLabel: 'باص + تكسي للمجمّع', bad: '2.000', goodLabel: 'مقعدك بمسار', good: '1.500',
  note: 'الباص بيوقّفك عند المجمّع. مسار بيوصّلك للبوابة — بلا مشي وبلا انتظار.',
}), PT, `الباص 0.350، بس بيلزمك تكسي للمجمّع ووقت انتظار مفتوح. المجموع ~2.000 ووصول غير مضمون.\n\nمسار 1.500 من باب بيتك لبوابة جامعتك.\n\n#مسار #نقل_جامعي #إربد`);

add('05-fixed-price', statement({
  i: 5, total: T, kicker: 'وعد لا حساب',
  head: 'السعر ما بيتغيّر',
  lede: 'لا مضاعف زحمة. لا تعرفة ليلية. لا تسعير بالدقيقة. سعر نطاقك معلن، وهو نفسه الصبح والمساء.',
}), PT, `في تطبيقات النقل، السعر بيطلع لما تحتاجه أكثر.\n\nبمسار السعر بيانات معلنة، مو خوارزمية. سعر النطاق ثابت — الصبح، بالمساء، بالامتحانات.\n\n#مسار #سعر_ثابت`);

add('06-bands', bandTable({
  i: 6, total: T, head: 'ستّة نطاقات. سعر لكل واحد.',
  rows: [
    ['نطاق A', 'حتى 3 كم', '1.000'],
    ['نطاق B', '3–5 كم', '1.250'],
    ['نطاق C', '5–7 كم', '1.500'],
    ['نطاق D', '7–10 كم', '1.750'],
    ['نطاق E', '10–14 كم', '2.000'],
    ['نطاق F', 'أكثر من 14 كم', '2.250'],
  ],
}), PT, `التعرفة كاملة، معلنة:\n\nA حتى 3كم — 1.000\nB 3–5كم — 1.250\nC 5–7كم — 1.500\nD 7–10كم — 1.750\nE 10–14كم — 2.000\nF فوق 14كم — 2.250\n\nدوّر على نطاقك واحسب شهرك من هلق.\n\n#مسار #التعرفة`);

add('07-door-to-door', statement({
  i: 7, total: T, kicker: 'باب لباب', head: 'ما في مشي',
  lede: 'من عند بيتك، لبوابة جامعتك. بلا مجمّع، بلا تبديل، بلا وقوف تحت الشمس.',
  bg: BONE, fg: INK,
}), PT, `أسوأ جزء من يومك مو الأجرة — المشي من المجمّع للبوابة.\n\nمسار بيوصّلك للبوابة.\n\n#مسار #طلاب #إربد`);

add('08-return-trip', statement({
  i: 8, total: T, kicker: 'العودة', head: 'رجعتك محجوزة لحالها',
  lede: 'ما بنطلب منك تحدّد وقت عودتك قبل ما تعرف إيمتى تخلص محاضرتك الأخيرة. اطلب رجعتك لحالها.',
  bg: BRAND_D,
}), PT, `ليش ما بنحزم الذهاب مع العودة؟\n\nلأنك ما بتعرف إيمتى تخلص آخر محاضرة. تحزيمها معناه إنك تلتزم بوقت ما تعرفه، وتخلّف عن المقعد.\n\nالعودة تُطلب لحالها، وبنجمّع العائدين من رحلات مختلفة.\n\n#مسار`);

add('09-solo', numberWall({
  i: 9, total: T, value: '5.250', unit: 'دينار · المركبة كاملة',
  head: 'بدك تنطلق هلق؟',
  lede: 'خُذ المقاعد الأربعة. سعر معروف، بلا انتظار تجميع — والخيار خيارك.',
}), PT, `مستعجل؟ خُذ المركبة كاملة بـ 5.250 للنطاق المتوسط.\n\nالمنفردة مو عقوبة — هي منتج بسعر معلن، بتختاره وأنت عارف.\n\n#مسار #رحلة_منفردة`);

add('10-no-surprise', quotePost({
  i: 10, total: T,
  quote: 'أول مرّة أعرف حساب رحلتي قبل ما أطلبها',
  who: 'طالبة · جامعة اليرموك',
}), PT, `«أول مرّة أعرف حساب رحلتي قبل ما أطلبها.»\n\nهاض المقصود بالسعر المعلن.\n\n#مسار #تجربة_طلاب`);

/* ── الثقة والسلامة (١١–١٨) ────────────────────────────────────────────── */
add('11-verified-captain', listPost({
  i: 11, total: T, kicker: 'قبل أول رحلة', head: 'كل كابتن مفحوص',
  items: [
    'رخصة سارية · وترخيص مركبة ساري',
    'تأمين فعّال، والمركبة مش أقدم من 7 سنين',
    'هويّة موثَّقة ومراجَعة يدوياً — لا اعتماد آلي',
    'تقييم ظاهر لكل راكب بعد كل رحلة',
  ],
}), PT, `ما في كابتن يشتغل قبل ما يمرّ من هاي الأربعة.\n\nالوثائق تُراجَع يدوياً، والمرفوضة تُحذف من عندنا بعد 30 يوم — ما نحتفظ بهويّة ما لها سبب.\n\n#مسار #سلامة`);

add('12-boarding-code', numberWall({
  i: 12, total: T, value: '٤', unit: 'أرقام · كود الصعود',
  head: 'ما بتركب غلط',
  lede: 'كود قصير تقوله للكابتن. لا التباس بالمركبة، ولا صعود براكب غير صاحب المقعد.',
  accent: BRAND,
}), PT, `كود صعود من 4 أرقام — قصير عشان ما تتوه، ومحدود المحاولات عشان ما ينحلّ بالتخمين.\n\nنفس الشي عند النزول.\n\n#مسار #سلامة`);

add('13-live-tracking', statement({
  i: 13, total: T, kicker: 'أثناء الرحلة', head: 'أهلك شايفينك',
  lede: 'رابط تتبّع حيّ تشاركه مع مين بدّك. وبنحذف مسار الرحلة بعد 30 يوم — نافذة النزاع، وبعدها ما له غرض.',
  bg: INK,
}), PT, `التتبّع الحيّ إلك ولأهلك.\n\nوبنحذفه بعد 30 يوم. تاريخ تحرّكاتك ما إلنا فيه مصلحة بعد ما تنتهي نافذة النزاع.\n\n#مسار #خصوصية`);

add('14-sos', statement({
  i: 14, total: T, kicker: 'زرّ الطوارئ', head: 'ضغطة واحدة',
  lede: 'بيوصل لفريق السلامة وبيوصل لجهات اتصالك — بلا ما ينشر اسمك على قائمة موظّفين.',
  bg: '#7A1410', fg: '#fff',
}), PT, `زرّ الطوارئ بيشتغل بضغطة، وبيوصل للفريق ولجهات اتصالك مع رابط موقعك.\n\nوبلا اسمك: التنبيه للموظّفين برقم مرجع فقط. اللي بيحتاج يعرف مين، بيفتح مركز السلامة الموثَّق.\n\n#مسار #طوارئ`);

add('15-predictable', statement({
  i: 15, total: T, kicker: 'لأنّ الجدول متوقَّع', head: 'نفس الوجوه كل صبح',
  lede: 'رحلتك مع طلاب من حيّك ومن جامعتك. مو غرباء من كل مكان.',
  bg: BONE, fg: INK,
}), PT, `التجميع مو بس أرخص — هو أأمن.\n\nرحلتك مع طلاب من نفس منطقتك ونفس جامعتك، بجدول متوقَّع، بمركبة مرخَّصة وكابتن موثَّق.\n\n#مسار #سلامة_الطالبات`);

add('16-no-phone', statement({
  i: 16, total: T, kicker: 'خصوصية', head: 'رقمك مو معروض',
  lede: 'موظّف الدعم بيشوف آخر رقمين فقط. الكشف الكامل بيحتاج صلاحية منفصلة، وكل كشف مُسجَّل.',
  bg: BRAND,
}), PT, `مين بيشوف رقمك؟ حرفياً: مو الدعم.\n\nالدعم بيشوف +962·······67 — بكفّي إنه يتأكّد من رقم بيتلوه عليه، وما بكفّي إنه يبني منه قائمة.\n\n#مسار #خصوصية`);

add('17-encrypted', statement({
  i: 17, total: T, kicker: 'على القرص', head: 'اسمك مشفَّر',
  lede: 'الاسم والرقم والبريد والعنوان — كلّها مشفَّرة بقاعدة البيانات. نسخة مسروقة بلا المفتاح ما فيها ولا اسم مقروء.',
  bg: INK,
}), PT, `شفّرنا اسمك ورقمك وبريدك وعنوان بيتك ورقمك الوطني وجهات اتصال الطوارئ — كلّها.\n\nالخطر مو مخترق التطبيق، الخطر نسخة قاعدة بيانات تخرج بلا مفتاح. قبل هيك كانت قائمة تواصل جاهزة. هلق ما فيها ولا اسم.\n\n#مسار #أمان_البيانات`);

add('18-rating', storyPost({
  i: 18, total: T, kicker: 'بعد كل رحلة', head: 'تقييمك بيوصل',
  value: '4.9', unit: 'متوسّط الكباتن', sub: 'وكل شكوى بتفتح ملف، مو بس رسالة.',
}), ST, `تقييمك بعد كل رحلة بيروح لملف الكابتن، والشكوى الحرجة بتفتح ملف تحقيق فوراً.\n\n#مسار`);

/* ── الكابتن (١٩–٢٦) ───────────────────────────────────────────────────── */
add('19-four-seats', splitField({
  i: 19, total: T, kicker: 'للكابتن', head: 'أربع مقاعد مش مقعد',
  value: '5.100', unit: 'صافي الرحلة الممتلئة', note: '×4 مقاعد · نطاق C',
}), PT, `الرحلة الفاضية خسارة. الرحلة الممتلئة 5.100 صافي.\n\nمسار بيجمّعلك أربع مقاعد على نفس الطريق — مو بيرسلك على راكب واحد.\n\n#مسار #كباتن #فرصة_عمل`);

add('20-weekly-payout', splitField({
  i: 20, total: T, kicker: 'أرباحك', head: 'السحب أسبوعي على CliQ',
  value: '7', unit: 'أيام · بحدّ أدنى معلن', note: 'بلا وسيط وبلا تأخير',
  top: BRAND_D,
}), PT, `أرباحك بتوصلك أسبوعياً على CliQ، بحدّ أدنى معلن مسبقاً.\n\nوكل حركة بمحفظتك لها قيد — بتشوف من وين جاي كل قرش.\n\n#مسار #كباتن`);

add('21-cash', splitField({
  i: 21, total: T, kicker: 'جديد', head: 'تقبض نقداً كذلك',
  value: '15', unit: '٪ عمولة فقط', note: 'والعمولة تتسوّى من رصيدك تلقائياً',
  top: '#0F3A8C',
}), PT, `صار فيك تقبض نقداً من الراكب.\n\nالأجرة تُسجَّل بسعر النطاق المعلن — الكابتن بيقبض الورق، مو بيحدّد السعر. والعمولة تتخصم من رصيدك، وإذا ما كفى تتسوّى من أرباحك الجاية تلقائياً.\n\n#مسار #كباتن #دفع_نقدي`);

add('22-requirements', listPost({
  i: 22, total: T, kicker: 'للتسجيل', head: 'أربع ورقات وبتبدأ',
  items: [
    'رخصة سواقة سارية',
    'ترخيص مركبة ساري',
    'تأمين فعّال',
    'مركبة مش أقدم من 7 سنين',
  ],
  bg: INK, fg: '#fff',
}), PT, `التسجيل ككابتن: رخصة، ترخيص، تأمين، ومركبة مش أقدم من 7 سنين.\n\nالمراجعة يدوية وبتاخد وقتها — لأنّ اللي جوّا المركبة طلاب.\n\n#مسار #كباتن #وظائف_الأردن`);

add('23-no-empty-return', statement({
  i: 23, total: T, kicker: 'العودة', head: 'ما ترجع فاضي',
  lede: 'بنجمّعلك ركّاب العودة من الجامعة للأحياء. نفس الطريق، مرّتين.',
  bg: INK,
}), PT, `الرجعة الفاضية هي أكبر خسارة بيوم الكابتن.\n\nمسار بيجمّع العائدين من الجامعة — ومو بس ركّابك، أي عائد على نفس الاتجاه.\n\n#مسار #كباتن`);

add('24-commission', numberWall({
  i: 24, total: T, value: '15', unit: '٪ عمولة · معلنة',
  head: 'بتعرف حصّتك قبل ما تقبل',
  lede: 'العمولة رقم واحد معلن، بلا بنود مخفية وبلا خصومات مفاجئة.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), PT, `العمولة 15٪. رقم واحد، معلن، وبتشوف صافيك قبل ما تقبل الرحلة.\n\nما في «رسوم خدمة» ولا «رسوم منصّة» ولا بنود تظهر بعدين.\n\n#مسار #كباتن`);

add('25-guarantee', splitField({
  i: 25, total: T, kicker: 'شبكة أمان', head: 'ضمان حدّ أدنى للرحلة',
  value: '3.500', unit: 'حدّ أدنى مضمون', note: 'مدفوع من عمولتنا — لا من جيب الطالب',
  top: '#0E7A5F',
}), PT, `إذا انتهت نافذة التجميع وما اكتملت المقاعد، بنضمنلك 3.500 للرحلة.\n\nوبندفعها من عمولتنا، مو بنزيدها على الطالب. لأنّ تغطية عجز الامتلاء من جيب الراكب بتكسر وعد السعر الثابت.\n\n#مسار #كباتن`);

add('26-join', brandPost({
  i: 26, total: T, head: 'سجّل ككابتن',
  sub: 'المراجعة يدوية · السحب أسبوعي · العمولة 15٪ معلنة',
  bg: INK,
}), SQ, `بتملك مركبة وبتشتغل على خط الجامعة؟\n\nسجّل ككابتن بمسار. أربع مقاعد بدل مقعد، سحب أسبوعي على CliQ، وعمولة معلنة.\n\nالرابط بالبايو.\n\n#مسار #كباتن #وظائف_الأردن #إربد`);

/* ── كيف بيشتغل (٢٧–٣٢) ────────────────────────────────────────────────── */
add('27-how-1', storyPost({
  i: 27, total: T, kicker: 'الخطوة الأولى', head: 'حدّد جامعتك وحيّك',
  value: '٠١', unit: 'من أربع خطوات', sub: 'مرّة واحدة، وبتنحفظ لكل رحلاتك.',
}), ST, `الخطوة 1: حدّد جامعتك وحيّك. مرّة واحدة.\n\n#مسار #كيف_بيشتغل`);

add('28-how-2', storyPost({
  i: 28, total: T, kicker: 'الخطوة الثانية', head: 'شوف السعر قبل ما تطلب',
  value: '٠٢', unit: 'من أربع خطوات', sub: 'سعر نطاقك ظاهر — مو تقدير ولا نطاق مفتوح.',
  accent: BRAND_D,
}), ST, `الخطوة 2: السعر بيظهرلك قبل ما تطلب. رقم واحد، مو «من … إلى».\n\n#مسار`);

add('29-how-3', storyPost({
  i: 29, total: T, kicker: 'الخطوة الثالثة', head: 'بنجمّعك مع اللي على طريقك',
  value: '٠٣', unit: 'من أربع خطوات', sub: 'نافذة قصيرة، وبعدها المركبة تنطلق.',
}), ST, `الخطوة 3: بنجمّعك مع طلاب من حيّك ونفس جامعتك — نافذة 8 دقايق بالذروة.\n\nوالمركبة الممتلئة تنطلق فوراً، ما تنتظر حد.\n\n#مسار`);

add('30-how-4', storyPost({
  i: 30, total: T, kicker: 'الخطوة الرابعة', head: 'كود، وبتركب',
  value: '٠٤', unit: 'من أربع خطوات', sub: 'أربع أرقام بينك وبين الكابتن.',
  accent: BRAND,
}), ST, `الخطوة 4: تقول كود الصعود، وبتركب. وكود ثاني عند النزول.\n\n#مسار`);

add('31-window-why', statement({
  i: 31, total: T, kicker: 'ليش بنجمّع', head: '٨ دقايق بتوفّرلك نصّ الحساب',
  lede: 'التجميع هو اللي بيخلّي المقعد 1.500 بدل 3.500. وما بنأخّر مركبة اكتملت مقاعدها ولا دقيقة.',
  bg: BONE, fg: INK,
}), PT, `ليش نافذة تجميع؟\n\nلأنّ رحلة بمقعدين ما بتجدي الكابتن، وتغطية العجز من جيب الطالب بتكسر وعد السعر الثابت. فبنجمّع أول، وبعدين بنرسل.\n\n8 دقايق بالذروة، 18 خارجها. والمركبة الممتلئة تنطلق فوراً.\n\n#مسار`);

add('32-coverage', listPost({
  i: 32, total: T, kicker: 'التغطية', head: 'بلّشنا من إربد',
  items: [
    'جامعة اليرموك · وجامعة العلوم والتكنولوجيا',
    'أحياء إربد — والقائمة بتكبر كل أسبوع',
    'الرحلة العكسية من الجامعة للأحياء',
    'حيّك مو موجود؟ بعتلنا اسمه',
  ],
}), PT, `بلّشنا من إربد: اليرموك و«العلوم والتكنولوجيا».\n\nحيّك مو بالقائمة؟ اكتبه بالتعليقات — بنفتح المناطق حسب الطلب الحقيقي، مو حسب الخريطة.\n\n#مسار #إربد #اليرموك #JUST`);

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
}), PT, `${q}\n\n${a}\n\n#مسار #أسئلة`));

/* ── ستوريز (٣٩–٤٦) ───────────────────────────────────────────────────── */
add('39-story-price', storyPost({
  i: 39, total: T, kicker: 'المقعد', head: 'تدفع مقعداً، لا رحلة',
  value: '1.500', unit: 'دينار', sub: 'بدل 5.250 للمركبة كاملة.',
}), ST, `تدفع مقعداً، لا رحلة.\n\n#مسار`);

add('40-story-saving', storyPost({
  i: 40, total: T, kicker: 'شهرياً', head: 'وفّر أكثر من نصّ حسابك',
  value: '22', unit: 'دينار · شهرياً', sub: '40 رحلة: 48 بالخطّة بدل 70 بالتكسي.',
  accent: BRAND_D,
}), ST, `40 رحلة بالتكسي ~70 د.أ. بخطّة مسار 48.\n\n#مسار #توفير`);

add('41-story-seats', storyPost({
  i: 41, total: T, kicker: 'للكابتن', head: 'أربع مقاعد بكل رحلة',
  value: '5.100', unit: 'صافي الرحلة', sub: 'مو راكب واحد على طريق طويل.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), ST, `أربع مقاعد بكل رحلة، 5.100 صافي.\n\n#مسار #كباتن`);

add('42-story-code', storyPost({
  i: 42, total: T, kicker: 'كود الصعود', head: 'أربع أرقام وبتركب',
  value: '٤', unit: 'أرقام', sub: 'قصير عشان ما تتوه — ومحدود المحاولات عشان ما ينحلّ بالتخمين.',
}), ST, `كود صعود من 4 أرقام.\n\n#مسار #سلامة`);

add('43-story-privacy', storyPost({
  i: 43, total: T, kicker: 'خصوصية', head: 'ما بنحتفظ باللي ما بنحتاجه',
  value: '30', unit: 'يوم · مسار الرحلة', sub: 'وبعدها بيُحذف. نافذة النزاع خلصت، فما له غرض.',
  bg: INK, fg: '#fff', accent: BRAND_L,
}), ST, `مسار رحلتك بيُحذف بعد 30 يوم. موقع الكابتن خارج الرحلة بعد 7.\n\nكل مدّة مفروضة بالكود، ومنشورة.\n\n#مسار #خصوصية`);

add('44-story-launch', storyPost({
  i: 44, total: T, kicker: 'إربد', head: 'بلّشنا',
  value: '٢', unit: 'جامعات · أول أسبوع', sub: 'اليرموك · العلوم والتكنولوجيا',
  accent: BRAND,
}), ST, `بلّشنا من إربد.\n\n#مسار #اليرموك #JUST`);

add('45-story-cash', storyPost({
  i: 45, total: T, kicker: 'للكابتن', head: 'نقداً كذلك',
  value: '15', unit: '٪ عمولة', sub: 'بنفس السعر المعلن — الكابتن بيقبض، مو بيسعّر.',
  bg: INK, fg: '#fff', accent: AMBER,
}), ST, `صار فيك تقبض نقداً.\n\n#مسار #كباتن`);

add('46-story-window', storyPost({
  i: 46, total: T, kicker: 'التجميع', head: 'ثماني دقايق',
  value: '٨', unit: 'دقايق بالذروة', sub: 'والمركبة الممتلئة تنطلق فوراً.',
}), ST, `8 دقايق تجميع بالذروة — هي اللي بتخلّي المقعد 1.500.\n\n#مسار`);

/* ── العلامة والإطلاق (٤٧–٥٢) ─────────────────────────────────────────── */
add('47-slogan', brandPost({
  i: 47, total: T, head: 'مقعدك إلى الجامعة',
  sub: 'تدفع مقعداً، لا رحلة.',
}), SQ, `مقعدك إلى الجامعة.\n\n#مسار`);

add('48-promise', brandPost({
  i: 48, total: T, head: 'السعر وعد، لا حساب',
  sub: 'بتعرف كلفتك قبل ما تطلب — وهي نفسها كل يوم.',
  bg: INK,
}), SQ, `السعر وعد، لا حساب.\n\n#مسار`);

add('49-universities', listPost({
  i: 49, total: T, kicker: 'الجامعات', head: 'وين بنشتغل',
  items: [
    'جامعة اليرموك — إربد',
    'العلوم والتكنولوجيا الأردنية — الرمثا',
    'جامعتك جايّة — اكتب اسمها بالتعليقات',
  ],
  bg: BONE,
}), PT, `اليرموك و«العلوم والتكنولوجيا» أول محطّتين.\n\nجامعتك مو موجودة؟ اكتب اسمها — بنرتّب التوسّع حسب الطلب.\n\n#مسار #جامعات_الأردن`);

add('50-why-name', statement({
  i: 50, total: T, kicker: 'الاسم', head: 'مسار',
  lede: 'الطريق هو الحرف. والنقطة الذهبية هي وجهتك — البوابة اللي بتنزل عندها.',
  bg: BONE, fg: INK,
}), PT, `ليش «مسار»؟\n\nلأنّ العلامة نفسها طريق بينحني وبينتهي بنقطة — والنقطة هي وجهتك.\n\n#مسار #هوية`);

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
}), PT, `كل رقم بيحكم التطبيق، معلن:\n\nالعمولة 15٪ · خصم الخطّة 20٪ · ضمان الكابتن 3.500 · نافذة التجميع 8 دقايق · مسار الرحلة 30 يوم · موقع الكابتن خارج الرحلة 7 أيام.\n\nما في رقم بنخفيه، وما في مدّة احتفاظ مكتوبة بوثيقة وغير مفروضة بالكود.\n\n#مسار #شفافية`);

add('52-download', brandPost({
  i: 52, total: T, head: 'نزّل مسار',
  sub: 'إربد · اليرموك والعلوم والتكنولوجيا — والرابط بالبايو',
  bg: BRAND,
}), SQ, `نزّل مسار وشوف سعر مقعدك قبل ما تطلب.\n\nالرابط بالبايو.\n\n#مسار #إربد #اليرموك #JUST #نقل_جامعي #طلاب_الأردن`);

/* ═════════════════════════ RENDER ═════════════════════════════════════════ */

rmSync(BUILD, { recursive: true, force: true });
mkdirSync(BUILD, { recursive: true });
mkdirSync(OUT, { recursive: true });
cpSync(resolve(HERE, '../Rafeeq-JO/docs/design/src/fonts'), resolve(BUILD, 'fonts'), { recursive: true });

const browser = await chromium.launch({
  executablePath: '/opt/playwright/chromium-1232/chrome-linux64/chrome',
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
