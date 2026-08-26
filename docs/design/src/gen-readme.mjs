import { writeFileSync } from 'fs';
import { ic, statusBar, tabBar, pill, row, money, btn, seg, mapBg } from './ui.mjs';
import { shell, table, kpi, panel, ADMIN_CSS } from './admin.mjs';

const B = '#1259E3', OK = '#047857', LIVE = '#F59E0B';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const cur = `<span style="unicode-bidi:isolate">د.أ</span>`;

const MARK = (size, c = '#1259E3', dot = null) => `<svg width="${size}" height="${size}" viewBox="0 0 96 96" fill="none">
  <circle cx="70" cy="26" r="8.5" stroke="${c}" stroke-width="7"/>
  <path d="M70 43.5 C70 58 60 68 45 72" stroke="${c}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="27" cy="73.5" r="7.5" fill="${dot || c}"/></svg>`;

const page = (w, body, extraCss = '') => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:${w}px;background:#fff}${extraCss}</style></head><body>${body}</body></html>`;

/* ═════════════════════ SCREENS ═════════════════════
   Bottom sheets use `bottom:` with NO height so they hug their content —
   a fixed height leaves a dead white band under the last element. */

const homeScreen = `
${mapBg({ route: 'M120,470 L120,392 L188,392 L188,250 L268,250', pins: [{ x: 120, y: 470, c: B }, { x: 268, y: 250, c: OK }], live: { x: 196, y: 340 }, eta: 'كابتن · 4 دقائق' })}
${statusBar()}
<div style="position:absolute;top:44px;inset-inline:16px;display:flex;align-items:center;gap:9px;z-index:60">
  <div class="gpill"><div class="av">ح</div>
    <div class="col" style="gap:0"><span class="t-label bold">صباح الخير، حمزة</span>
      <span class="t-caption" style="color:var(--n500)">جامعة اليرموك · إربد</span></div></div>
  <div class="sp"></div>
  <div class="fab" style="position:relative">${ic('bell', { s: 19 })}
    <div style="position:absolute;top:8px;inset-inline-end:9px;width:8px;height:8px;border-radius:50%;background:var(--bad);border:2px solid #fff"></div></div></div>
<div class="bs" style="bottom:64px"><div class="grab"></div>
  <span class="t-title-md">إلى أين؟</span>
  <div class="input ph" style="margin:11px 0 12px;gap:9px">${ic('search', { s: 18, c: '#67728A' })}<span>ابحث عن وجهة</span></div>
  ${row({ icon: 'home', tone: 'g', iconColor: '#4E5872', title: 'البيت', sub: 'حي الجامعة', trail: `<span class="t-label num" style="color:var(--n600)">1.750</span>` , chev: false })}
  ${row({ icon: 'school', title: 'جامعة اليرموك', sub: 'البوابة الشمالية', trail: `<span class="t-label num" style="color:var(--n600)">1.250</span>`, chev: false })}
  <div style="height:8px"></div>
</div>${tabBar(0)}`;

const rideScreen = `
${mapBg({ h: 470, route: 'M120,380 L120,300 L188,300 L188,170 L268,170', pins: [{ x: 120, y: 380, c: B }, { x: 268, y: 170, c: OK }] })}
${statusBar()}
<div class="bs" style="bottom:0"><div class="grab"></div>
  <span class="t-label" style="color:var(--n500)">اختر نوع الرحلة</span>
  <div style="background:var(--b50);border:1.5px solid ${B};border-radius:16px;padding:12px;margin:8px 0;display:flex;align-items:center;gap:12px">
    <div style="width:42px;height:42px;border-radius:12px;background:#fff;display:grid;place-items:center">${ic('school', { s: 22, c: B, w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><div class="row" style="gap:6px"><span class="t-title-sm bold">مشتركة</span>${pill('الأوفر', 'info')}</div>
      <span class="t-caption" style="color:var(--n600)">مع طلاب من منطقتك · 4 دقائق</span></div>${money('1.500')}</div>
  <div class="card" style="padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
    <div class="ic g" style="width:42px;height:42px">${ic('car', { s: 22, c: '#4E5872', w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><span class="t-title-sm bold">منفردة</span>
      <span class="t-caption" style="color:var(--n600)">السيارة كاملة لك · انطلاق فوري</span></div>
    ${money('5.250', { color: 'var(--n700)' })}</div>
  <div class="card flush" style="margin:14px 0">
    <div class="lr">${ic('wallet', { s: 19, c: B })}
      <div class="col" style="gap:0;flex:1"><span class="t-title-sm bold">المحفظة</span>
        <span class="t-caption num" style="color:var(--ok)">الرصيد 12.500 ${cur} — كافٍ</span></div>
      <div style="width:19px;height:19px;border-radius:50%;background:${B};display:grid;place-items:center">${ic('check', { s: 11, c: '#fff', w: 4 })}</div></div></div>
  <div class="row" style="margin-bottom:11px"><span class="t-body" style="color:var(--n600)">الإجمالي</span><div class="sp"></div>${money('1.500', { size: 't-title-lg' })}</div>
  ${btn('اطلب الآن')}<div style="height:14px"></div></div>`;

const liveTrip = `
${mapBg({ h: 560, route: 'M120,480 L120,400 L188,400 L188,270 L268,270', pins: [{ x: 120, y: 480, c: B }, { x: 268, y: 270, c: OK }], live: { x: 188, y: 370 }, eta: '3 دقائق' })}
${statusBar()}
<div class="fab" style="inset-inline-start:16px;top:56px;width:44px;height:44px;background:var(--bad)">${ic('shield', { s: 20, c: '#fff', w: 2.2 })}</div>
<div class="bs" style="bottom:0"><div class="grab"></div>
  <div class="row" style="gap:0;margin-bottom:16px">
    ${[['تم الطلب', 1], ['قُبلت', 1], ['الكابتن قادم', 2], ['في الطريق', 0], ['وصلت', 0]].map(([l, st], i, a) => `
    <div class="col" style="flex:1;align-items:center;gap:5px">
      <div class="row" style="width:100%;gap:0">
        <div style="flex:1;height:2px;background:${i > 0 ? (st ? OK : 'var(--n200)') : 'transparent'}"></div>
        <div style="width:${st === 2 ? 13 : 10}px;height:${st === 2 ? 13 : 10}px;border-radius:50%;flex-shrink:0;
          background:${st === 2 ? B : st ? OK : '#fff'};${st ? '' : 'border:2px solid var(--n300)'};${st === 2 ? 'box-shadow:0 0 0 4px var(--b100)' : ''}"></div>
        <div style="flex:1;height:2px;background:${i < a.length - 1 ? (a[i + 1][1] ? OK : 'var(--n200)') : 'transparent'}"></div>
      </div>
      <span class="t-caption" style="color:${st === 2 ? 'var(--n900)' : st ? 'var(--ok)' : 'var(--n500)'};font-weight:${st === 2 ? 700 : 400};text-align:center">${l}</span></div>`).join('')}
  </div>
  <div class="card" style="padding:12px;margin-bottom:12px">
    <div class="row" style="gap:11px"><div class="av" style="width:44px;height:44px;font-size:18px">م</div>
      <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold">محمد العبداللات</span>
        <div class="row" style="gap:5px"><span class="i i-star"></span><span class="t-caption num" style="color:var(--n600)">4.9 · هيونداي i10 فضّي</span></div></div>
      <div class="col" style="align-items:center;gap:2px"><span class="t-title-md num ltr">42-1839</span>
        <span class="t-caption" style="color:var(--n500)">اللوحة</span></div></div>
    <div class="row" style="gap:9px;margin-top:12px">
      <button class="btn btn-secondary btn-sm" style="flex:1">${ic('msg', { s: 16, c: '#0E47B4' })} رسالة</button>
      <button class="btn btn-secondary btn-sm" style="flex:1">${ic('phone', { s: 16, c: '#0E47B4' })} اتصال</button></div></div>
  <div class="card" style="padding:12px;background:var(--live-soft);border-color:#F5D89B">
    <div class="row" style="gap:9px"><span class="i i-live"></span>
      <span class="t-label" style="color:#7C4A03;font-weight:700">رمز الصعود: <span class="num ltr">741302</span></span>
      <div class="sp"></div><span class="t-caption" style="color:#7C4A03">أعطِه للكابتن</span></div></div>
  <div style="height:14px"></div></div>`;

const wallet = `
${statusBar()}<div class="nav-h"><span class="t-title-lg">المحفظة</span></div>
<div class="body">
  <div class="card" style="margin-bottom:12px"><span class="t-label" style="color:var(--n500)">الرصيد المتاح</span>
    <div class="row" style="align-items:baseline;gap:5px;margin-top:1px">
      <span class="num" style="font:700 30px/36px 'IBM Plex Sans Arabic'">12.500</span>
      <span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span></div>
    <div class="row" style="gap:9px;margin-top:14px">
      <button class="btn btn-primary btn-sm" style="flex:1">${ic('plus', { s: 16, c: '#fff', w: 2.4 })} شحن الرصيد</button>
      <button class="btn btn-secondary btn-sm" style="flex:1">خطّي الشهري</button></div></div>
  ${seg(['الحركات', 'الشحنات'], 0)}<div style="height:12px"></div>
  <div class="card flush">
    ${[['رحلة — اليرموك', 'اليوم 8:12 ص', '-1.050', 'bad', ''],
       ['شحن عبر CliQ', 'أمس 6:40 م', '+10.000', 'ok', 'معتمد'],
       ['شحن عبر CliQ', 'أمس 2:15 م', '+5.000', 'wait', 'قيد المراجعة'],
       ['كوبون STUDENT20', 'قبل 3 أيام', '+2.000', 'ok', ''],
       ['رحلة — دوار الشهداء', 'قبل 4 أيام', '-1.750', 'bad', ''],
       ['رحلة — اليرموك', 'قبل 4 أيام', '-1.050', 'bad', ''],
       ['استرداد رحلة ملغاة', 'قبل 5 أيام', '+1.250', 'ok', 'تلقائي']].map(([t, d, m, k, badge]) => {
      const up = m.startsWith('+'); const tone = k === 'wait' ? 'wr' : up ? 'ok' : 'bad';
      const col = k === 'wait' ? '#B45309' : up ? OK : '#D92D20';
      return `<div class="lr"><div class="ic ${tone}">${ic(k === 'wait' ? 'clock' : up ? 'cash' : 'car', { s: 17, c: col })}</div>
        <div class="col" style="gap:2px;flex:1;min-width:0"><span class="t-title-sm bold">${t}</span>
          <div class="row" style="gap:6px"><span class="t-caption" style="color:var(--n500)">${d}</span>
          ${badge ? pill(badge, k === 'wait' ? 'warn' : 'ok', k === 'wait' ? 'wait' : 'ok') : ''}</div></div>
        <span class="t-title-sm num bold" style="color:${k === 'wait' ? 'var(--n500)' : col}">${m}</span></div>`; }).join('')}
  </div></div>${tabBar(2)}`;

const topup = `
${statusBar()}<div class="nav-h">${ic('back', { s: 20 })}<span class="t-title-lg">شحن الرصيد</span></div>
<div class="body">
  <span class="t-label" style="color:var(--n500)">اختر المبلغ</span>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:9px 0 16px">
    ${[['5.000', 0], ['10.000', 1], ['20.000', 0], ['30.000', 0], ['50.000', 0], ['مبلغ آخر', 0]].map(([v, on]) => `
    <div style="height:52px;border-radius:14px;display:grid;place-items:center;
      background:${on ? 'var(--b50)' : '#fff'};border:${on ? `1.5px solid ${B}` : '1px solid var(--n200)'}">
      <span class="t-title-sm num bold" style="color:${on ? 'var(--b700)' : 'var(--n800)'}">${v}</span></div>`).join('')}
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="row" style="gap:10px;margin-bottom:12px">
      <div class="ic">${ic('wallet', { s: 19, c: B })}</div>
      <div class="col" style="gap:1px;flex:1"><span class="t-title-sm bold">تحويل عبر CliQ</span>
        <span class="t-caption" style="color:var(--n600)">من أي بنك أردني · بلا عمولة</span></div>
      <div style="width:19px;height:19px;border-radius:50%;background:${B};display:grid;place-items:center">${ic('check', { s: 11, c: '#fff', w: 4 })}</div></div>
    <div style="background:var(--n50);border-radius:12px;padding:11px 13px">
      <div class="row" style="margin-bottom:7px"><span class="t-caption" style="color:var(--n500)">الاسم المستعار</span>
        <div class="sp"></div><span class="t-label num ltr bold">RAFEEQ</span></div>
      <div class="row"><span class="t-caption" style="color:var(--n500)">المرجع الإلزامي</span>
        <div class="sp"></div><span class="t-label num ltr bold">RFQ-8241-HZ</span></div></div></div>
  <div class="card" style="padding:12px;background:var(--warn-soft);border-color:#EFCFA0;margin-bottom:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('alert', { s: 17, c: '#B45309', w: 2 })}
      <span class="t-caption" style="color:#7C4A03;flex:1;line-height:19px">اكتب المرجع في خانة الملاحظات، وارفع صورة الإشعار.
      تُراجع الشحنة يدوياً خلال ساعتين في أوقات العمل — ولا تُقيَّد إلا بعد الاعتماد.</span></div></div>
  <div style="border:1.5px dashed var(--n300);border-radius:14px;height:96px;display:grid;place-items:center">
    <div class="col" style="align-items:center;gap:6px">${ic('cam', { s: 24, c: '#67728A', w: 1.7 })}
      <span class="t-caption" style="color:var(--n600)">أرفق صورة إشعار التحويل</span></div></div>
</div>
<div style="position:absolute;inset-inline:0;bottom:64px;background:#fff;border-top:1px solid var(--n100);
  padding:12px 16px;z-index:55">${btn('أرسل للمراجعة')}</div>${tabBar(2)}`;

const cockpitScreen = `
${statusBar()}
<div class="nav-h"><div class="av" style="width:38px;height:38px;font-size:16px">م</div>
  <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">لوحة الكابتن</span>
    <span class="t-title-md">محمد العبداللات</span></div><div class="sp"></div>${pill('معتمد', 'ok', 'ok')}</div>
<div class="body">
  <div style="background:${OK};border-radius:16px;height:60px;display:flex;align-items:center;padding:0 16px;gap:13px">
    <div style="width:48px;height:29px;border-radius:999px;background:rgba(255,255,255,.32);display:flex;align-items:center;padding:3px;justify-content:flex-end">
      <div style="width:23px;height:23px;border-radius:50%;background:#fff"></div></div>
    <div class="col" style="gap:0"><span style="font:700 16px 'IBM Plex Sans Arabic';color:#fff">متصل — تستقبل الطلبات</span>
      <span style="font:400 11px 'IBM Plex Sans Arabic';color:rgba(255,255,255,.85)">اضغط لإيقاف الاستقبال</span></div></div>
  <div style="height:11px"></div>
  <div class="card" style="margin-bottom:11px"><span class="t-label" style="color:var(--n500)">أرباح اليوم</span>
    <div class="row" style="align-items:baseline;gap:5px;margin-top:1px">
      <span class="num" style="font:700 30px/36px 'IBM Plex Sans Arabic'">18.750</span>
      <span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span>
      <div class="sp"></div>${pill('12% عن أمس', 'ok', 'up')}</div>
    <div class="row" style="gap:0;margin-top:13px;padding-top:12px;border-top:1px solid var(--n100)">
      <div class="col" style="flex:1;gap:1px"><span class="t-caption" style="color:var(--n500)">رحلات</span><span class="t-title-sm num bold">7</span></div>
      <div style="width:1px;height:28px;background:var(--n200)"></div>
      <div class="col" style="flex:1;gap:1px;padding-inline-start:13px"><span class="t-caption" style="color:var(--n500)">ساعات</span><span class="t-title-sm num bold">5.5</span></div>
      <div style="width:1px;height:28px;background:var(--n200)"></div>
      <div class="col" style="flex:1;gap:1px;padding-inline-start:13px"><span class="t-caption" style="color:var(--n500)">تقييمي</span>
        <div class="row" style="gap:4px"><span class="i i-star"></span><span class="t-title-sm num bold">4.9</span></div></div></div></div>
  <div class="card" style="margin-bottom:11px"><div class="row">
      <span class="t-title-sm bold">ذروة جامعة اليرموك</span><div class="sp"></div>
      <span class="t-caption" style="color:var(--n500)">أعلى طلب</span></div>
    <div class="row" style="gap:8px;margin-top:10px">
      <div style="flex:1;background:var(--live-soft);border:1px solid #F5D89B;border-radius:12px;padding:9px 11px">
        <div class="col" style="gap:1px"><span class="t-caption" style="color:#7C4A03">الذهاب</span>
          <span class="t-label num bold" style="color:#7C4A03;direction:ltr;unicode-bidi:isolate">7:30 – 9:00</span></div></div>
      <div style="flex:1;background:var(--live-soft);border:1px solid #F5D89B;border-radius:12px;padding:9px 11px">
        <div class="col" style="gap:1px"><span class="t-caption" style="color:#7C4A03">العودة</span>
          <span class="t-label num bold" style="color:#7C4A03;direction:ltr;unicode-bidi:isolate">2:00 – 4:00</span></div></div></div></div>
  <div style="height:132px;border-radius:16px;overflow:hidden;position:relative;border:1px solid var(--n200);margin-bottom:11px">
    ${mapBg({ h: 132, live: { x: 190, y: 68 } })}</div>
  <div class="card flush">
    ${row({ icon: 'car', title: 'رحلاتي' })}
    ${row({ icon: 'cash', title: 'أرباحي والسحب', trail: `<span class="t-label" style="color:var(--n600)"><span class="num">142.500</span> ${cur}</span>` })}
    ${row({ icon: 'file', title: 'وثائقي ورخصتي', trail: pill('سارية', 'ok', 'ok') })}</div>
</div>${tabBar(0, 'driver')}`;

const offer = `
${mapBg({ h: 844, route: 'M104,414 L104,340 L186,340 L186,232 L282,232', pins: [{ x: 282, y: 232, c: OK }], live: { x: 104, y: 414 } })}
${statusBar()}
<div style="position:absolute;inset-inline:0;bottom:0;background:#fff;border-radius:24px 24px 0 0;padding:16px;z-index:60;box-shadow:var(--sh-lg)">
  <div class="row" style="margin-bottom:12px">${pill('طلب جديد', 'live', 'live')}
    <span class="t-label" style="color:var(--n500)">رحلة فورية</span><div class="sp"></div>
    <div class="row" style="gap:7px"><span class="t-caption" style="color:var(--n500)">تنتهي بعد</span>
      <svg width="40" height="40" viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="#DDE3EC" stroke-width="6"/>
        <circle cx="30" cy="30" r="25" fill="none" stroke="${B}" stroke-width="6" stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="50" transform="rotate(-90 30 30)"/>
        <text x="30" y="37" text-anchor="middle" font-family="IBM Plex Sans Arabic" font-size="21" font-weight="700" fill="#0E1524">12</text></svg></div></div>
  <div class="row" style="align-items:baseline;gap:6px">
    <span class="num" style="font:700 38px/42px 'IBM Plex Sans Arabic';color:${OK}">1.900</span>
    <span class="t-title-md" style="color:var(--n600);unicode-bidi:isolate">د.أ</span><div class="sp"></div>
    <div class="col" style="align-items:flex-start;gap:0"><span class="t-caption" style="color:var(--n500)">صافي لك بعد العمولة</span>
      <span class="t-label num" style="color:var(--n600);unicode-bidi:isolate">الأجرة 2.100 · العمولة 0.200</span></div></div>
  <div class="row" style="gap:0;margin:15px 0;padding:12px 0;border-top:1px solid var(--n100);border-bottom:1px solid var(--n100)">
    <div class="col" style="flex:1;gap:1px"><span class="t-caption" style="color:var(--n500)">للطالب</span><span class="t-title-md num">1.8 كم</span></div>
    <div style="width:1px;height:32px;background:var(--n200)"></div>
    <div class="col" style="flex:1;gap:1px;padding-inline-start:14px"><span class="t-caption" style="color:var(--n500)">الرحلة</span><span class="t-title-md num">6.4 كم</span></div>
    <div style="width:1px;height:32px;background:var(--n200)"></div>
    <div class="col" style="flex:1;gap:1px;padding-inline-start:14px"><span class="t-caption" style="color:var(--n500)">الوقت</span><span class="t-title-md num">14 د</span></div></div>
  <div class="row" style="gap:10px;align-items:flex-start;margin-bottom:16px">
    <div class="col" style="align-items:center;gap:0;padding-top:5px">
      <div style="width:8px;height:8px;border-radius:50%;background:${B}"></div>
      <div style="width:2px;height:22px;background:var(--n300)"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${OK}"></div></div>
    <div class="col" style="flex:1;gap:12px"><span class="t-title-sm bold">حي الجامعة، شارع الملكة نور</span>
      <span class="t-title-sm bold">جامعة اليرموك — البوابة الشمالية</span></div></div>
  <div class="row" style="gap:10px">
    <button class="btn btn-primary" style="height:54px;flex:1;font-size:16px">اقبل الرحلة</button>
    <button class="btn btn-ghost" style="height:54px;flex:.42;font-size:15px">تجاهل</button></div></div>`;

/* ═════════════════════ 1 — HERO ═════════════════════ */
const heroPhone = (inner, rot, z, x, y) => `
<div style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${z};
  width:276px;height:597px;border-radius:29px;overflow:hidden;background:#fff;
  box-shadow:0 0 0 7px #131926, 0 24px 60px rgba(14,21,36,.3)">
  <div style="width:390px;height:844px;transform:scale(.7077);transform-origin:top right">${inner}</div></div>`;

out('r-hero.html', page(1600, `
<div style="position:relative;width:1600px;height:722px;overflow:hidden;display:flex;align-items:center;
  background:linear-gradient(135deg,#F7F9FC 0%,#EFF4FD 46%,#E4ECFB 100%)">
  <div style="position:absolute;right:-170px;top:-180px;width:600px;height:600px;border-radius:50%;background:rgba(18,89,227,.055)"></div>
  <div style="position:absolute;left:-140px;bottom:-240px;width:480px;height:480px;border-radius:50%;background:rgba(245,158,11,.06)"></div>

  <div style="flex:0 0 560px;margin-inline-start:68px;position:relative;z-index:20">
    <div class="row" style="gap:16px;margin-bottom:24px">
      ${MARK(62)}<span style="font:700 60px/1 'IBM Plex Sans Arabic';color:#0E1524">رفيق</span></div>
    <div style="font:700 32px/46px 'IBM Plex Sans Arabic';color:#0E1524;margin-bottom:14px">
      رفيقك في كل رحلة<br>من بيتك إلى جامعتك</div>
    <div style="font:400 17.5px/32px 'IBM Plex Sans Arabic';color:#39415A;margin-bottom:28px">
      نجمع طلاب المنطقة نفسها في رحلة واحدة إلى الجامعة — بسعر معروف قبل الطلب،
      وتتبّع حيّ على الخريطة، ودفع من المحفظة بلا نقد.</div>
    <div class="row" style="gap:9px;flex-wrap:wrap">
      <span class="pill pill-info" style="font-size:13.5px;padding:7px 14px">المقعد المشترك من 1.000 ${cur}</span>
      <span class="pill pill-ok" style="font-size:13.5px;padding:7px 14px"><span class="i i-ok"></span>سعر ثابت معلن</span>
      <span class="pill pill-live" style="font-size:13.5px;padding:7px 14px"><span class="i i-live"></span>تتبّع حيّ</span>
    </div>
  </div>

  <div style="flex:1;position:relative;height:722px">
    ${heroPhone(cockpitScreen, -7, 1, 92, 72)}
    ${heroPhone(rideScreen, 0, 3, 324, 48)}
    ${heroPhone(homeScreen, 7, 2, 556, 72)}
  </div>
</div>`));

/* ═════════════════════ 2 — LOGO ═════════════════════ */
out('r-logo.html', page(1400, `
<div style="padding:42px 48px;background:#fff">
  <div class="row" style="gap:44px;align-items:flex-start">
    <div style="flex:0 0 292px">
      <div style="background:var(--n50);border:1px solid var(--n200);border-radius:20px;padding:34px;display:grid;place-items:center">
        ${MARK(146)}</div>
      <div class="row" style="gap:13px;margin-top:16px;justify-content:center">
        ${MARK(38)}<span style="font:700 38px/1 'IBM Plex Sans Arabic';color:#0E1524">رفيق</span></div>
    </div>
    <div style="flex:1">
      <div style="font:700 25px 'IBM Plex Sans Arabic';margin-bottom:8px">«الطريق هو الحرف»</div>
      <div style="font:400 15.5px/28px 'IBM Plex Sans Arabic';color:var(--n700);margin-bottom:24px">
        حرف <b>الراء</b> يُكتب من أعلى اليمين نازلاً إلى اليسار — وهذا حرفياً مسار رحلة من نقطة انطلاق إلى وجهة.
        فالطريق ليس شكلاً مُلحقاً بالحرف، بل <b>الحرف نفسه هو الطريق</b>. لا سيارة ولا عجلة ولا دبّوس خريطة:
        العلامة تقول «حركة» بأقلّ عدد ممكن من الأشكال، وتبقى مقروءة حتى عند 18 بكسل.</div>
      <div class="row" style="gap:13px;align-items:stretch;margin-bottom:24px">
        ${[['الحلقة المفتوحة', 'نقطة الانطلاق — مفتوحة لأنّ الرحلة لم تبدأ', '#1259E3', '#DDE3EC', '#DDE3EC'],
           ['المنحنى', 'المسار — وهو جسم الحرف نفسه', '#DDE3EC', '#1259E3', '#DDE3EC'],
           ['النقطة المصمتة', 'الوجهة — مصمتة لأنّها تحقّقت', '#DDE3EC', '#DDE3EC', '#1259E3']].map(([t, d, a, b, c]) => `
        <div style="flex:1;background:#fff;border:1px solid var(--n200);border-radius:16px;padding:15px;text-align:center">
          <svg width="72" height="72" viewBox="0 0 96 96" fill="none" style="margin:0 auto 9px">
            <circle cx="70" cy="26" r="8.5" stroke="${a}" stroke-width="7"/>
            <path d="M70 43.5 C70 58 60 68 45 72" stroke="${b}" stroke-width="7" stroke-linecap="round"/>
            <circle cx="27" cy="73.5" r="7.5" fill="${c}"/></svg>
          <div style="font:700 13.5px 'IBM Plex Sans Arabic';color:var(--b700)">${t}</div>
          <div style="font:400 11.5px/18px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:3px">${d}</div></div>`).join('')}
      </div>
      <div class="row" style="gap:20px;align-items:flex-end">
        <div style="flex:1">
          <div style="font:700 14px 'IBM Plex Sans Arabic';margin-bottom:5px">أيقونة المتجر ومقاييس التصغير</div>
          <div style="font:400 12px/19px 'IBM Plex Sans Arabic';color:var(--n600)">
            الطالب أزرق مصمت، والكابتن أسود مع نقطة وصول كهرمانية ليفرّق التطبيقين على الشاشة نفسها.
            سماكة الخط ثابتة عند 7/96 فلا تختفي عند 18 بكسل.</div></div>
        ${[['#1259E3', '#fff', '#fff', 'الطالب'], ['#0E1524', '#fff', '#F59E0B', 'الكابتن']].map(([bg, st, dt, lbl]) => `
        <div style="text-align:center">
          <div style="width:84px;height:84px;border-radius:22.37%;background:${bg};display:grid;place-items:center">
            ${MARK(55, st, dt)}</div>
          <div style="font:500 11.5px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:7px">${lbl}</div></div>`).join('')}
        ${[72, 46, 28, 18].map(s => `
        <div style="text-align:center">
          <div style="width:${s}px;height:${s}px;border-radius:22.37%;background:#1259E3;display:grid;place-items:center">
            ${MARK(Math.round(s * .66), '#fff')}</div>
          <div style="font:400 10px 'IBM Plex Sans Arabic';color:var(--n500);margin-top:6px">${s}</div></div>`).join('')}
      </div>
    </div>
  </div>
</div>`));

/* ═════════════════════ 3 — PALETTE ═════════════════════ */
const sw = (v, name, ratio, dark) => `
<div style="flex:1;background:${v};height:104px;border-radius:12px;padding:11px 12px;display:flex;flex-direction:column;justify-content:space-between">
  <div style="font:700 12.5px 'IBM Plex Sans Arabic';color:${dark ? '#0E1524' : '#fff'}">${name}</div>
  <div>
    <div style="font:400 11px/1.5 ui-monospace,monospace;color:${dark ? '#39415A' : 'rgba(255,255,255,.9)'};direction:ltr">${v}</div>
    ${ratio ? `<div style="font:700 10.5px 'IBM Plex Sans Arabic';color:${dark ? '#4E5872' : 'rgba(255,255,255,.8)'};direction:ltr;unicode-bidi:isolate">${ratio}</div>` : ''}
  </div></div>`;

out('r-palette.html', page(1400, `
<div style="padding:34px 40px;background:#fff">
  <div style="font:700 20px 'IBM Plex Sans Arabic';margin-bottom:4px">هوية «مسار» — فاتحة أولاً</div>
  <div style="font:400 14px 'IBM Plex Sans Arabic';color:var(--n600);margin-bottom:20px">
    لون علامة واحد بلا لون ثانوي · كل نسبة تباين مذكورة أدناه محسوبة بمعادلة WCAG لا مقدَّرة بالنظر</div>
  <div class="row" style="gap:10px;margin-bottom:12px">
    ${sw('#EFF6FF', 'brand-50', '1.09', true)}${sw('#BFDBFE', 'brand-200', '1.42', true)}
    ${sw('#2E82F6', 'brand-500', '3.72', false)}${sw('#1259E3', 'brand-600 — المرساة', '5.89', false)}
    ${sw('#0E47B4', 'brand-700', '8.14', false)}${sw('#122F6B', 'brand-900', '12.77', false)}
  </div>
  <div class="row" style="gap:10px;margin-bottom:12px">
    ${sw('#F2F5F9', 'خلفية الشاشة', '1.09', true)}${sw('#FFFFFF', 'البطاقة', '—', true)}
    ${sw('#DDE3EC', 'الحدّ', '1.29', true)}${sw('#39415A', 'نص ثانوي', '10.11', false)}
    ${sw('#0E1524', 'النص الأساسي', '17.90', false)}${sw('#F59E0B', 'الحيّ · خرائط فقط', '8.49 بنص داكن', true)}
  </div>
  <div class="row" style="gap:10px;align-items:stretch">
    ${sw('#047857', 'نجاح', '5.48', false)}${sw('#D92D20', 'خطأ', '4.83', false)}
    ${sw('#B45309', 'تحذير', '5.02', false)}
    <div style="flex:3;background:var(--n50);border:1px solid var(--n200);border-radius:12px;padding:12px 14px;display:flex;align-items:center">
      <span style="font:400 12.5px/20px 'IBM Plex Sans Arabic';color:var(--n700)">
        <b>brand-600</b> هو المرساة: <b>5.89:1</b> في الاتجاهين — يعمل كنص على أبيض <b>وكحشوة تحمل نصاً أبيض</b>.
        والتراتُب يأتي من تدرّج واحد لا من لون ثانٍ: حشوة 600 مقابل حشوة 50 = <b>5.41:1</b>.</span></div>
  </div>
</div>`));

/* ═════════════════════ 4 — ADMIN ═════════════════════ */
const bar = (h, c, lbl) => `
<div class="col" style="flex:1;align-items:center;gap:6px;justify-content:flex-end">
  <div style="width:100%;max-width:26px;height:${h}px;border-radius:5px 5px 0 0;background:${c}"></div>
  <span class="t-caption" style="color:var(--n500);font-size:10px">${lbl}</span></div>`;

const adminBody = shell('لوحة القيادة', 'لوحة القيادة', 'الأحد 24 آب 2026 · محدَّث قبل ثانيتين',
`<div class="akpis">
  ${kpi('إيراد اليوم', '1,842', 'د.أ', 74, B, '18% عن أمس · 74% من هدف اليوم', 'var(--ok)')}
  ${kpi('رحلات مكتملة', '312', '', 61, B, '61% من متوسّط الأسبوع', 'var(--n600)')}
  ${kpi('كباتن متصلون', '48 / 126', '', 38, LIVE, '38% — أقل من المستهدف', 'var(--warn)')}
  ${kpi('شحنات بانتظار المراجعة', '23', '', 92, '#D92D20', '4 متجاوزة الـ 24 ساعة', 'var(--bad)')}
</div>
<div class="a2" style="margin-bottom:14px">
  ${table(['الرحلة', 'الطالب', 'الكابتن', 'الأجرة', 'الحالة'], [
    ['<span class="num ltr bold">TRP-4821</span>', 'حمزة ط.', 'محمد ع.', '<span class="num">1.250</span>', pill('جارية', 'live', 'live')],
    ['<span class="num ltr bold">TRP-4820</span>', 'سارة م.', 'أحمد خ.', '<span class="num">2.100</span>', pill('مكتملة', 'ok', 'ok')],
    ['<span class="num ltr bold">TRP-4819</span>', 'عمر ن.', 'خالد س.', '<span class="num">1.750</span>', pill('مكتملة', 'ok', 'ok')],
    ['<span class="num ltr bold">TRP-4818</span>', 'ليان ق.', '—', '<span class="num">1.250</span>', pill('بانتظار كابتن', 'warn', 'wait')],
    ['<span class="num ltr bold">TRP-4817</span>', 'يوسف ب.', 'محمد ع.', '<span class="num">3.400</span>', pill('ملغاة', 'bad', 'bad')],
  ])}
  ${panel('يحتاج إجراءً', `<div>
    ${[['shield', 'bad', 'بلاغ SOS مفتوح', 'TRP-4821 · قبل 4 دقائق', 'عاجل', 'bad'],
       ['wallet', 'wr', '4 شحنات متجاوزة SLA', 'أقدمها قبل 31 ساعة', 'مراجعة', 'warn'],
       ['file', '', '6 كباتن بانتظار توثيق', 'الوثائق مكتملة', 'توثيق', 'info'],
       ['msg', '', '9 شكاوى دعم مفتوحة', 'أقدمها قبل 6 ساعات', 'دعم', 'info']].map(([i, tone, t, d, lbl, pk]) => `
    <div class="row" style="padding:9px 14px;gap:10px;border-top:1px solid var(--n100)">
      <div class="ic ${tone}" style="width:30px;height:30px;border-radius:9px">${ic(i, { s: 15, c: pk === 'bad' ? '#D92D20' : pk === 'warn' ? '#B45309' : B, w: 2 })}</div>
      <div class="col" style="gap:0;flex:1"><span class="t-label bold">${t}</span>
        <span class="t-caption" style="color:var(--n500)">${d}</span></div>${pill(lbl, pk)}</div>`).join('')}</div>`)}
</div>
<div class="a2">
  ${panel('إيراد الأسبوع', `<div style="padding:16px 16px 12px">
    <div class="row" style="align-items:flex-end;gap:10px;height:118px">
      ${[[71, 'الاثنين'], [88, 'الثلاثاء'], [95, 'الأربعاء'], [80, 'الخميس'], [34, 'الجمعة'], [58, 'السبت'], [76, 'الأحد']]
        .map(([h, l], i, a) => bar(h, i === a.length - 1 ? B : 'var(--b200)', l)).join('')}
    </div>
    <div class="row" style="margin-top:12px;padding-top:11px;border-top:1px solid var(--n100)">
      <span class="t-caption" style="color:var(--n500)">الإجمالي</span><div class="sp"></div>
      <span class="t-label bold"><span class="num">11,284</span> ${cur}</span></div></div>`,
    `<span class="pill pill-ok"><span class="i i-up"></span>9% عن الأسبوع الماضي</span>`)}
  ${panel('توزيع الرحلات', `<div style="padding:14px 16px">
    ${[['مشتركة — مقعد', 68, B], ['منفردة — سيارة كاملة', 23, '#2E82F6'], ['خطّ شهري', 9, 'var(--b200)']].map(([l, p, c]) => `
    <div style="margin-bottom:13px">
      <div class="row" style="margin-bottom:5px"><span class="t-caption" style="color:var(--n700)">${l}</span>
        <div class="sp"></div><span class="t-caption num bold">${p}%</span></div>
      <div class="abar"><i style="width:${p}%;background:${c}"></i></div></div>`).join('')}
    <div class="row" style="padding-top:8px;border-top:1px solid var(--n100)">
      <span class="t-caption" style="color:var(--n500)">متوسّط المقاعد المشغولة في الرحلة المشتركة</span>
      <div class="sp"></div><span class="t-label num bold">2.7 / 4</span></div></div>`)}
</div>`, '');

out('r-admin.html', page(1340, `<div style="padding:26px;background:var(--n50)">${adminBody}</div>`, ADMIN_CSS));

/* ═════════════════════ 5 — SHOWCASE STRIPS ═════════════════════ */
const frameCap = (inner, title, desc) => `
<div style="flex:0 0 auto;width:390px">
  <div style="width:390px;height:844px;position:relative;overflow:hidden;background:#fff;border-radius:34px;
    box-shadow:0 0 0 8px #131926, 0 16px 38px rgba(14,21,36,.2)">${inner}</div>
  <div style="font:700 15px 'IBM Plex Sans Arabic';color:#0E1524;margin-top:18px;text-align:center">${title}</div>
  <div style="font:400 12.5px/21px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:4px;text-align:center">${desc}</div>
</div>`;

const strip = (w, items) => page(w, `
<div style="padding:40px 34px;background:#fff">
  <div class="row" style="gap:34px;align-items:flex-start">${items.join('')}</div></div>`);

out('r-student.html', strip(1330, [
  frameCap(homeScreen, 'الرئيسية — الخريطة هي البطل',
    'كتلة عائمة واحدة فوق الخريطة، وشيت واحد بثلاث نقاط توقّف. الوجهات المتكرّرة بأسعارها المعلنة، فالطلب نقرة واحدة.'),
  frameCap(rideScreen, 'مشتركة أم منفردة',
    'سعران معلنان قبل الطلب لا تقدير ولا مضاعف ذروة. المشتركة مقعد مع طلاب منطقتك، والمنفردة أنت تدفع كل المقاعد.'),
  frameCap(liveTrip, 'الرحلة الحيّة',
    'شريط تقدّم من خمس مراحل، بيانات الكابتن ولوحة السيارة، رمز صعود من ستّة أرقام، وزرّ استغاثة ظاهر دائماً.'),
]));

out('r-money.html', strip(900, [
  frameCap(wallet, 'المحفظة',
    'كل حركة مالية مُبيَّنة: خصم رحلة، شحنة معتمدة، شحنة قيد المراجعة، استرداد تلقائي. لا رصيد يتحرّك بلا سطر يشرحه.'),
  frameCap(topup, 'الشحن عبر CliQ',
    'مبالغ جاهزة، ومرجع إلزامي يربط الحوالة بالحساب، وصورة الإشعار. الشحنة لا تُقيَّد على الرصيد إلا بعد اعتماد بشري.'),
]));

out('r-driver.html', strip(900, [
  frameCap(cockpitScreen, 'الكوكبِت',
    'مفتاح «متصل» بعرض الشاشة، ورقم بطل واحد هو أرباح اليوم، وأوقات ذروة الجامعة. الكابتن يقرأه في ثانية وهو يسوق.'),
  frameCap(offer, 'العرض الوارد',
    'ملء الشاشة مع عدّاد تنازلي. الصافي بعد العمولة هو الرقم البطل لأنّه أساس القرار، ومسافة الوصول للطالب معلنة.'),
]));

console.log('generated: hero, logo, palette, admin, student, money, driver');
