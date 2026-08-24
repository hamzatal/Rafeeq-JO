import { ic } from './ui.mjs';
const B = '#1259E3', OK = '#047857';

export const NAV = [
  ['العمليات', [['chart', 'لوحة القيادة'], ['send', 'الطلبات الحيّة', '14', 'hot'], ['car', 'الرحلات'], ['sparkle', 'الرؤى والتحليلات']]],
  ['الشبكة', [['user', 'الكباتن', '6', 'wrm'], ['school', 'الطلاب'], ['map', 'الجغرافيا والمسارات']]],
  ['المالية', [['wallet', 'المدفوعات', '23', 'hot'], ['cash', 'السحوبات', '4', 'wrm'], ['chart', 'التسعير والخطط'], ['file', 'التقارير']]],
  ['الثقة والنظام', [['shield', 'السلامة و SOS', '2', 'hot'], ['msg', 'الدعم والشكاوى', '9', 'wrm'], ['id', 'النزاعات'], ['lock', 'الأمان والتدقيق'], ['user', 'الإعدادات والموظفون']]],
];

export function shell(activeLabel, title, sub, body, actions = '') {
  const nav = NAV.map(([g, items]) => `
    <div class="agrp">${g}</div>
    ${items.map(([i, l, n, k]) => {
    const on = l === activeLabel;
    return `<div class="anav${on ? ' on' : ''}">${ic(i, { s: 17, c: on ? '#0E47B4' : '#39415A', w: 1.9 })}
      <span style="flex:1">${l}</span>${n ? `<span class="an ${k}">${n}</span>` : ''}</div>`;
  }).join('')}`).join('');

  return `<div class="admin">
  <aside>
    <div class="abrand"><div class="amk"><svg width="22" height="22" viewBox="0 0 96 96" fill="none">
      <circle cx="70" cy="26" r="8.5" stroke="#fff" stroke-width="7"/>
      <path d="M70 43.5 C70 58 60 68 45 72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <circle cx="27" cy="73.5" r="7.5" fill="#fff"/></svg></div>
      <div class="col" style="gap:0"><span style="font:700 15px 'IBM Plex Sans Arabic'">رفيق</span>
        <span style="font:400 10px 'IBM Plex Sans Arabic';color:var(--n500)">لوحة التحكّم</span></div></div>
    <div style="flex:1;overflow:hidden">${nav}</div>
    <div class="auser"><div class="av" style="width:30px;height:30px;font-size:13px">ح</div>
      <div class="col" style="gap:0"><span style="font:600 11.5px 'IBM Plex Sans Arabic'">حمزة الطعاني</span>
        <span style="font:400 10px 'IBM Plex Sans Arabic';color:var(--n500)">مدير النظام</span></div></div>
  </aside>
  <main>
    <div class="atop">
      <div class="asrch">${ic('search', { s: 15, c: '#67728A', w: 2 })}
        <span class="t-body" style="color:var(--n500);flex:1">ابحث أو نفّذ أمراً…</span>
        <span class="akbd ltr">Ctrl K</span></div>
      <div class="sp"></div>
      <span class="pill pill-ok"><span class="i i-dok"></span>النظام سليم</span>
      <div style="width:1px;height:22px;background:var(--n200)"></div>
      ${ic('bell', { s: 18, c: '#39415A' })}
    </div>
    <div class="acont">
      <div class="row" style="margin-bottom:16px">
        <div class="col" style="gap:1px"><span class="t-title-lg">${title}</span>
          <span class="t-body" style="color:var(--n600)">${sub}</span></div>
        <div class="sp"></div>${actions}
      </div>
      ${body}
    </div>
  </main></div>`;
}

export function table(cols, rows) {
  return `<div class="apanel"><table>
  <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function kpi(label, value, cur, barPct, barColor, foot, footColor) {
  return `<div class="akpi"><span class="t-label" style="color:var(--n500)">${label}</span>
  <div class="row" style="align-items:baseline;gap:4px;margin:1px 0 10px">
    <span class="t-display num" style="unicode-bidi:isolate">${value}</span>${cur ? `<span class="t-label" style="color:var(--n600);unicode-bidi:isolate">${cur}</span>` : ''}</div>
  <div class="abar"><i style="width:${barPct}%;background:${barColor}"></i></div>
  <div class="t-caption" style="color:${footColor};margin-top:5px;font-weight:500">${foot}</div></div>`;
}

export function panel(title, body, action = '') {
  return `<div class="apanel"><div class="aph"><span class="t-title-md" style="font-size:15px">${title}</span>
  <div class="sp"></div>${action}</div>${body}</div>`;
}

export const ADMIN_CSS = `
.admin{width:1280px;height:820px;display:flex;background:var(--n50);overflow:hidden;
  border-radius:12px;border:1px solid var(--n300);box-shadow:0 14px 34px rgba(14,21,36,.14)}
.admin aside{width:216px;flex-shrink:0;background:#fff;border-inline-end:1px solid var(--n200);display:flex;flex-direction:column}
.abrand{padding:13px 15px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--n200)}
.amk{width:32px;height:32px;border-radius:9px;background:${B};display:grid;place-items:center}
.agrp{font:700 9px 'IBM Plex Sans Arabic';letter-spacing:.12em;color:var(--n400);padding:0 16px;margin:12px 0 4px}
.anav{display:flex;align-items:center;gap:9px;margin:1px 7px;padding:7px 10px;border-radius:9px;
  font:500 12px 'IBM Plex Sans Arabic';color:var(--n700)}
.anav.on{background:var(--b50);color:var(--b700);font-weight:700;box-shadow:inset 3px 0 0 ${B}}
.an{font:700 10px 'IBM Plex Sans Arabic';background:var(--n100);color:var(--n600);border-radius:999px;padding:1px 6px}
.an.hot{background:var(--bad);color:#fff}.an.wrm{background:var(--warn-soft);color:var(--warn)}
.auser{padding:9px;border-top:1px solid var(--n200);display:flex;align-items:center;gap:8px}
.admin main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.atop{height:52px;background:#fff;border-bottom:1px solid var(--n200);display:flex;align-items:center;gap:12px;padding:0 20px;flex-shrink:0}
.asrch{flex:1;max-width:340px;height:34px;border:1px solid var(--n300);border-radius:9px;display:flex;align-items:center;gap:8px;padding:0 11px}
.akbd{font:600 10px 'IBM Plex Sans Arabic';background:var(--n100);border-radius:5px;padding:1px 6px;color:var(--n600)}
.acont{padding:18px 20px;overflow:hidden}
.akpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:16px}
.akpi{background:#fff;border:1px solid var(--n200);border-radius:14px;padding:13px 14px}
.abar{height:6px;border-radius:999px;background:var(--n100);overflow:hidden}
.abar i{display:block;height:100%;border-radius:999px}
.apanel{background:#fff;border:1px solid var(--n200);border-radius:14px;overflow:hidden}
.aph{padding:11px 14px;border-bottom:1px solid var(--n200);display:flex;align-items:center}
.admin table{width:100%;border-collapse:collapse}
.admin thead th{background:var(--n50);color:var(--n700);font:700 10px 'IBM Plex Sans Arabic';letter-spacing:.04em;
  padding:9px 14px;text-align:right;border-bottom:1px solid var(--n200)}
.admin tbody td{padding:9px 14px;border-bottom:1px solid var(--n100);font-size:12px}
.admin tbody tr:nth-child(even){background:var(--n25)}
.admin tbody tr:last-child td{border-bottom:none}
.a2{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}
.acell{width:1280px}
.ascale{transform:scale(.5);transform-origin:top right;width:1280px;height:820px}
.ascale-wrap{width:640px;height:410px;overflow:hidden}
`;
