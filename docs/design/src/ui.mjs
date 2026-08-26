/* ═══════════════════════════════════════════════════════════════════════
   Rafeeq DS v2 «مسار» — mockup component library.
   Screens are declared as data and assembled from these helpers, so the whole
   spec is one source of truth and can be re-rendered after any token change.
   ═══════════════════════════════════════════════════════════════════════ */

// ── icons (Lucide paths, 1.75 stroke) ────────────────────────────────────
const P = {
  home:'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z',
  car:'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 002 12v4c0 .6.4 1 1 1h2|M9 17h6|M9 17a2 2 0 11-4 0 2 2 0 014 0|M19 17a2 2 0 11-4 0 2 2 0 014 0',
  wallet:'M2 8a2 2 0 012-2h16a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2z|M2 11h20',
  user:'M12 11a4 4 0 100-8 4 4 0 000 8z|M4.5 21a7.5 7.5 0 0115 0',
  bell:'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 01-3.4 0',
  shield:'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z',
  msg:'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  map:'M9 3l6 3 6-3v15l-6 3-6-3-6 3V6z|M9 3v15M15 6v15',
  school:'M3 9l9-5 9 5-9 5z|M6 11v6c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-6',
  clock:'M12 21a9 9 0 100-18 9 9 0 000 18z|M12 7v5l3.5 2',
  search:'M11 18a7 7 0 100-14 7 7 0 000 14z|M20 20l-4.3-4.3',
  chev:'M15 18l-6-6 6-6',
  chevL:'M9 18l6-6-6-6',
  back:'M15 18l-6-6 6-6',
  plus:'M12 5v14M5 12h14',
  star:'M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5 2 9.5l7-1z',
  file:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z|M14 2v6h6',
  gift:'M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8|M2 7h20v5H2z|M12 22V7',
  phone:'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L8.1 9.5a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0122 16.9z',
  logout:'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4|M16 17l5-5-5-5|M21 12H9',
  globe:'M12 21a9 9 0 100-18 9 9 0 000 18z|M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18',
  trash:'M3 6h18|M8 6V4h8v2|M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
  crosshair:'M12 21a9 9 0 100-18 9 9 0 000 18z|M12 15a3 3 0 100-6 3 3 0 000 6z|M12 1v4M12 19v4M1 12h4M19 12h4',
  sparkle:'M12 3v2M12 19v2M5 12H3M21 12h-2M7 7L5.5 5.5M18.5 18.5L17 17M17 7l1.5-1.5M5.5 18.5L7 17|M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  send:'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  cam:'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z|M12 17a4 4 0 100-8 4 4 0 000 8z',
  truck:'M1 3h15v13H1z|M16 8h4l3 3v5h-7|M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z|M18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  cash:'M4 7h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z|M12 15a3 3 0 100-6 3 3 0 000 6z|M6 12h.01M18 12h.01',
  chart:'M3 3v18h18|M7 15l4-5 3 3 4-6',
  gauge:'M12 14l3.6-3.6|M3.5 18.5a10 10 0 1117 0',
  wallet2:'M3 7.5A2.5 2.5 0 015.5 5h11A2.5 2.5 0 0119 7.5V8h1.5A1.5 1.5 0 0122 9.5v8a1.5 1.5 0 01-1.5 1.5h-15A2.5 2.5 0 013 16.5z|M17.5 13.5h.01',
  power:'M18.4 6.6a9 9 0 11-12.7 0|M12 2v8',
  alert:'M12 3l9.5 17H2.5z|M12 9v4M12 17h.01',
  check:'M20 6L9 17l-5-5',
  x:'M18 6L6 18M6 6l12 12',
  route:'M6 19a3 3 0 100-6 3 3 0 000 6z|M18 11a3 3 0 100-6 3 3 0 000 6z|M9 16h5a3 3 0 000-6H9',
  lock:'M5 11h14v10H5z|M8 11V7a4 4 0 018 0v4',
  headset:'M3 18v-6a9 9 0 0118 0v6|M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z',
  id:'M2 5h20v14H2z|M8 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z|M4 17c.7-1.8 2.2-3 4-3s3.3 1.2 4 3M15 9h4M15 13h4',
};
/** Solid counterparts of the tab glyphs. Outline for rest, solid for active,
 * which is how every current platform signals the selected tab. */
const PF = {
  home:'M11.36 2.32a1 1 0 011.28 0l8.5 7.13A1 1 0 0121.5 10.2V20a2 2 0 01-2 2h-4.75v-6.4h-5.5V22H4.5a2 2 0 01-2-2v-9.8a1 1 0 01.36-.75z',
  car:'M20.9 10.6C19.9 10.4 17 9.8 17 9.8s-1.5-1.6-2.5-2.6c-.6-.5-1.3-.8-2.1-.8H5.6c-.8 0-1.5.5-1.8 1.2L2.3 10.7c-.2.5-.3 1-.3 1.5V16c0 .8.7 1.5 1.5 1.5h.6a3 3 0 015.8 0h4.2a3 3 0 015.8 0h1.1c.8 0 1.5-.7 1.5-1.5v-2.9c0-1.2-.8-2.2-1.6-2.5zM6.6 15.6a1.9 1.9 0 100 3.8 1.9 1.9 0 000-3.8zm10 0a1.9 1.9 0 100 3.8 1.9 1.9 0 000-3.8z',
  wallet:'M5.5 4.5h11A2.5 2.5 0 0119 7v.5H5.5a1 1 0 000 2h15A1.5 1.5 0 0122 11v6.5a2 2 0 01-2 2H5.5A2.5 2.5 0 013 17V7a2.5 2.5 0 012.5-2.5zm12.2 8.6a1.15 1.15 0 100 2.3 1.15 1.15 0 000-2.3z',
  user:'M12 3.2a4.2 4.2 0 100 8.4 4.2 4.2 0 000-8.4zM12 13.2c-4.3 0-7.8 3-7.8 6.7 0 .6.5 1.1 1.1 1.1h13.4c.6 0 1.1-.5 1.1-1.1 0-3.7-3.5-6.7-7.8-6.7z',
  gauge:'M12 2.6A9.4 9.4 0 002.9 14.3a1 1 0 001.9-.5 7.4 7.4 0 1114.4 0 1 1 0 001.9.5A9.4 9.4 0 0012 2.6zm4.3 6.1a1 1 0 00-1.4 0l-3.6 3.6a1.8 1.8 0 102.5 2.5l3.6-3.6a1 1 0 000-1.4z',
  cash:'M4 6.2h16A2.3 2.3 0 0122.3 8.5v7A2.3 2.3 0 0120 17.8H4A2.3 2.3 0 011.7 15.5v-7A2.3 2.3 0 014 6.2zm8 2.9a2.9 2.9 0 100 5.8 2.9 2.9 0 000-5.8zM5.6 10.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm12.8 0a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z',
};
export function icf(n, { s = 20, c = '#1259E3' } = {}) {
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}">${(PF[n] || '').split('|').map(d => `<path d="${d}"/>`).join('')}</svg>`;
}

export function ic(n, { s = 20, c = '#39415A', w = 1.75 } = {}) {
  const paths = (P[n] || '').split('|').map(d => `<path d="${d}"/>`).join('');
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

// ── chrome ───────────────────────────────────────────────────────────────
export function statusBar(dark = false) {
  const f = dark ? '#fff' : '#0E1524';
  return `<div class="sb${dark ? ' on-dark' : ''}"><span>9:41</span><div class="rr">
<svg width="16" height="10" viewBox="0 0 17 11" fill="${f}"><rect y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" width="3" height="11" rx="1"/></svg>
<svg width="22" height="11" viewBox="0 0 24 12" fill="none"><rect x=".5" y=".5" width="20" height="11" rx="3" stroke="${f}" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2" fill="${f}"/><path d="M22 4v4" stroke="${f}" stroke-width="2" stroke-linecap="round" opacity=".4"/></svg>
</div></div>`;
}
export function navBar(title, { back = true, action = '' } = {}) {
  return `<div class="nav-h">${back ? `<div style="width:34px;height:34px;border-radius:10px;background:var(--n100);display:grid;place-items:center">${ic('back', { s: 18, c: '#39415A', w: 2 })}</div>` : ''}
<span class="t-title-md">${title}</span><div class="sp"></div>${action}</div>`;
}
export const TABS = {
  student: [['home', 'الرئيسية'], ['car', 'رحلاتي'], ['wallet', 'المحفظة'], ['user', 'حسابي']],
  driver:  [['gauge', 'الكوكبِت'], ['car', 'رحلاتي'], ['cash', 'أرباحي'], ['user', 'حسابي']],
};

/** variant: 'a' hairline+tint (old) · 'b' soft shadow + tinted capsule
 *           'c' soft shadow + SOLID capsule + solid glyph  ← adopted
 *           'd' soft shadow + solid glyph + top indicator, no capsule */
export function tabBar(active, set = 'student', variant = 'c') {
  const tabs = TABS[set];
  return `<div class="tabs v${variant}">${tabs.map(([n, l], i) => {
    const on = i === active;
    const glyph = (variant === 'a' || variant === 'b')
      ? ic(n, { s: variant === 'a' ? 19 : 21, c: on ? '#0E47B4' : '#67728A', w: on ? 2.15 : 1.8 })
      : (on ? icf(n, { s: 22, c: variant === 'c' ? '#fff' : '#1259E3' })
            : ic(n, { s: 21, c: '#67728A', w: 1.8 }));
    return `<div class="tab${on ? ' on' : ''}"><div class="tic">${glyph}</div><span>${l}</span></div>`;
  }).join('')}</div>`;
}

// ── pieces ───────────────────────────────────────────────────────────────
export function pill(text, tone = 'mute', glyph = '') {
  const g = glyph ? `<span class="i i-${glyph}"></span>` : '';
  return `<span class="pill pill-${tone}">${g}${text}</span>`;
}
export function row({ icon, tone = '', title, sub = '', trail = '', chev = true, iconColor = '#1259E3' }) {
  return `<div class="lr">
${icon ? `<div class="ic ${tone}">${ic(icon, { s: 18, c: iconColor })}</div>` : ''}
<div class="col" style="gap:1px;flex:1;min-width:0">
  <span class="t-title-sm bold">${title}</span>
  ${sub ? `<span class="t-caption" style="color:var(--n500)">${sub}</span>` : ''}
</div>${trail}${chev ? `<span class="chev">${ic('chev', { s: 17, c: '#96A0B2', w: 2 })}</span>` : ''}</div>`;
}
export function money(v, { size = 't-title-md', color = 'var(--n900)', cur = 'د.أ' } = {}) {
  return `<span class="row" style="align-items:baseline;gap:4px"><span class="${size} num" style="color:${color}">${v}</span><span class="t-caption" style="color:var(--n500);unicode-bidi:isolate">${cur}</span></span>`;
}
export function btn(label, variant = 'primary', extra = '') {
  return `<button class="btn btn-${variant}" ${extra}>${label}</button>`;
}
export function field(label, value, { ph = false, state = '', hint = '', icon = '' } = {}) {
  return `<div class="col" style="gap:6px">
<span class="t-label" style="color:var(--n600)">${label}</span>
<div class="input ${ph ? 'ph' : ''} ${state}" style="gap:9px">${icon ? ic(icon, { s: 17, c: '#67728A' }) : ''}<span style="flex:1">${value}</span></div>
${hint ? `<span class="row t-caption" style="gap:5px;color:var(--${state === 'err' ? 'bad' : 'n500'})">${state === 'err' ? `<span class="i i-bad"></span>` : ''}${hint}</span>` : ''}</div>`;
}
export function seg(items, active) {
  return `<div class="seg">${items.map((t, i) => `<div class="${i === active ? 'on' : ''}">${t}</div>`).join('')}</div>`;
}

/** ═══ THE MARK — one definition, no copies ═══════════════════════════════
 * «الطريق هو الحرف» — the Arabic letter Raa is written from the upper right
 * down to the left, which is the shape of a journey. Three parts only:
 *   open ring  → origin, open because the journey has not started
 *   curve      → the route, and it IS the body of the letter
 *   solid dot  → destination, solid because it was reached
 *
 * The destination dot is AMBER. That is the single sanctioned use of a second
 * colour in the identity: the arrival is the payoff, so it carries the accent.
 * Amber appears nowhere else except the `live` state on maps.
 */
export function mark(size, { path = '#1259E3', dot = '#F59E0B', w = 7 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">
  <circle cx="70" cy="26" r="8.5" stroke="${path}" stroke-width="${w}"/>
  <path d="M70 43.5 C70 58 60 68 45 72" stroke="${path}" stroke-width="${w}" stroke-linecap="round"/>
  <circle cx="27" cy="73.5" r="7.5" fill="${dot}"/></svg>`;
}

/** The mark on a dark surface: white path, amber destination. */
export const markOnDark = (size) => mark(size, { path: '#fff' });
/** Single-colour fallback for print, 16px favicons and embroidery. */
export const markMono = (size, c = '#1259E3') => mark(size, { path: c, dot: c });

/** A near-monochrome city, faint enough to sit under a logo. For splashes.
 * Blocks are small and many so it reads as a city, not a grid of cards. The
 * layout is deterministic (seeded) so the asset is reproducible byte-for-byte. */
export function mapGhost({ w = 390, h = 844, tint = 'rgba(18,89,227,.07)',
  road = 'rgba(18,89,227,.10)', routeC = 'rgba(18,89,227,.26)', seed = 7 } = {}) {
  let z = seed;
  const rnd = () => (z = (z * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  // three road tiers: two arterials, four collectors, the rest are lanes
  const ax = [0.30, 0.70], ay = [0.26, 0.62];
  const cx = [0.13, 0.47, 0.86], cy = [0.13, 0.44, 0.79, 0.92];
  const band = (o) => `<div style="position:absolute;${o}"></div>`;
  let out = '';
  for (const f of ax) out += band(`left:${(w * f - 4).toFixed(1)}px;top:0;width:8px;height:${h}px;background:${road}`);
  for (const f of ay) out += band(`left:0;top:${(h * f - 4).toFixed(1)}px;width:${w}px;height:8px;background:${road}`);
  for (const f of cx) out += band(`left:${(w * f - 2).toFixed(1)}px;top:0;width:4px;height:${h}px;background:${road};opacity:.62`);
  for (const f of cy) out += band(`left:0;top:${(h * f - 2).toFixed(1)}px;width:${w}px;height:4px;background:${road};opacity:.62`);

  // city blocks: small, many, jittered, never crossing a road
  const xs = [0, ...cx, ...ax, 1].sort((a, b) => a - b);
  const ys = [0, ...cy, ...ay, 1].sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = w * xs[i] + 7, x1 = w * xs[i + 1] - 7;
      const y0 = h * ys[j] + 7, y1 = h * ys[j + 1] - 7;
      if (x1 - x0 < 16 || y1 - y0 < 14) continue;
      const cols = Math.max(1, Math.round((x1 - x0) / 52));
      const rows = Math.max(1, Math.round((y1 - y0) / 46));
      for (let a = 0; a < cols; a++) {
        for (let b = 0; b < rows; b++) {
          if (rnd() < 0.46) continue;                       // gaps: courtyards, lots, parks
          const cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
          const pw = cw * (0.34 + rnd() * 0.52), ph = ch * (0.30 + rnd() * 0.55);
          out += band(`left:${(x0 + a * cw + (cw - pw) / 2).toFixed(1)}px;top:${(y0 + b * ch + (ch - ph) / 2).toFixed(1)}px;`
            + `width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px;background:${tint};border-radius:2.5px`);
        }
      }
    }
  }

  // one journey traced along the arterials, origin ring to destination dot
  const P = [[0.13, 0.92], [0.13, 0.62], [0.30, 0.62], [0.30, 0.26], [0.70, 0.26], [0.70, 0.13], [0.86, 0.13]];
  const d = P.map(([x, y], i) => `${i ? 'L' : 'M'}${(w * x).toFixed(1)} ${(h * y).toFixed(1)}`).join(' ');
  out += `<svg style="position:absolute;inset:0" width="${w}" height="${h}" fill="none">
    <path d="${d}" stroke="${routeC}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="15 11"/>
    <circle cx="${(w * P[0][0]).toFixed(1)}" cy="${(h * P[0][1]).toFixed(1)}" r="6.5" stroke="${routeC}" stroke-width="4"/>
    <circle cx="${(w * P[P.length - 1][0]).toFixed(1)}" cy="${(h * P[P.length - 1][1]).toFixed(1)}" r="5.5" fill="${routeC}"/>
  </svg>`;
  return `<div style="position:absolute;inset:0;overflow:hidden">${out}</div>`;
}

/** A light, clean map surface with roads, blocks, a route and pins. */
export function mapBg({ h = 844, route = '', pins = [], live = null, eta = '' } = {}) {
  return `<div class="map" style="height:${h}px">
  <div class="grn" style="left:-20px;top:${h * .15}px;width:120px;height:100px"></div>
  <div class="grn" style="right:-28px;top:${h * .48}px;width:140px;height:110px"></div>
  <div class="blk" style="left:32px;top:${h * .30}px;width:74px;height:58px"></div>
  <div class="blk" style="left:124px;top:${h * .28}px;width:60px;height:50px"></div>
  <div class="blk" style="right:38px;top:${h * .25}px;width:82px;height:66px"></div>
  <div class="blk" style="left:54px;top:${h * .52}px;width:92px;height:54px"></div>
  <div class="blk" style="right:48px;top:${h * .56}px;width:68px;height:60px"></div>
  <div class="rdm" style="left:0;top:${h * .38}px;width:390px;height:10px"></div>
  <div class="rdm" style="left:184px;top:${h * .10}px;width:10px;height:${h * .62}px"></div>
  <div class="rd" style="left:0;top:${h * .245}px;width:390px;height:5px"></div>
  <div class="rd" style="left:84px;top:${h * .13}px;width:5px;height:${h * .58}px"></div>
  <div class="rd" style="right:92px;top:${h * .16}px;width:5px;height:${h * .52}px"></div>
  ${route ? `<svg style="position:absolute;inset:0" width="390" height="${h}"><path class="rt-c" d="${route}"/><path class="rt" d="${route}"/></svg>` : ''}
  ${pins.map(p => `<div class="pin" style="left:${p.x}px;top:${p.y}px"><svg width="28" height="37" viewBox="0 0 30 40"><path d="M15 1C7.3 1 1 7.3 1 15c0 10 14 24 14 24s14-14 14-24C29 7.3 22.7 1 15 1z" fill="${p.c}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg></div>`).join('')}
  ${live ? `<div class="disc" style="left:${live.x}px;top:${live.y}px"><svg width="19" height="19" viewBox="0 0 24 24" fill="#0E1524"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11v6a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1z"/></svg></div>` : ''}
  ${eta ? `<div class="eta" style="left:${live.x}px;top:${live.y + 20}px">${eta}</div>` : ''}
</div>`;
}

// ── sheet scaffolding ────────────────────────────────────────────────────
export function frame(inner) { return `<div class="frame">${inner}</div>`; }
export function cell(n, title, desc, inner) {
  return `<div class="cell"><div class="cap"><div><span class="n">${n}</span><span class="t">${title}</span></div>
<div class="d">${desc}</div></div>${frame(inner)}</div>`;
}
export function page({ title, sub, width = 1420, cells = [], notes = [], extra = '' }) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:${width}px}</style></head><body><div class="sheet-body">
<div class="sheet-h">
  <div class="mk">${markOnDark(30)}</div>
  <div><h1>${title}</h1><div class="sub">${sub}</div></div>
</div>
${extra}
<div class="grid">${cells.join('')}</div>
${notes.map(n => `<div class="note ${n.t || ''}">${n.b}</div>`).join('')}
</div></body></html>`;
}
