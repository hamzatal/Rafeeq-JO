import { writeFileSync } from 'fs';
import { ic, statusBar, tabBar, pill, row, money, btn, seg, mapBg, mark, markOnDark, mapGhost } from './ui.mjs';

const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const B = '#1259E3', OK = '#047857';
const cur = `<span style="unicode-bidi:isolate">د.أ</span>`;
const SLOGAN = 'مقعدك إلى الجامعة';

/* ── Real Android devices, by share of the Jordanian market.
   Width/height are CSS px at the device's own DPR, which is what a React Native
   layout actually sees — not physical pixels. */
const DEVICES = [
  { name: 'Galaxy A15 / A25', note: 'الأكثر شيوعاً بين طلاب الأردن', w: 360, h: 800, dpr: 3, r: 26, nav: 'gesture', punch: 'center', chin: 24 },
  { name: 'Redmi Note 13', note: 'شاشة أطول · نسبة 20:9', w: 393, h: 873, dpr: 2.75, r: 30, nav: 'gesture', punch: 'center', chin: 24 },
  { name: 'Galaxy A05 / A03', note: 'الفئة الاقتصادية · نقطة الاختبار الحرجة', w: 360, h: 740, dpr: 2, r: 20, nav: 'buttons', punch: 'notch', chin: 48 },
  { name: 'Pixel 8a', note: 'أندرويد الأصلي · الحدّ الأعلى', w: 412, h: 915, dpr: 2.63, r: 34, nav: 'gesture', punch: 'center', chin: 24 },
];

/* ── Android chrome, not iOS.
   Deliberately different from the iPhone frames in v2: Android puts a real status
   bar with a battery percentage, a punch-hole camera rather than a notch, and
   either a gesture pill or three navigation buttons that EAT LAYOUT HEIGHT. The
   button variant is why the cheap tier is the hard case. */
const androidStatus = (dark = false) => {
  const fg = dark ? '#fff' : '#0E1524';

  return `<div style="position:absolute;inset-inline:0;top:0;height:28px;display:flex;align-items:center;
    padding:0 14px;gap:6px;z-index:200;font:500 12px 'IBM Plex Sans Arabic';color:${fg}">
    <span style="direction:ltr">9:41</span>
    <div style="flex:1"></div>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2.4"><path d="M12 20h.01M5 15a10 10 0 0114 0M2 11a15 15 0 0120 0"/></svg>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="${fg}"><path d="M2 8h16a2 2 0 012 2v4a2 2 0 01-2 2H2zM21 11v2"/></svg>
    <span style="direction:ltr;font-size:11px">87%</span>
  </div>`;
};

const androidNav = (kind, dark = false) => {
  const fg = dark ? 'rgba(255,255,255,.9)' : '#0E1524';
  if (kind === 'gesture') {
    return `<div style="position:absolute;inset-inline:0;bottom:0;height:24px;display:grid;place-items:center;z-index:200">
      <div style="width:108px;height:4px;border-radius:2px;background:${dark ? 'rgba(255,255,255,.5)' : 'rgba(14,21,36,.32)'}"></div></div>`;
  }

  // Three buttons: 48px of height the app never gets.
  return `<div style="position:absolute;inset-inline:0;bottom:0;height:48px;display:flex;align-items:center;
    justify-content:space-around;padding:0 52px;z-index:200;background:${dark ? '#000' : '#F2F5F9'}">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="${fg}"><circle cx="12" cy="12" r="9"/></svg>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
  </div>`;
};

const punchHole = (kind) => kind === 'notch'
  ? `<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:88px;height:20px;
      border-radius:0 0 11px 11px;background:#0B0F17;z-index:210"></div>`
  : `<div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:11px;height:11px;
      border-radius:50%;background:#0B0F17;z-index:210;box-shadow:0 0 0 1.5px rgba(255,255,255,.14)"></div>`;

/** A device frame that scales a 390x844 design to the device's real viewport. */
const device = (d, inner, dark = false) => {
  // The design is authored at 390 wide. On a 360px device it is scaled down, which
  // is exactly what a percentage-width RN layout does — so the frame shows the real
  // effective size of text and touch targets, not a cropped mock.
  const scale = d.w / 390;
  // The navigation bar is a safe-area inset, not decoration: the app does not own
  // those pixels. Sizing the design container to the height MINUS the nav means
  // anything anchored `bottom:0` lands above it — which is exactly what
  // useSafeAreaInsets() gives a React Native screen. Without this the primary CTA
  // of the ride sheet sits underneath the three buttons and cannot be pressed.
  const navPx = d.nav === 'buttons' ? 48 : 24;
  const innerH = Math.round((d.h - navPx) / scale);

  return `<div style="flex:0 0 auto">
  <div style="position:relative;width:${d.w}px;height:${d.h}px;border-radius:${d.r}px;overflow:hidden;
    background:${dark ? '#0E1524' : '#fff'};box-shadow:0 0 0 ${d.nav === 'buttons' ? 9 : 7}px #161B26, 0 14px 34px rgba(14,21,36,.22)">
    <div style="position:absolute;inset:0;width:390px;height:${innerH}px;transform:scale(${scale.toFixed(4)});transform-origin:top right">
      ${inner(innerH, d)}
    </div>
    ${androidStatus(dark)}${punchHole(d.punch)}${androidNav(d.nav, dark)}
  </div>
  <div style="width:${d.w}px;margin-top:14px">
    <div style="font:700 13.5px 'IBM Plex Sans Arabic';color:#0E1524">${d.name}</div>
    <div style="font:400 11.5px/18px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:2px">${d.note}</div>
    <div style="font:500 10.5px 'IBM Plex Sans Arabic';color:var(--n500);margin-top:5px;direction:ltr">
      ${d.w}×${d.h} @${d.dpr}x · ${d.nav === 'buttons' ? '3-button nav' : 'gesture'}</div>
    <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">
      <span class="pill ${scale < 0.95 ? 'pill-warn' : 'pill-ok'}" style="font-size:10px;padding:3px 8px">
        مقياس ${scale.toFixed(3)}×</span>
      <span class="pill ${Math.round(46 * scale) >= 44 ? 'pill-ok' : 'pill-bad'}" style="font-size:10px;padding:3px 8px">
        لمس ${Math.round(46 * scale)}dp</span>
      <span class="pill pill-info" style="font-size:10px;padding:3px 8px">
        متاح ${d.h - 28 - navPx}dp</span>
    </div>
  </div></div>`;
};

/* ── SCREENS, authored at 390 and laid out against the real available height ── */

const home = (H) => `
${mapBg({ h: H, route: 'M120,' + Math.round(H * .56) + ' L120,' + Math.round(H * .46) + ' L188,' + Math.round(H * .46) + ' L188,' + Math.round(H * .30) + ' L268,' + Math.round(H * .30), pins: [{ x: 120, y: Math.round(H * .56), c: B }, { x: 268, y: Math.round(H * .30), c: OK }], live: { x: 190, y: Math.round(H * .40) }, eta: 'كابتن · 4 دقائق' })}
<div style="position:absolute;top:36px;inset-inline:16px;display:flex;align-items:center;gap:9px;z-index:60">
  <div class="gpill"><div class="av">ح</div>
    <div class="col" style="gap:0"><span class="t-label bold">صباح الخير، حمزة</span>
      <span class="t-caption" style="color:var(--n500)">جامعة اليرموك · إربد</span></div></div>
  <div class="sp"></div><div class="fab">${ic('bell', { s: 19 })}</div></div>
<div class="bs" style="bottom:64px"><div class="grab"></div>
  <span class="t-title-md">إلى أين؟</span>
  <div class="input ph" style="margin:11px 0 12px;gap:9px">${ic('search', { s: 18, c: '#67728A' })}<span>ابحث عن وجهة</span></div>
  ${row({ icon: 'home', tone: 'g', iconColor: '#4E5872', title: 'البيت', sub: 'حي الجامعة', trail: `<span class="t-label"><span class="num">1.750</span> ${cur}</span>`, chev: false })}
  ${row({ icon: 'school', title: 'جامعة اليرموك', sub: 'البوابة الشمالية', trail: `<span class="t-label"><span class="num">1.250</span> ${cur}</span>`, chev: false })}
  <div style="height:8px"></div></div>${tabBar(0)}`;

const ride = (H) => `
${mapBg({ h: H, route: 'M120,' + Math.round(H * .44) + ' L120,' + Math.round(H * .35) + ' L188,' + Math.round(H * .35) + ' L188,' + Math.round(H * .20) + ' L268,' + Math.round(H * .20), pins: [{ x: 120, y: Math.round(H * .44), c: B }, { x: 268, y: Math.round(H * .20), c: OK }] })}
<div class="bs" style="bottom:0"><div class="grab"></div>
  <span class="t-label" style="color:var(--n500)">اختر نوع الرحلة</span>
  <div style="background:var(--b50);border:1.5px solid ${B};border-radius:16px;padding:12px;margin:8px 0;display:flex;align-items:center;gap:12px">
    <div style="width:42px;height:42px;border-radius:12px;background:#fff;display:grid;place-items:center">${ic('school', { s: 22, c: B, w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><div class="row" style="gap:6px"><span class="t-title-sm bold">مشتركة</span>${pill('الأوفر', 'info')}</div>
      <span class="t-caption" style="color:var(--n600)">مع طلاب من منطقتك · 4 دقائق</span></div>${money('1.500')}</div>
  <div class="card" style="padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
    <div class="ic g" style="width:42px;height:42px">${ic('car', { s: 22, c: '#4E5872', w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><span class="t-title-sm bold">منفردة</span>
      <span class="t-caption" style="color:var(--n600)">السيارة كاملة لك</span></div>
    ${money('5.250', { color: 'var(--n700)' })}</div>
  <div class="row" style="margin:12px 0 11px"><span class="t-body" style="color:var(--n600)">الإجمالي</span>
    <div class="sp"></div>${money('1.500', { size: 't-title-lg' })}</div>
  ${btn('اطلب الآن')}<div style="height:14px"></div></div>`;

const splash = (H) => `
<div style="position:absolute;inset:0;background:#fff;overflow:hidden">
  ${mapGhost({ w: 390, h: H, tint: 'rgba(18,89,227,.065)', road: 'rgba(18,89,227,.10)', routeC: 'rgba(18,89,227,.24)' })}
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 300px 300px at 50% 44%,
    rgba(255,255,255,.97) 0%, rgba(255,255,255,.97) 34%, rgba(255,255,255,.72) 62%, transparent 88%)"></div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5">
    ${mark(96, { path: B })}
    <div style="font:700 54px/1 'IBM Plex Sans Arabic';color:#0E1524;margin-top:22px">رفيق</div>
    <div style="font:500 18px/1 'IBM Plex Sans Arabic';color:${B};margin-top:13px">${SLOGAN}</div></div>
  <div style="position:absolute;inset-inline:0;bottom:56px;display:grid;place-items:center;z-index:5">
    <div style="background:var(--b50);border-radius:999px;padding:6px 15px;
      font:500 12px/1 'IBM Plex Sans Arabic';color:var(--b700)">للطلاب</div></div></div>`;

const cockpit = (H) => `
<div class="nav-h" style="margin-top:28px"><div class="av" style="width:38px;height:38px;font-size:16px">م</div>
  <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">لوحة الكابتن</span>
    <span class="t-title-md">محمد العبداللات</span></div><div class="sp"></div>${pill('معتمد', 'ok', 'ok')}</div>
<div class="body">
  <div style="background:${OK};border-radius:16px;height:60px;display:flex;align-items:center;padding:0 16px;gap:13px">
    <div style="width:48px;height:29px;border-radius:999px;background:rgba(255,255,255,.32);display:flex;align-items:center;padding:3px;justify-content:flex-end">
      <div style="width:23px;height:23px;border-radius:50%;background:#fff"></div></div>
    <div class="col" style="gap:0"><span style="font:700 16px 'IBM Plex Sans Arabic';color:#fff">متصل — تستقبل الطلبات</span>
      <span style="font:400 11px 'IBM Plex Sans Arabic';color:rgba(255,255,255,.85)">اضغط لإيقاف الاستقبال</span></div></div>
  <div style="height:11px"></div>
  <div class="card"><span class="t-label" style="color:var(--n500)">أرباح اليوم</span>
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
  <div style="height:11px"></div>
  <div class="card flush">
    ${row({ icon: 'car', title: 'رحلاتي' })}
    ${row({ icon: 'cash', title: 'أرباحي والسحب', trail: `<span class="t-label"><span class="num">142.500</span> ${cur}</span>` })}
    ${row({ icon: 'file', title: 'وثائقي', trail: pill('سارية', 'ok', 'ok') })}</div>
</div>${tabBar(0, 'driver')}`;

/* ── SHEETS ── */
const sheet = (title, sub, rows, w) => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:${w}px;background:#fff}</style></head><body>
<div style="padding:36px 40px">
  <div style="font:700 22px 'IBM Plex Sans Arabic';margin-bottom:5px">${title}</div>
  <div style="font:400 14px/24px 'IBM Plex Sans Arabic';color:var(--n600);margin-bottom:26px;max-width:1080px">${sub}</div>
  ${rows}
</div></body></html>`;

const strip = (label, why, inner, dark = false) => `
<div style="border-top:1px solid var(--n200);padding-top:22px;margin-top:26px">
  <div style="font:700 17px 'IBM Plex Sans Arabic';margin-bottom:4px">${label}</div>
  <div style="font:400 13px/22px 'IBM Plex Sans Arabic';color:var(--n700);margin-bottom:20px;max-width:1040px">${why}</div>
  <div style="display:flex;gap:34px;align-items:flex-start">${DEVICES.map(d => device(d, inner, dark)).join('')}</div>
</div>`;

const INTRO = `الإطارات أدناه <b>ليست صوراً مقصوصة</b>: التصميم مؤلَّف على عرض 390، ويُقاس هنا إلى عرض كل جهاز
   الفعلي — وهذا بالضبط ما يفعله تخطيط React Native بعرض نسبي. فالنصّ وأهداف اللمس تظهر بحجمها
   <b>الحقيقي</b> على كل جهاز. وطبقة الجهاز أندرويدية لا آيفون: شريط حالة بنسبة بطارية، وثقب كاميرا
   لا شقّ، و<b>شريط تنقّل يأكل من ارتفاع التطبيق فعلاً</b> — 24dp للإيماءة و<b>48dp للأزرار الثلاثة</b>.
   ولهذا الفئة الاقتصادية هي الحالة الصعبة: أقصر شاشة <b>وأكبر شريط تنقّل</b> معاً.`;

// Split across two sheets: four devices x four screens exceeds the 8000px limit
// that shoot.mjs enforces, so the student screens and the rest are separate.
out('r-android.html', sheet(
  'أندرويد — أربعة أجهزة حقيقية · شاشات الطالب',
  INTRO,
  strip('الرئيسية — الخريطة والشيت السفلي',
    `أضيق حالة هي <b>Galaxy A05</b>: عرض 360 وارتفاع 740 وشريط أزرار 48dp، فالمتاح للتطبيق
     <b>664dp</b> فقط مقابل 863 على Pixel. والشيت السفلي يبقى فوق شريط التبويب في الحالتين لأنّه
     مرتكز بـ<code>bottom</code> لا بارتفاع ثابت.`, home)
  + strip('اختيار نوع الرحلة — أكثف شاشة',
    `هذه الشاشة هي الاختبار الحقيقي: بطاقتان وإجمالي وزرّ رئيسي في المتاح. على A05 يُقاس التحكّم
     من 46 إلى <b>42dp</b> — <b>تحت الحدّ 44</b>، وهذا ما تُظهره الشارة الحمراء. العلاج ليس تكبير
     كل شيء بل <b>حدّ أدنى مطلق للتحكّم</b> بلا مقياس، وهو بند في المرحلة 7.`, ride)
  , 1720));

out('r-android-2.html', sheet(
  'أندرويد — السبلاش وشاشة «يومي»',
  INTRO,
  strip('السبلاش',
    `الخريطة الباهتة تُولَّد بالنسبة لا بأبعاد مثبَّتة، فمسارها يبقى متوازناً على 740 و915 معاً.
     وأندرويد يعرض <code>windowSplashScreenBackground</code> قبل هذا الإطار، فالخلفية <b>يجب</b>
     أن تطابق الأبيض وإلّا ظهرت وميضة عند الإقلاع.`, splash)
  + strip('شاشة «يومي» للكابتن',
    `الكابتن يقرأها وهو يسوق، فالرقم البطل واحد. ومفتاح «متصل» بعرض الشاشة يبقى 60dp على كل
     الأجهزة لأنّه أهمّ هدف لمس في التطبيق كلّه.`, cockpit),
  1720));

/* ── the density comparison that actually matters: cheapest vs best ── */
const cheap = DEVICES[2], best = DEVICES[3];
out('r-android-limits.html', sheet(
  'الحدّان — الفئة الاقتصادية مقابل الأعلى',
  `المقارنة التي تحسم القرارات. الجهازان يعرضان الشاشة نفسها، والفارق في <b>المتاح</b> بعد شريط
   الحالة وشريط التنقّل: <b>${cheap.h - 28 - 48}dp</b> مقابل <b>${best.h - 28 - 24}dp</b> — أي
   <b>${Math.round((1 - (cheap.h - 28 - 48) / (best.h - 28 - 24)) * 100)}٪ أقل</b>. وأي تصميم يُختبر
   على الأعلى وحده سينكسر على الأدنى، وهو الأكثر انتشاراً بين طلاب الأردن.`,
  `<div style="display:flex;gap:56px;align-items:flex-start">
    ${[cheap, best].map(d => device(d, ride)).join('')}
    <div style="flex:1;max-width:420px">
      <div style="font:700 15px 'IBM Plex Sans Arabic';margin-bottom:12px">ما يتغيّر فعلاً</div>
      ${[['العرض', `${cheap.w}dp`, `${best.w}dp`],
         ['الارتفاع الكلّي', `${cheap.h}dp`, `${best.h}dp`],
         ['شريط التنقّل', '48dp أزرار', '24dp إيماءة'],
         ['المتاح للتطبيق', `${cheap.h - 28 - 48}dp`, `${best.h - 28 - 24}dp`],
         ['مقياس التصميم', (cheap.w / 390).toFixed(3) + '×', (best.w / 390).toFixed(3) + '×'],
         ['التحكّم 46dp يصبح', Math.round(46 * cheap.w / 390) + 'dp', Math.round(46 * best.w / 390) + 'dp'],
         ['كثافة البكسل', '@2x', '@2.63x']].map(([k, a, b]) => `
      <div class="row" style="padding:9px 0;border-bottom:1px solid var(--n100)">
        <span class="t-caption" style="color:var(--n600);flex:1">${k}</span>
        <span class="t-label num bold" style="width:96px;text-align:center">${a}</span>
        <span class="t-label num" style="width:96px;text-align:center;color:var(--n600)">${b}</span></div>`).join('')}
      <div style="background:var(--warn-soft);border:1px solid #EFCFA0;border-radius:14px;padding:12px 14px;margin-top:16px">
        <div style="font:400 12.5px/21px 'IBM Plex Sans Arabic';color:#7C4A03">
          <b>الاستنتاج المُلزِم:</b> التحكّم لا يجوز أن يُقاس. عند 0.923× يهبط 46dp إلى
          <b>42dp</b> فيسقط تحت الحدّ 44. فالارتفاعات الحرجة تُثبَّت بـ<code>dp</code> مطلق،
          والذي يُقاس هو <b>المسافات</b> لا أهداف اللمس.</div></div>
    </div></div>`,
  1500));

console.log('generated: r-android, r-android-2, r-android-limits');
