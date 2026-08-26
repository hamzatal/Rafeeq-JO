import { writeFileSync } from 'fs';
import { ic, statusBar, navBar, tabBar, pill, row, money, btn, field, seg, mapBg, cell, page, mark } from './ui.mjs';

const B = '#1259E3', OK = '#047857';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);

/* ══════════ SHEET 1 — الدخول والتهيئة ══════════════════════════════ */
const s1 = [];

s1.push(cell('01', 'شاشة البداية', 'فاتحة — تطابق أول شاشة فلا يوجد وميض داكن→فاتح', `
${statusBar()}
<div style="position:absolute;inset:0;display:grid;place-items:center;background:var(--n25)">
  <div class="row" style="gap:12px">
    ${mark(46, { path: B })}
    <span style="font:700 34px 'IBM Plex Sans Arabic'">رفيق</span></div>
  <div style="position:absolute;bottom:74px;inset-inline:72px;height:3px;border-radius:2px;background:var(--n200)">
    <div style="width:62%;height:100%;border-radius:2px;background:${B}"></div></div>
  <div style="position:absolute;bottom:48px;inset-inline:0;text-align:center;color:var(--n500)" class="t-caption">رفيقك في كل رحلة</div>
</div>`));

const intro = (n, t, d, icon, dots) => cell(n, `التعريف ${dots + 1}/3`, d, `
${statusBar()}
<div class="nav-h"><div class="sp"></div><span class="t-label" style="color:var(--n500)">تخطّي</span></div>
<div style="position:absolute;inset:96px 0 0;display:flex;flex-direction:column;align-items:center;padding:0 24px">
  <div style="width:190px;height:190px;border-radius:50%;background:var(--b50);display:grid;place-items:center;margin-bottom:34px">
    ${ic(icon, { s: 84, c: B, w: 1.4 })}</div>
  <span class="t-title-lg" style="text-align:center">${t}</span>
  <span class="t-body" style="color:var(--n600);text-align:center;margin-top:8px">${d}</span>
</div>
<div style="position:absolute;bottom:28px;inset-inline:16px">
  <div class="row" style="justify-content:center;gap:6px;margin-bottom:18px">
    ${[0, 1, 2].map(i => `<div style="width:${i === dots ? 22 : 7}px;height:7px;border-radius:4px;background:${i === dots ? B : 'var(--n300)'}"></div>`).join('')}
  </div>
  ${btn(dots === 2 ? 'ابدأ' : 'التالي')}
</div>`);
s1.push(intro('02', 'وجهتك بضغطة', 'اطلب رحلتك للجامعة بسعر معروف قبل ما تركب', 'school', 0));
s1.push(intro('03', 'سعر واضح', 'الأجرة تُحسب على السيرفر — بلا مفاوضة وبلا مفاجآت', 'cash', 1));
s1.push(intro('04', 'رحلة آمنة', 'كباتن موثّقون · تتبّع حيّ · زر استغاثة', 'shield', 2));

s1.push(cell('05', 'الترحيب', 'مدخلان فقط — لا خيارات تشتّت', `
${statusBar()}
<div style="position:absolute;inset:0">${mapBg({ h: 470 })}
  <div style="position:absolute;top:400px;inset-inline:0;height:70px;background:linear-gradient(to bottom,rgba(242,245,249,0),var(--n50))"></div></div>
<div style="position:absolute;inset-inline:0;bottom:0;top:430px;background:var(--n50);padding:0 20px">
  <div class="row" style="gap:11px;margin-bottom:20px">
    ${mark(40, { path: B })}
    <span style="font:700 28px 'IBM Plex Sans Arabic'">رفيق</span></div>
  <span class="t-title-lg">أهلاً بك</span>
  <div class="t-body" style="color:var(--n600);margin:6px 0 24px">سجّل برقم هاتفك وابدأ رحلتك الأولى</div>
  ${btn('إنشاء حساب')}
  <div style="height:10px"></div>
  ${btn('تسجيل الدخول', 'secondary')}
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:18px;line-height:19px">
    بالمتابعة أنت توافق على <span style="color:var(--b700);font-weight:700">الشروط والأحكام</span>
    و<span style="color:var(--b700);font-weight:700">سياسة الخصوصية</span></div>
</div>`));

s1.push(cell('06', 'إنشاء حساب', '⚠ يضيف حقل تاريخ الميلاد — غير موجود اليوم إطلاقاً', `
${statusBar()}${navBar('إنشاء حساب')}
<div class="body" style="padding-top:6px">
  <div class="col" style="gap:14px">
    ${field('الاسم الكامل', 'حمزة الطعاني', { icon: 'user' })}
    ${field('رقم الهاتف', '0791234567', { icon: 'phone', state: 'focus' })}
    ${field('تاريخ الميلاد', '2005 / 04 / 12', { icon: 'clock', hint: 'مطلوب للتحقق من السن — الحدّ الأدنى 16 سنة' })}
    ${field('الجامعة', 'جامعة اليرموك', { icon: 'school' })}
    ${field('كلمة المرور', '••••••••', { icon: 'lock' })}
  </div>
  <div class="row" style="gap:9px;margin-top:18px;align-items:flex-start">
    <div style="width:19px;height:19px;border-radius:5px;background:${B};display:grid;place-items:center;flex-shrink:0;margin-top:1px">
      ${ic('check', { s: 12, c: '#fff', w: 3.5 })}</div>
    <span class="t-caption" style="color:var(--n600);line-height:18px">أوافق على الشروط وسياسة الخصوصية، وأقرّ أن بياناتي صحيحة</span></div>
  <div style="height:18px"></div>${btn('متابعة')}
</div>`));

s1.push(cell('07', 'رمز التحقق', 'الرمز لا يظهر أبداً في الاستجابة — إصلاح ثغرة حرجة', `
${statusBar()}${navBar('رمز التحقق')}
<div class="body" style="padding-top:14px">
  <span class="t-title-lg">أدخل الرمز</span>
  <div class="t-body" style="color:var(--n600);margin:6px 0 26px">أرسلنا رمزاً من 6 أرقام إلى <span class="num ltr bold" style="color:var(--n900)">0791234567</span></div>
  <div class="row" style="gap:9px;direction:ltr">
    ${[4, 8, 1, 2, '', ''].map((d, i) => `<div style="flex:1;height:56px;border-radius:12px;border:${i === 4 ? `1.5px solid ${B}` : '1px solid var(--n300)'};${i === 4 ? `box-shadow:0 0 0 3px var(--b100);` : ''}background:#fff;display:grid;place-items:center;font:700 24px 'IBM Plex Sans Arabic'">${d}</div>`).join('')}
  </div>
  <div class="row" style="margin-top:22px;gap:6px">
    ${ic('clock', { s: 15, c: '#67728A' })}<span class="t-label" style="color:var(--n600)">إعادة الإرسال بعد <span class="num">٠٠:٤٢</span></span></div>
  <div style="height:24px"></div>${btn('تأكيد')}
</div>`));

s1.push(cell('08', 'الأذونات', 'كل إذن يشرح سببه — ويطلب «أثناء الاستخدام» لا «دائماً»', `
${statusBar()}${navBar('الأذونات', { back: false })}
<div class="body">
  <span class="t-title-lg">نحتاج إذنين فقط</span>
  <div class="t-body" style="color:var(--n600);margin:6px 0 20px">لن نطلب أي إذن لا نستخدمه فعلياً</div>
  <div class="card" style="margin-bottom:12px">
    <div class="row" style="gap:12px;margin-bottom:11px">
      <div class="ic" style="width:42px;height:42px">${ic('crosshair', { s: 21, c: B })}</div>
      <div class="col" style="gap:1px;flex:1"><span class="t-title-sm bold">الموقع — أثناء استخدام التطبيق</span>
        <span class="t-caption" style="color:var(--n500)">لتحديد نقطة الالتقاط وإرسال موقعك مع نداء الطوارئ</span></div></div>
    ${pill('لا نتتبّعك في الخلفية أبداً', 'ok', 'ok')}
    <div style="height:12px"></div>${btn('السماح', 'primary', 'style="height:38px;font-size:13px"')}
  </div>
  <div class="card">
    <div class="row" style="gap:12px;margin-bottom:11px">
      <div class="ic" style="width:42px;height:42px">${ic('bell', { s: 21, c: B })}</div>
      <div class="col" style="gap:1px;flex:1"><span class="t-title-sm bold">الإشعارات</span>
        <span class="t-caption" style="color:var(--n500)">وصول الكابتن · تأكيد الدفع · تحديثات الرحلة</span></div></div>
    ${btn('السماح', 'secondary', 'style="height:38px;font-size:13px"')}
  </div>
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:20px">يمكنك تغيير هذا لاحقاً من الإعدادات</div>
</div>`));

s1.push(cell('09', 'خطأ في الدخول', 'الخطأ = لون + أيقونة + نص · ولا يكشف إن كان الرقم مسجّلاً', `
${statusBar()}${navBar('تسجيل الدخول')}
<div class="body" style="padding-top:14px">
  <div class="card" style="background:var(--bad-soft);border-color:#F9CFCB;margin-bottom:20px">
    <div class="row" style="gap:10px;align-items:flex-start">
      ${ic('alert', { s: 19, c: '#D92D20', w: 2 })}
      <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold" style="color:#8A1A12">بيانات الدخول غير صحيحة</span>
        <span class="t-caption" style="color:#8A1A12">تبقّى لك 3 محاولات قبل الإيقاف المؤقّت لـ 15 دقيقة</span></div></div></div>
  <div class="col" style="gap:14px">
    ${field('رقم الهاتف', '0791234567', { icon: 'phone' })}
    ${field('كلمة المرور', '••••••', { icon: 'lock', state: 'err', hint: 'كلمة المرور أو رقم الهاتف غير صحيح' })}
  </div>
  <div class="row" style="justify-content:flex-end;margin-top:12px">
    <span class="t-label" style="color:var(--b700);font-weight:700">نسيت كلمة المرور؟</span></div>
  <div style="height:20px"></div>${btn('تسجيل الدخول')}
</div>`));

out('02-student-auth.html', page({
  title: 'تطبيق الطالب — الدخول والتهيئة',
  sub: '9 شاشات · إطار حقيقي 390×844 · العرض بمقياس 1:1',
  cells: s1,
  notes: [
    { t: 'r', b: '<b>مضاف بسبب التدقيق:</b> حقل <b>تاريخ الميلاد</b> في شاشة 06 — اليوم <b>لا يوجد أي حقل عمر في المشروع كله</b> (لا في <span class="ltr">RegisterRequest</span> ولا في أي هجرة)، ومنصّة تنقل طلاباً بعضهم تحت 18 في سيارات خاصة <b>بلا سنّ أدنى ولا موافقة وليّ أمر</b> = مخاطرة قانونية عالية. وشروط الاستخدام لا تذكر أي سنّ.' },
    { t: 'w', b: '<b>شاشة 07:</b> الرمز 6 أرقام (اليوم بعض الأكواد 4 أرقام = 10⁴ فضاء تخمين). والأهم: <b>لا يُعاد الرمز في استجابة الـ API إطلاقاً</b> — اليوم <span class="ltr">otp_debug</span> يُعاد والافتراضي <span class="ltr">true</span>.' },
    { t: 'g', b: '<b>شاشة 08:</b> يطلب <b>«أثناء الاستخدام»</b> فقط. اليوم <span class="ltr">app.json</span> يطلب <span class="ltr">locationAlwaysAndWhenInUse</span> بينما الكود foreground فقط <span class="ltr" style="opacity:.55">&#8658;</span> سبب رفض Apple (صلاحية أوسع من الحاجة).' },
  ],
}));

/* ══════════ SHEET 2 — رحلة الطالب ══════════════════════════════════ */
const s2 = [];
const ROUTE = 'M120,470 L120,392 L188,392 L188,250 L268,250';

s2.push(cell('10', 'الرئيسية — الشيت مطويّ', 'الخريطة هي البطل · كتلة عائمة واحدة + شيت واحد', `
${mapBg({ route: ROUTE, pins: [{ x: 120, y: 470, c: B }, { x: 268, y: 250, c: OK }], live: { x: 196, y: 340 }, eta: 'كابتن · 4 دقائق' })}
${statusBar()}
<div style="position:absolute;top:44px;inset-inline:16px;display:flex;gap:9px;z-index:60">
  <div class="gpill" style="flex:1"><div class="av">ح</div>
    <div class="col" style="gap:0"><span class="t-label bold">صباح الخير، حمزة</span>
      <span class="t-caption" style="color:var(--n500)">جامعة اليرموك · إربد</span></div></div>
  <div class="fab" style="position:relative">${ic('bell', { s: 19 })}
    <div style="position:absolute;top:8px;inset-inline-end:9px;width:8px;height:8px;border-radius:50%;background:var(--bad);border:2px solid #fff"></div></div>
</div>
<div style="position:absolute;top:96px;inset-inline-start:16px;z-index:55;background:var(--b50);border:1px solid var(--b200);
  border-radius:999px;height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 12px">
  ${ic('sparkle', { s: 14, c: B, w: 2 })}<span class="t-label" style="color:var(--b700);font-weight:700">اسأل رفيق</span></div>
<div class="fab" style="inset-inline-end:16px;bottom:352px">${ic('crosshair', { s: 19, c: B })}</div>
<div class="bs" style="height:272px;bottom:64px">
  <div class="grab"></div>
  <span class="t-title-md">إلى أين؟</span>
  <div class="input ph" style="margin:11px 0 12px;gap:9px">${ic('search', { s: 18, c: '#67728A' })}<span>ابحث عن وجهة</span></div>
  ${row({ icon: 'home', tone: 'g', iconColor: '#4E5872', title: 'البيت', sub: 'حي الجامعة، شارع الملكة نور', trail: `<span class="t-label num" style="color:var(--n600)">1.750</span>`, chev: false })}
  ${row({ icon: 'school', title: 'جامعة اليرموك', sub: 'البوابة الشمالية · وجهتك المعتادة', trail: `<span class="t-label num" style="color:var(--n600)">1.250</span>`, chev: false })}
</div>${tabBar(0)}`));

s2.push(cell('11', 'الرئيسية — الشيت نصف مفتوح', 'البحث والأماكن المحفوظة · نفس الشيت، نقطة توقّف ثانية', `
${mapBg({ h: 380 })}${statusBar()}
<div class="bs" style="height:510px;bottom:64px">
  <div class="grab"></div>
  <div class="input focus" style="gap:9px;margin-bottom:14px">${ic('search', { s: 18, c: B })}<span>اليرم</span>
    <div style="width:1.5px;height:18px;background:${B}"></div></div>
  <span class="t-label" style="color:var(--n500)">نتائج</span>
  <div class="card flush" style="margin:8px 0 14px">
    ${row({ icon: 'school', title: 'جامعة اليرموك — البوابة الشمالية', sub: 'إربد · 6.4 كم', trail: `<span class="t-label num" style="color:var(--n600)">1.250</span>`, chev: false })}
    ${row({ icon: 'school', title: 'جامعة اليرموك — البوابة الرئيسية', sub: 'إربد · 6.9 كم', trail: `<span class="t-label num" style="color:var(--n600)">1.400</span>`, chev: false })}
    ${row({ icon: 'map', tone: 'g', iconColor: '#4E5872', title: 'شارع الجامعة', sub: 'إربد · 5.1 كم', chev: false })}
  </div>
  <span class="t-label" style="color:var(--n500)">أماكني</span>
  <div class="card flush" style="margin-top:8px">
    ${row({ icon: 'home', tone: 'g', iconColor: '#4E5872', title: 'البيت', sub: 'حي الجامعة، شارع الملكة نور', chev: false })}
    ${row({ icon: 'plus', tone: 'g', iconColor: '#4E5872', title: 'إضافة مكان', chev: false })}
  </div>
</div>${tabBar(0)}`));

s2.push(cell('12', 'الفئة والدفع — الشيت مفتوح', 'يستبدل شاشة checkout المنفصلة · السعر من السيرفر', `
${mapBg({ h: 250, route: 'M120,190 L120,150 L188,150 L188,80 L268,80', pins: [{ x: 120, y: 190, c: B }, { x: 268, y: 80, c: OK }] })}
${statusBar()}
<div class="bs" style="height:640px;bottom:0">
  <div class="grab"></div>
  <div class="card" style="padding:12px;margin-bottom:14px">
    <div class="row" style="gap:10px;align-items:flex-start">
      <div class="col" style="align-items:center;gap:0;padding-top:5px">
        <div style="width:8px;height:8px;border-radius:50%;background:${B}"></div>
        <div style="width:2px;height:22px;background:var(--n300)"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:${OK}"></div></div>
      <div class="col" style="flex:1;gap:11px">
        <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">من</span>
          <span class="t-title-sm bold">حي الجامعة، شارع الملكة نور</span></div>
        <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">إلى</span>
          <span class="t-title-sm bold">جامعة اليرموك — البوابة الشمالية</span></div></div>
      <span class="t-label" style="color:var(--b700);font-weight:700">تعديل</span></div></div>
  <span class="t-label" style="color:var(--n500)">الفئة</span>
  <div style="background:var(--b50);border:1.5px solid ${B};border-radius:16px;padding:12px;margin:8px 0;display:flex;align-items:center;gap:12px">
    <div style="width:42px;height:42px;border-radius:12px;background:#fff;display:grid;place-items:center">${ic('car', { s: 23, c: B, w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><div class="row" style="gap:6px"><span class="t-title-sm bold">اقتصادي</span>${pill('الأوفر', 'info')}</div>
      <span class="t-caption" style="color:var(--n600)">4 مقاعد · يصل خلال 4 دقائق</span></div>
    ${money('1.250')}</div>
  <div class="card" style="padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
    <div class="ic g" style="width:42px;height:42px">${ic('truck', { s: 22, c: '#4E5872', w: 1.6 })}</div>
    <div class="col" style="flex:1;gap:2px"><span class="t-title-sm bold">عائلي</span>
      <span class="t-caption" style="color:var(--n600)">7 مقاعد · يصل خلال 8 دقائق</span></div>
    ${money('2.100', { color: 'var(--n700)' })}</div>
  <div class="card flush" style="margin:14px 0">
    <div class="lr">${ic('wallet', { s: 19, c: B })}
      <div class="col" style="gap:0;flex:1"><span class="t-title-sm bold">المحفظة</span>
        <span class="t-caption num" style="color:var(--ok)">الرصيد 12.500 د.أ — كافٍ</span></div>
      <div style="width:19px;height:19px;border-radius:50%;background:${B};display:grid;place-items:center">${ic('check', { s: 11, c: '#fff', w: 4 })}</div></div>
    ${row({ icon: 'gift', tone: 'g', iconColor: '#4E5872', title: 'أضف كوبون خصم' })}
  </div>
  <div class="row" style="margin-bottom:11px"><span class="t-body" style="color:var(--n600)">الإجمالي</span><div class="sp"></div>${money('1.250', { size: 't-title-lg' })}</div>
  ${btn('اطلب الآن')}
</div>`));

s2.push(cell('13', 'البحث عن كابتن', 'حالة انتظار صريحة + إمكانية الإلغاء بلا غموض', `
${mapBg({ h: 500, live: { x: 196, y: 300 } })}${statusBar()}
<div class="bs" style="height:330px;bottom:0">
  <div class="grab"></div>
  <div class="col" style="align-items:center;gap:14px;padding:8px 0 18px">
    <div style="position:relative;width:74px;height:74px">
      <div style="position:absolute;inset:0;border-radius:50%;background:var(--b100)"></div>
      <div style="position:absolute;inset:9px;border-radius:50%;background:var(--b200)"></div>
      <div style="position:absolute;inset:19px;border-radius:50%;background:${B};display:grid;place-items:center">${ic('search', { s: 19, c: '#fff', w: 2.4 })}</div>
    </div>
    <div class="col" style="align-items:center;gap:4px">
      <span class="t-title-md">نبحث عن كابتن قريب</span>
      <span class="t-body" style="color:var(--n600)">عادة أقل من دقيقة</span></div>
  </div>
  <div class="card" style="padding:12px;margin-bottom:14px">
    <div class="row"><span class="t-label" style="color:var(--n600)">اقتصادي · اليرموك</span><div class="sp"></div>
      <span class="t-title-sm num bold">1.250 د.أ</span></div></div>
  ${btn('إلغاء الطلب', 'ghost')}
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:10px">الإلغاء الآن مجاني — لم يُخصم أي مبلغ</div>
</div>`));

s2.push(cell('14', 'الرحلة الحيّة', 'الكابتن قادم · التتبّع بلون «الحيّ» · الاستغاثة ظاهرة دائماً', `
${mapBg({ h: 470, route: 'M120,400 L120,330 L188,330 L188,220 L268,220', pins: [{ x: 120, y: 400, c: B }, { x: 268, y: 220, c: OK }], live: { x: 188, y: 300 }, eta: '3 دقائق' })}
${statusBar()}
<div class="fab" style="inset-inline-start:16px;top:56px;width:44px;height:44px;background:var(--bad)">
  ${ic('shield', { s: 20, c: '#fff', w: 2.2 })}</div>
<div class="bs" style="height:360px;bottom:0">
  <div class="grab"></div>
  <div class="row" style="gap:0;margin-bottom:16px">
    ${[['تم الطلب', 1], ['قُبلت', 1], ['الكابتن قادم', 2], ['في الطريق', 0], ['وصلت', 0]].map(([l, st], i, a) => `
    <div class="col" style="flex:1;align-items:center;gap:5px">
      <div class="row" style="width:100%;gap:0">
        ${i > 0 ? `<div style="flex:1;height:2px;background:${st ? OK : 'var(--n200)'}"></div>` : '<div style="flex:1"></div>'}
        <div style="width:${st === 2 ? 13 : 10}px;height:${st === 2 ? 13 : 10}px;border-radius:50%;flex-shrink:0;
          background:${st === 2 ? B : st ? OK : '#fff'};${st ? '' : 'border:2px solid var(--n300)'};${st === 2 ? `box-shadow:0 0 0 4px var(--b100)` : ''}"></div>
        ${i < a.length - 1 ? `<div style="flex:1;height:2px;background:${a[i + 1][1] ? OK : 'var(--n200)'}"></div>` : '<div style="flex:1"></div>'}
      </div>
      <span class="t-caption" style="color:${st === 2 ? 'var(--n900)' : st ? 'var(--ok)' : 'var(--n500)'};font-weight:${st === 2 ? 700 : 400};text-align:center">${l}</span></div>`).join('')}
  </div>
  <div class="card" style="padding:12px;margin-bottom:12px">
    <div class="row" style="gap:11px">
      <div class="av" style="width:44px;height:44px;font-size:18px">م</div>
      <div class="col" style="gap:2px;flex:1">
        <span class="t-title-sm bold">محمد العبداللات</span>
        <div class="row" style="gap:5px"><span class="i i-star"></span><span class="t-caption num" style="color:var(--n600)">4.9 · هيونداي i10 فضّي</span></div></div>
      <div class="col" style="align-items:center;gap:2px">
        <span class="t-title-md num ltr">42-1839</span>
        <span class="t-caption" style="color:var(--n500)">رقم اللوحة</span></div></div>
    <div class="row" style="gap:9px;margin-top:12px">
      <button class="btn btn-secondary btn-sm" style="flex:1">${ic('msg', { s: 16, c: '#0E47B4' })} رسالة</button>
      <button class="btn btn-secondary btn-sm" style="flex:1">${ic('phone', { s: 16, c: '#0E47B4' })} اتصال</button></div></div>
  <div class="card" style="padding:12px;background:var(--live-soft);border-color:#F5D89B">
    <div class="row" style="gap:9px"><span class="i i-live"></span>
      <span class="t-label" style="color:#7C4A03;font-weight:700">رمز الصعود: <span class="num ltr">7413</span></span>
      <div class="sp"></div><span class="t-caption" style="color:#7C4A03">أعطِه للكابتن</span></div></div>
</div>`));

s2.push(cell('15', 'انتهت الرحلة + التقييم', 'التقييم يُقرأ فعلاً — اليوم يُكتب ولا يُقرأ', `
${statusBar()}
<div style="position:absolute;inset:0;background:var(--n50)">
  <div class="col" style="align-items:center;padding:56px 20px 0">
    <div style="width:70px;height:70px;border-radius:50%;background:var(--ok-soft);display:grid;place-items:center;margin-bottom:16px">
      ${ic('check', { s: 34, c: OK, w: 2.6 })}</div>
    <span class="t-title-lg">وصلت بالسلامة</span>
    <span class="t-body" style="color:var(--n600);margin-top:4px">جامعة اليرموك · 14 دقيقة</span>
  </div>
  <div class="body" style="margin-top:26px">
    <div class="card" style="margin-bottom:12px">
      <div class="row"><span class="t-body" style="color:var(--n600)">الأجرة</span><div class="sp"></div><span class="t-title-sm num bold">1.250</span></div>
      <div class="row" style="margin-top:7px"><span class="t-body" style="color:var(--n600)">خصم الكوبون</span><div class="sp"></div><span class="t-title-sm num bold" style="color:var(--ok)">−0.200</span></div>
      <div class="row" style="margin-top:11px;padding-top:11px;border-top:1px solid var(--n200)">
        <span class="t-title-sm bold">خُصم من المحفظة</span><div class="sp"></div>${money('1.050')}</div></div>
    <div class="card">
      <span class="t-title-sm bold">كيف كانت رحلتك مع محمد؟</span>
      <div class="row" style="gap:9px;justify-content:center;margin:16px 0 14px">
        ${[1, 1, 1, 1, 0].map(f => `<svg width="38" height="38" viewBox="0 0 24 24" fill="${f ? '#F59E0B' : 'none'}" stroke="${f ? '#F59E0B' : '#C6CEDA'}" stroke-width="1.6"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5 2 9.5l7-1z"/></svg>`).join('')}</div>
      <div class="row" style="gap:7px;flex-wrap:wrap;justify-content:center">
        <span class="chip on">قيادة آمنة</span><span class="chip">سيارة نظيفة</span><span class="chip">في الوقت</span></div>
      <div style="height:14px"></div>${btn('إرسال التقييم')}
      <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:10px">تخطّي</div>
    </div>
  </div>
</div>`));

s2.push(cell('16', 'رحلاتي', 'تبويبان · حالة فراغ وخطأ إلزامية لكل قائمة', `
${statusBar()}
<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div class="body">
  ${seg(['قادمة', 'منتهية'], 1)}
  <div style="height:14px"></div>
  ${[['اليرموك — البوابة الشمالية', 'اليوم 8:12 ص', '1.050', 'ok', 'مكتملة', 'ok'],
      ['دوار الشهداء', 'أمس 4:30 م', '1.750', 'ok', 'مكتملة', 'ok'],
      ['اليرموك — الرئيسية', 'الأحد 7:55 ص', '1.400', 'bad', 'ملغاة', 'bad'],
      ['إسكان الحكمة', 'السبت 6:10 م', '2.100', 'ok', 'مكتملة', 'ok']].map(([t, d, m, tone, lbl, g]) => `
  <div class="card" style="padding:12px;margin-bottom:10px">
    <div class="row" style="gap:11px">
      <div class="ic ${tone === 'ok' ? 'ok' : 'bad'}" style="width:38px;height:38px">${ic('car', { s: 18, c: tone === 'ok' ? OK : '#D92D20' })}</div>
      <div class="col" style="gap:2px;flex:1;min-width:0">
        <span class="t-title-sm bold">${t}</span>
        <span class="t-caption" style="color:var(--n500)">${d}</span></div>
      <div class="col" style="align-items:flex-start;gap:4px">
        <span class="t-title-sm num bold">${m}</span>${pill(lbl, tone, g)}</div></div></div>`).join('')}
</div>${tabBar(1)}`));

out('03-student-ride.html', page({
  title: 'تطبيق الطالب — رحلة كاملة من الطلب إلى التقييم',
  sub: 'المسار المعتمد (ب): طلب فوري · RideRequests + Matching · 7 شاشات',
  cells: s2,
  notes: [
    { t: 'g', b: '<b>شاشة 10:</b> كتلة عائمة واحدة + شيت واحد بثلاث نقاط توقّف. اليوم <span class="ltr">home.tsx:130-186</span> يكدّس <b>4 كتل</b> (نقاط + اقتراحات + إعلان + لوحة) فوق الخريطة <span class="ltr" style="opacity:.55">&#8658;</span> على شاشة ≤6" تغطّيها بالكامل. وحُذفت السيارة الوهمية و«٣ دقائق» الثابتة.' },
    { t: 'g', b: '<b>شاشة 12:</b> تبتلع <span class="ltr">ride-request.tsx</span> (357 سطر) + <span class="ltr">checkout.tsx</span> (340 سطر). و<b>السعة و ETA من السيرفر</b> — اليوم مكتوبة يدوياً في <span class="ltr">ride-request.tsx:32-37</span>.' },
    { t: 'r', b: '<b>شاشة 13 — إصلاح خطأ قاتل:</b> الإلغاء هنا يفكّ الحجز المالي فعلياً. اليوم <span class="ltr">StudentTripController::cancelBooking</span> <b>سطر واحد</b> يغيّر الحالة فقط <span class="ltr" style="opacity:.55">&#8658;</span> <b>المال يبقى محجوزاً في المحفظة للأبد</b> (لا مسار في الكود كله يفكّه)، والطلب يبقى عالقاً فيُمنع الطالب من طلب جديد.' },
    { t: 'w', b: '<b>شاشة 14:</b> رمز الصعود <b>4 أرقام اليوم بلا throttle على مسارات الصعود/الإنزال</b> (<span class="ltr">Trips/Routes/api.php</span>) <span class="ltr" style="opacity:.55">&#8658;</span> الكابتن يستطيع تأكيد إنزال راكب لم ينزل بالتخمين، وهذا يهزم ضابط «التأكيد من الطرفين» الذي يعتمد عليه مركز النزاعات.' },
  ],
}));

console.log('generated: 02-student-auth.html, 03-student-ride.html');
