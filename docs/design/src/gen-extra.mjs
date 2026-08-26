import { writeFileSync } from 'fs';
import { ic, statusBar, navBar, tabBar, pill, row, money, btn, seg, mapBg, cell, page } from './ui.mjs';
const B = '#1259E3', OK = '#047857', BAD = '#D92D20', WARN = '#B45309';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);

/* ══════════ 07 — حالات الواجهة (إلزامية لكل شاشة بيانات) ══════════ */
const sk = (w, h = 12) => `<div style="width:${w};height:${h}px;border-radius:6px;background:var(--n100)"></div>`;
const st = [];

st.push(cell('42', 'تحميل — هيكل عظمي', 'لا دوّارة في منتصف الشاشة · الهيكل يحفظ التخطيط فلا يقفز', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div class="body">
  <div style="height:40px;border-radius:12px;background:var(--n100);margin-bottom:14px"></div>
  ${[0, 1, 2, 3, 4].map(() => `
  <div class="card" style="padding:12px;margin-bottom:10px">
    <div class="row" style="gap:11px">
      <div style="width:38px;height:38px;border-radius:11px;background:var(--n100)"></div>
      <div class="col" style="gap:7px;flex:1">${sk('68%')}${sk('42%', 10)}</div>
      <div class="col" style="gap:7px;align-items:flex-start">${sk('46px')}${sk('56px', 14)}</div></div></div>`).join('')}
</div>${tabBar(1)}`));

st.push(cell('43', 'فراغ', 'يقول ما الذي سيظهر هنا، ويعطي فعلاً واحداً واضحاً', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div class="body">${seg(['قادمة', 'منتهية'], 0)}</div>
<div style="position:absolute;inset:150px 24px 64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
  <div style="width:88px;height:88px;border-radius:50%;background:var(--b50);display:grid;place-items:center">
    ${ic('car', { s: 40, c: '#8EC1FD', w: 1.5 })}</div>
  <div class="col" style="align-items:center;gap:5px">
    <span class="t-title-md">لا رحلات قادمة</span>
    <span class="t-body" style="color:var(--n600);text-align:center">اطلب رحلتك الأولى وستظهر هنا مع تتبّع حيّ</span></div>
  <div style="width:190px">${btn('اطلب رحلة')}</div>
</div>${tabBar(1)}`));

st.push(cell('44', 'خطأ + إعادة محاولة', 'يفصل خطأ الشبكة عن خطأ السيرفر · وزر إعادة دائماً', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div style="position:absolute;inset:110px 24px 64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
  <div style="width:88px;height:88px;border-radius:50%;background:var(--bad-soft);display:grid;place-items:center">
    ${ic('alert', { s: 40, c: BAD, w: 1.7 })}</div>
  <div class="col" style="align-items:center;gap:5px">
    <span class="t-title-md">تعذّر تحميل رحلاتك</span>
    <span class="t-body" style="color:var(--n600);text-align:center">حدث خطأ مؤقّت من جهتنا. بياناتك بأمان.</span>
    <span class="t-caption ltr num" style="color:var(--n500);margin-top:3px">TRIPS_FETCH_FAILED · 09:41</span></div>
  <div style="width:190px">${btn('إعادة المحاولة')}</div>
  <span class="t-label" style="color:var(--b700);font-weight:700">تواصل مع الدعم</span>
</div>${tabBar(1)}`));

st.push(cell('45', 'بلا اتصال', 'شريط دائم + ما يعمل بلا شبكة يبقى متاحاً', `
${statusBar()}
<div style="background:var(--n800);padding:7px 16px;display:flex;align-items:center;gap:8px">
  ${ic('globe', { s: 15, c: '#fff', w: 2 })}
  <span class="t-caption" style="color:#fff;flex:1">لا اتصال بالإنترنت — نعيد المحاولة تلقائياً</span>
  <span class="t-caption" style="color:rgba(255,255,255,.7)">إعادة الآن</span></div>
<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div class="body">
  <div class="card" style="background:var(--warn-soft);border-color:#F5D89B;padding:12px;margin-bottom:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('clock', { s: 17, c: WARN, w: 2 })}
      <span class="t-caption" style="color:#7C4A03;line-height:18px;flex:1">
        تعرض آخر بيانات محفوظة من <b>09:12 ص</b>. لا يمكن طلب رحلة جديدة بلا اتصال.</span></div></div>
  ${[['اليرموك — البوابة الشمالية', 'اليوم 8:12 ص', '1.050'],
    ['دوار الشهداء', 'أمس 4:30 م', '1.750']].map(([t, d, m]) => `
  <div class="card" style="padding:12px;margin-bottom:10px;opacity:.72">
    <div class="row" style="gap:11px">
      <div class="ic g">${ic('car', { s: 17, c: '#4E5872' })}</div>
      <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold">${t}</span>
        <span class="t-caption" style="color:var(--n500)">${d}</span></div>
      <span class="t-title-sm num bold">${m}</span></div></div>`).join('')}
</div>${tabBar(1)}`));

st.push(cell('46', 'إذن مرفوض', 'لا يحبس المستخدم — يشرح ويعطي بديلاً يدوياً', `
${statusBar()}
<div style="position:absolute;inset:0">${mapBg({ h: 470 })}
  <div style="position:absolute;inset:0;background:rgba(242,245,249,.72)"></div></div>
${navBar('اختيار نقطة الالتقاط')}
<div class="bs" style="height:340px;bottom:0">
  <div class="grab"></div>
  <div class="card" style="background:var(--warn-soft);border-color:#F5D89B;margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:flex-start">${ic('crosshair', { s: 19, c: WARN, w: 2 })}
      <div class="col" style="gap:3px;flex:1"><span class="t-title-sm bold" style="color:#7C4A03">إذن الموقع مرفوض</span>
        <span class="t-caption" style="color:#7C4A03;line-height:18px">لن نستطيع تحديد نقطة التقاطك تلقائياً. يمكنك اختيارها من الخريطة أو كتابتها.</span></div></div></div>
  ${btn('السماح بالموقع من الإعدادات')}
  <div style="height:10px"></div>
  ${btn('اختيار من الخريطة يدوياً', 'secondary')}
  <div style="height:10px"></div>
  <div class="input ph" style="gap:9px">${ic('search', { s: 17, c: '#67728A' })}<span>أو اكتب العنوان</span></div>
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:12px">التطبيق يعمل كاملاً بدون إذن الموقع</div>
</div>`));

st.push(cell('47', 'رصيد غير كافٍ', 'يمنع الفعل ويعطي المخرج في نفس الشاشة', `
${statusBar()}
<div style="position:absolute;inset:0">${mapBg({ h: 300 })}</div>
<div class="bs" style="height:600px;bottom:0">
  <div class="grab"></div>
  <div class="card" style="background:var(--bad-soft);border-color:#F9CFCB;margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:flex-start">${ic('wallet', { s: 19, c: BAD, w: 2 })}
      <div class="col" style="gap:3px;flex:1"><span class="t-title-sm bold" style="color:#8A1A12">رصيدك لا يكفي لهذه الرحلة</span>
        <span class="t-caption" style="color:#8A1A12">الرصيد <b class="num">0.400</b> · الأجرة <b class="num">1.250</b> · تحتاج <b class="num">0.850</b> ديناراً</span></div></div></div>
  <div class="card flush" style="margin-bottom:14px">
    <div class="lr" style="background:var(--b50)">${ic('wallet', { s: 19, c: B })}
      <div class="col" style="gap:0;flex:1"><span class="t-title-sm bold">اشحن المحفظة الآن</span>
        <span class="t-caption" style="color:var(--n600)">عبر CliQ · تُراجع خلال دقائق</span></div>
      <span class="chev">${ic('chev', { s: 17, c: '#96A0B2', w: 2 })}</span></div>
    ${row({ icon: 'gift', tone: 'g', iconColor: '#4E5872', title: 'استخدم كوبوناً', sub: 'عندك كوبون خصم 20% غير مستخدم' })}
  </div>
  <div class="row" style="margin-bottom:11px"><span class="t-body" style="color:var(--n600)">الإجمالي</span>
    <div class="sp"></div>${money('1.250', { size: 't-title-lg' })}</div>
  ${btn('اطلب الآن', 'primary', 'style="opacity:.45"')}
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:9px">اشحن رصيدك لتفعيل الطلب</div>
</div>`));

out('07-states.html', page({
  title: 'حالات الواجهة — إلزامية لكل شاشة بيانات',
  sub: '6 حالات · اليوم معظم القوائم بلا حالة فراغ ولا خطأ ولا إعادة محاولة',
  cells: st,
  notes: [
    { t: 'w', b: '<b>قاعدة:</b> كل شاشة تجلب بيانات لها <b>خمس حالات</b> إلزامية: <span class="ltr">loading · empty · error · offline · partial</span>. لا تُدمَج ولا تُختصر إلى دوّارة في المنتصف — الهيكل العظمي يحفظ التخطيط فلا تقفز الشاشة عند وصول البيانات.' },
    { t: 'r', b: '<b>شاشة 44:</b> كل خطأ يعرض <b>كوداً قابلاً للنسخ</b> (<span class="ltr">TRIPS_FETCH_FAILED</span>) — يقصّر زمن الدعم بشكل هائل. واليوم رسائل الأعمال <b>عربية مضمّنة في الباكند</b> وتُعاد نصّاً، فمستخدم <span class="ltr">locale=en</span> يرى أخطاء عربية رغم وجود 704 سطر ترجمة إنجليزية.' },
    { t: 'g', b: '<b>شاشة 46:</b> رفض إذن الموقع <b>لا يحبس المستخدم</b> — الاختيار اليدوي من الخريطة بديل كامل. هذا يقلّل الاعتماد على إذن حسّاس ويقوّي موقفك في مراجعة المتاجر.' },
  ],
}));

/* ══════════ 08 — الاستجابة (responsive) ══════════ */
const R = (w, h, label, note, inner) => `
<div style="flex-shrink:0">
  <div class="cap"><div><span class="t">${label}</span></div><div class="d">${note}</div></div>
  <div style="width:${w}px;height:${h}px;position:relative;overflow:hidden;background:#fff;border-radius:22px;
    box-shadow:0 0 0 6px #1A1F2B, 0 12px 28px rgba(14,21,36,.2)">${inner}</div></div>`;

const homeFor = (w) => {
  const g = w < 380 ? 12 : w > 700 ? 32 : 16;
  return `
${statusBar()}
<div style="position:absolute;inset:0">${mapBg({ h: 900 })}</div>
<div style="position:absolute;top:44px;inset-inline:${g}px;display:flex;gap:8px;z-index:60">
  <div class="gpill" style="flex:1"><div class="av">ح</div>
    <div class="col" style="gap:0"><span class="t-label bold">صباح الخير، حمزة</span>
      <span class="t-caption" style="color:var(--n500)">جامعة اليرموك</span></div></div>
  <div class="fab">${ic('bell', { s: 18 })}</div></div>
<div class="bs" style="height:${w > 700 ? 300 : 250}px;bottom:${w > 700 ? 0 : 60}px;padding:8px ${g}px 0;
  ${w > 700 ? `inset-inline-start:auto;width:420px;inset-inline-end:24px;bottom:24px;border-radius:20px;` : ''}">
  <div class="grab"></div>
  <span class="t-title-md">إلى أين؟</span>
  <div class="input ph" style="margin:10px 0 10px;gap:9px">${ic('search', { s: 17, c: '#67728A' })}<span>ابحث عن وجهة</span></div>
  ${row({ icon: 'home', tone: 'g', iconColor: '#4E5872', title: 'البيت', sub: 'حي الجامعة', trail: `<span class="t-label num" style="color:var(--n600)">1.750</span>`, chev: false })}
  ${row({ icon: 'school', title: 'جامعة اليرموك', sub: 'البوابة الشمالية', trail: `<span class="t-label num" style="color:var(--n600)">1.250</span>`, chev: false })}
</div>
${w > 700 ? '' : tabBar(0)}
${w > 700 ? `<div style="position:absolute;inset-inline-start:0;top:0;bottom:0;width:88px;background:#fff;border-inline-end:1px solid var(--n200);
  display:flex;flex-direction:column;align-items:center;padding-top:56px;gap:6px;z-index:66">
  ${[['home', 'الرئيسية', 1], ['car', 'رحلاتي', 0], ['wallet', 'المحفظة', 0], ['user', 'حسابي', 0]].map(([i, l, on]) => `
  <div class="col" style="align-items:center;gap:3px;padding:8px 0;width:72px;border-radius:12px;${on ? 'background:var(--b50)' : ''}">
    ${ic(i, { s: 20, c: on ? B : '#67728A', w: 2 })}
    <span style="font:${on ? 700 : 500} 10px 'IBM Plex Sans Arabic';color:${on ? 'var(--b700)' : 'var(--n500)'}">${l}</span></div>`).join('')}
</div>` : ''}`;
};

out('08-responsive.html', `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:1560px}</style></head><body><div class="sheet-body">
<div class="sheet-h">
  <div class="mk"><svg width="30" height="30" viewBox="0 0 96 96" fill="none">
    <circle cx="70" cy="26" r="8.5" stroke="#fff" stroke-width="7"/>
    <path d="M70 43.5 C70 58 60 68 45 72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="27" cy="73.5" r="7.5" fill="#fff"/></svg></div>
  <div><h1>الاستجابة — نفس الشاشة على 4 مقاسات حقيقية</h1>
    <div class="sub">لا تصميم منفصل لكل مقاس · التخطيط يتكيّف بقواعد ثلاث فقط</div></div>
</div>
<div style="display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap">
  ${R(320, 568, 'iPhone SE ‏(الأول) · 320×568', 'أصغر جهاز مدعوم · هامش 12 · الشيت يتقلّص', homeFor(320))}
  ${R(375, 667, 'iPhone SE ‏(2/3) · 375×667', 'الأكثر شيوعاً بين الطلاب · هامش 16', homeFor(375))}
  ${R(390, 844, 'iPhone 14/15 · 390×844', 'المرجع الأساسي للتصميم', homeFor(390))}
  ${R(834, 620, 'iPad / لوحي · 834 عريض', 'التبويب السفلي يصبح شريطاً جانبياً · الشيت يصبح لوحة عائمة', homeFor(834))}
</div>
<div class="note"><b>القواعد الثلاث — وهذا كل شيء:</b><br>
<b>١. الهامش يتبع العرض:</b> &lt;360 ⟶ 12 · 360–700 ⟶ 16 · &gt;700 ⟶ 32.<br>
<b>٢. عند 700px يتحوّل التبويب السفلي إلى شريط جانبي</b>، والشيت السفلي إلى لوحة عائمة على جانب الخريطة — لأن الإبهام لم يعد يصل لأسفل الشاشة.<br>
<b>٣. لا شيء آخر يتغيّر.</b> نفس المكوّنات، نفس الأحجام، نفس التوكنز.</div>
<div class="note g"><b>لماذا هذا يعمل:</b> كل الأحجام والمسافات <b>ثوابت من التوكنز</b> لا نِسَب مئوية.
والفحص أثبت أن المشروع الحالي <b>لا يستخدم <span class="ltr">Dimensions.get</span> إطلاقاً</b> وأن <span class="ltr">SafeAreaView</span> مستخدم في ~34 موضعاً — أساس سليم.
المشكلة الوحيدة: مواضع مطلقة بنِسَب مئوية مثل <span class="ltr">locateFab</span> عند <span class="ltr">bottom:'46%'</span> في
<span class="ltr">home.tsx:217</span> — تتصادم مع الكتل السفلية على شاشات مختلفة. <b>تُستبدل بقيم ثابتة.</b></div>
<div class="note w"><b>ناقص اليوم — <span class="ltr">KeyboardAvoidingView</span>:</b> موجود فقط في <span class="ltr">chat</span> و<span class="ltr">assistant</span>.
شاشات <span class="ltr">wallet · checkout · support · otp · login · register</span> بلا KAV ⇒ على iPhone SE <b>الكيبورد يغطّي الحقل السفلي</b>.
كل شاشة فيها حقل إدخال تحصل عليه.</div>
</div></body></html>`);

/* ══════════ 09 — التكثيف (density) قبل/بعد ══════════ */
out('09-density.html', `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:1200px}
.old{--gutter:20px;--card-pad:16px;--row-pad:14px;--h-ctl:52px;--h-tab:76px}
.old .t-display{font-size:34px;line-height:40px}.old .t-title-lg{font-size:24px;line-height:32px}
.old .t-title-md{font-size:20px;line-height:28px}.old .t-title-sm{font-size:17px;line-height:24px}
.old .t-body{font-size:15px}.old .t-label{font-size:13px}
.old .card{border-radius:20px}
.tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--n200);border-radius:14px;overflow:hidden;margin-top:22px}
.tbl th{background:var(--n50);padding:10px 14px;text-align:right;font:700 11.5px 'IBM Plex Sans Arabic';color:var(--n700);border-bottom:1px solid var(--n200)}
.tbl td{padding:9px 14px;border-bottom:1px solid var(--n100);font-size:12.5px}
.tbl tr:last-child td{border-bottom:none}
</style></head><body><div class="sheet-body">
<div class="sheet-h">
  <div class="mk"><svg width="30" height="30" viewBox="0 0 96 96" fill="none">
    <circle cx="70" cy="26" r="8.5" stroke="#fff" stroke-width="7"/>
    <path d="M70 43.5 C70 58 60 68 45 72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="27" cy="73.5" r="7.5" fill="#fff"/></svg></div>
  <div><h1>جولة التكثيف — استجابةً لملاحظة «العناصر كبيرة»</h1>
    <div class="sub">نفس المحتوى والتوكنز · شخصية التصميم لم تتغيّر · الطرف الأعلى من المقياس وإيقاع الحشو نزلا</div></div>
</div>
<div style="display:flex;gap:30px">
  <div>
    <div class="cap"><div><span class="t">قبل — الصفائح الأولى</span></div><div class="d">display 34 · هامش 20 · حشو 16 · زر 52 · تبويب 76</div></div>
    <div class="frame old">
      ${statusBar()}<div class="nav-h"><span class="t-title-lg">المحفظة</span></div>
      <div class="body">
        <div class="card" style="margin-bottom:16px">
          <span class="t-label" style="color:var(--n500)">الرصيد المتاح</span>
          <div class="row" style="align-items:baseline;gap:5px;margin-top:2px">
            <span class="num t-display">12.500</span><span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span></div>
          <div class="row" style="gap:10px;margin-top:18px">
            <button class="btn btn-primary" style="flex:1">شحن الرصيد</button>
            <button class="btn btn-secondary" style="flex:1">اشتراكي</button></div></div>
        <div class="card flush">
          ${row({ icon: 'car', tone: 'bad', iconColor: BAD, title: 'رحلة — اليرموك', sub: 'اليوم 8:12 ص', trail: `<span class="t-title-sm num bold" style="color:${BAD}">−1.050</span>`, chev: false })}
          ${row({ icon: 'cash', tone: 'ok', iconColor: OK, title: 'شحن عبر CliQ', sub: 'أمس 6:40 م', trail: `<span class="t-title-sm num bold" style="color:${OK}">+10.000</span>`, chev: false })}
          ${row({ icon: 'gift', title: 'كوبون STUDENT20', sub: 'قبل 3 أيام', trail: `<span class="t-title-sm num bold" style="color:${OK}">+2.000</span>`, chev: false })}
        </div>
      </div>${tabBar(2)}
    </div>
  </div>
  <div>
    <div class="cap"><div><span class="t" style="color:var(--ok)">بعد — المعتمد</span></div><div class="d">display 26 · هامش 16 · حشو 14 · زر 46 · تبويب 64</div></div>
    <div class="frame">
      ${statusBar()}<div class="nav-h"><span class="t-title-lg">المحفظة</span></div>
      <div class="body">
        <div class="card" style="margin-bottom:12px">
          <span class="t-label" style="color:var(--n500)">الرصيد المتاح</span>
          <div class="row" style="align-items:baseline;gap:5px;margin-top:1px">
            <span class="num" style="font:700 30px/36px 'IBM Plex Sans Arabic'">12.500</span>
            <span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span></div>
          <div class="row" style="gap:9px;margin-top:14px">
            <button class="btn btn-primary btn-sm" style="flex:1">شحن الرصيد</button>
            <button class="btn btn-secondary btn-sm" style="flex:1">اشتراكي</button></div></div>
        <div class="card flush">
          ${row({ icon: 'car', tone: 'bad', iconColor: BAD, title: 'رحلة — اليرموك', sub: 'اليوم 8:12 ص', trail: `<span class="t-title-sm num bold" style="color:${BAD}">−1.050</span>`, chev: false })}
          ${row({ icon: 'cash', tone: 'ok', iconColor: OK, title: 'شحن عبر CliQ', sub: 'أمس 6:40 م', trail: `<span class="t-title-sm num bold" style="color:${OK}">+10.000</span>`, chev: false })}
          ${row({ icon: 'gift', title: 'كوبون STUDENT20', sub: 'قبل 3 أيام', trail: `<span class="t-title-sm num bold" style="color:${OK}">+2.000</span>`, chev: false })}
          ${row({ icon: 'car', tone: 'bad', iconColor: BAD, title: 'رحلة — دوار الشهداء', sub: 'قبل 4 أيام', trail: `<span class="t-title-sm num bold" style="color:${BAD}">−1.750</span>`, chev: false })}
          ${row({ icon: 'cash', tone: 'ok', iconColor: OK, title: 'شحن عبر CliQ', sub: 'قبل 5 أيام', trail: `<span class="t-title-sm num bold" style="color:${OK}">+5.000</span>`, chev: false })}
        </div>
      </div>${tabBar(2)}
    </div>
  </div>
  <div style="flex:1;min-width:300px">
    <table class="tbl" style="margin-top:38px">
      <tr><th>العنصر</th><th>قبل</th><th>بعد</th></tr>
      <tr><td>رقم بطل (display)</td><td class="num">34 / 40</td><td class="num" style="color:var(--ok);font-weight:700">26 / 32</td></tr>
      <tr><td>عنوان الشاشة</td><td class="num">24</td><td class="num" style="color:var(--ok);font-weight:700">21</td></tr>
      <tr><td>عنوان بطاقة</td><td class="num">20</td><td class="num" style="color:var(--ok);font-weight:700">17</td></tr>
      <tr><td>عنوان صفّ</td><td class="num">17</td><td class="num" style="color:var(--ok);font-weight:700">15</td></tr>
      <tr><td>نصّ الجسم</td><td class="num">15</td><td class="num" style="color:var(--ok);font-weight:700">14</td></tr>
      <tr><td>هامش الشاشة</td><td class="num">20</td><td class="num" style="color:var(--ok);font-weight:700">16</td></tr>
      <tr><td>حشو البطاقة</td><td class="num">16</td><td class="num" style="color:var(--ok);font-weight:700">14</td></tr>
      <tr><td>حشو صفّ القائمة</td><td class="num">14</td><td class="num" style="color:var(--ok);font-weight:700">12</td></tr>
      <tr><td>ارتفاع الزر / الحقل</td><td class="num">52</td><td class="num" style="color:var(--ok);font-weight:700">46</td></tr>
      <tr><td>ارتفاع التبويب السفلي</td><td class="num">76</td><td class="num" style="color:var(--ok);font-weight:700">64</td></tr>
      <tr><td><b>صفوف مرئية بلا تمرير</b></td><td class="num">3</td><td class="num" style="color:var(--ok);font-weight:700">5</td></tr>
    </table>
    <div class="note g"><b>النتيجة:</b> <b>+67% محتوى مرئي</b> على نفس الشاشة (3 صفوف ⟶ 5) بلا أي تغيير في الشخصية البصرية.</div>
    <div class="note"><b>ما لم يتغيّر:</b> الألوان · الأقطار (12/16/24) · نموذج العمق (حدّ أو ظل) · الأيقونات · نسب التباين.
    الصفيحتان 1 و2 التي أعجبتاك <b>ما زالتا صحيحتين بالكامل</b> — كانتا صفائح مواصفات بحجم عرض، لا شاشات.</div>
    <div class="note w"><b>الحدّ الذي لم نتجاوزه:</b> أهداف اللمس بقيت <b>≥44</b> (الزرّ 46) — وهو الحدّ الأدنى في إرشادات آبل وجوجل.
    وفي <b>وضع رحلة الكابتن</b> بقيت <b>54</b> لأنه يستخدمها وهو يسوق.</div>
  </div>
</div>
</div></body></html>`);

console.log('generated 07-states.html, 08-responsive.html, 09-density.html');
