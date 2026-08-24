import { writeFileSync } from 'fs';
import { ic, statusBar, navBar, tabBar, pill, row, money, btn, field, seg, mapBg, cell, page } from './ui.mjs';
const B = '#1259E3', OK = '#047857', LIVE = '#F59E0B';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const c = [];

/* the giant online switch — full width, 60 tall. Not a Switch inside a card. */
const onlineSwitch = (on = true) => `
<div style="background:${on ? OK : 'var(--n200)'};border-radius:16px;height:60px;display:flex;align-items:center;padding:0 16px;gap:13px">
  <div style="width:48px;height:29px;border-radius:999px;background:rgba(255,255,255,${on ? '.32' : '.65'});
    display:flex;align-items:center;padding:3px;justify-content:${on ? 'flex-end' : 'flex-start'}">
    <div style="width:23px;height:23px;border-radius:50%;background:#fff"></div></div>
  <div class="col" style="gap:0">
    <span style="font:700 16px 'IBM Plex Sans Arabic';color:${on ? '#fff' : 'var(--n700)'}">${on ? 'متصل — تستقبل الطلبات' : 'غير متصل'}</span>
    <span style="font:400 11px 'IBM Plex Sans Arabic';color:${on ? 'rgba(255,255,255,.85)' : 'var(--n600)'}">${on ? 'اضغط لإيقاف الاستقبال' : 'اضغط لبدء استقبال الرحلات'}</span></div></div>`;

c.push(cell('25', 'الكوكبِت — متصل', 'مفتاح بعرض الشاشة · رقم بطل واحد · اليوم Switch صغير في بطاقة', `
${statusBar()}
<div class="nav-h"><div class="av" style="width:38px;height:38px;font-size:16px">م</div>
  <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">لوحة الكابتن</span>
    <span class="t-title-md">محمد العبداللات</span></div>
  <div class="sp"></div>${pill('معتمد', 'ok', 'ok')}</div>
<div class="body">
  ${onlineSwitch(true)}
  <div style="height:11px"></div>
  <div class="card" style="margin-bottom:11px">
    <span class="t-label" style="color:var(--n500)">أرباح اليوم</span>
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
  <div style="height:170px;border-radius:16px;overflow:hidden;position:relative;border:1px solid var(--n200);margin-bottom:11px">
    ${mapBg({ h: 170, live: { x: 190, y: 88 } })}
    <div style="position:absolute;top:9px;inset-inline-start:9px;background:#fff;box-shadow:var(--sh-md);border-radius:999px;
      height:28px;display:inline-flex;align-items:center;gap:6px;padding:0 10px">
      <div style="width:7px;height:7px;border-radius:50%;background:${OK}"></div>
      <span class="t-caption bold" style="color:var(--n800)">موقعك مباشر · إربد</span></div></div>
  <div class="card flush">
    ${row({ icon: 'car', title: 'رحلاتي' })}
    ${row({ icon: 'cash', title: 'أرباحي والسحب', trail: `<span class="t-label num" style="color:var(--n600);unicode-bidi:isolate">142.500 د.أ</span>` })}
    ${row({ icon: 'id', title: 'مركبتي ووثائقي', trail: pill('مكتملة', 'ok', 'ok') })}</div>
</div>${tabBar(0, 'driver')}`));

c.push(cell('26', 'الكوكبِت — غير معتمد', 'حالة الانتظار صريحة وتقول ما ينقص بالضبط', `
${statusBar()}
<div class="nav-h"><div class="av" style="width:38px;height:38px;font-size:16px;background:var(--n400)">س</div>
  <div class="col" style="gap:0"><span class="t-caption" style="color:var(--n500)">لوحة الكابتن</span>
    <span class="t-title-md">سامر الرشيد</span></div>
  <div class="sp"></div>${pill('قيد المراجعة', 'warn', 'wait')}</div>
<div class="body">
  <div class="card" style="background:var(--warn-soft);border-color:#F5D89B;margin-bottom:13px">
    <div class="row" style="gap:10px;align-items:flex-start">${ic('clock', { s: 19, c: '#B45309', w: 2 })}
      <div class="col" style="gap:3px;flex:1"><span class="t-title-sm bold" style="color:#7C4A03">وثائقك قيد المراجعة</span>
        <span class="t-caption" style="color:#7C4A03;line-height:18px">عادة تُراجَع خلال 24 ساعة عمل. سنُشعرك فوراً عند الاعتماد.</span></div></div></div>
  <span class="t-label" style="color:var(--n500)">حالة المتطلّبات</span>
  <div class="card flush" style="margin:8px 0 13px">
    ${row({ icon: 'id', tone: 'ok', iconColor: OK, title: 'الهوية الشخصية', sub: 'مرفوعة · قيد المراجعة', trail: pill('تم', 'ok', 'ok'), chev: false })}
    ${row({ icon: 'file', tone: 'ok', iconColor: OK, title: 'رخصة القيادة', sub: 'مرفوعة · قيد المراجعة', trail: pill('تم', 'ok', 'ok'), chev: false })}
    ${row({ icon: 'truck', tone: 'ok', iconColor: OK, title: 'رخصة المركبة', sub: 'مرفوعة · قيد المراجعة', trail: pill('تم', 'ok', 'ok'), chev: false })}
    ${row({ icon: 'shield', tone: 'wr', iconColor: '#B45309', title: 'شهادة عدم محكومية', sub: 'مطلوبة — لم تُرفع بعد', trail: pill('ناقص', 'warn', 'warn') })}</div>
  ${btn('رفع المستند الناقص')}
  <div style="height:11px"></div>
  <div class="card" style="padding:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('shield', { s: 17, c: B })}
      <span class="t-caption" style="color:var(--n600);line-height:18px;flex:1">
        <b>وثائقك محفوظة مشفّرة</b> ولا يراها إلا فريق التوثيق. تُحذف نهائياً عند رفض الطلب أو إغلاق حسابك.</span></div></div>
</div>${tabBar(0, 'driver')}`));

c.push(cell('27', 'العرض الوارد', 'ملء الشاشة + عدّاد + الصافي هو الرقم البطل · اليوم صفّ في قائمة', `
${statusBar()}
<div style="position:absolute;top:0;inset-inline:0;height:300px;overflow:hidden">
  ${mapBg({ h: 300, route: 'M104,250 L104,206 L186,206 L186,100 L282,100', pins: [{ x: 282, y: 100, c: OK }], live: { x: 104, y: 250 } })}</div>
<div style="position:absolute;inset-inline:0;bottom:0;top:278px;background:#fff;border-radius:24px 24px 0 0;
  padding:16px;display:flex;flex-direction:column">
  <div class="row" style="margin-bottom:12px">${pill('طلب جديد', 'live', 'live')}
    <span class="t-label" style="color:var(--n500)">رحلة فورية</span><div class="sp"></div>
    <div class="row" style="gap:7px"><span class="t-caption" style="color:var(--n500)">تنتهي بعد</span>
      <svg width="40" height="40" viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" fill="none" stroke="#DDE3EC" stroke-width="6"/>
        <circle cx="30" cy="30" r="25" fill="none" stroke="${B}" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="157" stroke-dashoffset="50" transform="rotate(-90 30 30)"/>
        <text x="30" y="37" text-anchor="middle" font-family="IBM Plex Sans Arabic" font-size="21" font-weight="700" fill="#0E1524">12</text></svg></div></div>
  <div class="row" style="align-items:baseline;gap:6px">
    <span class="num" style="font:700 38px/42px 'IBM Plex Sans Arabic';color:${OK}">1.900</span>
    <span class="t-title-md" style="color:var(--n600);unicode-bidi:isolate">د.أ</span>
    <div class="sp"></div>
    <div class="col" style="align-items:flex-start;gap:0">
      <span class="t-caption" style="color:var(--n500)">صافي لك بعد العمولة</span>
      <span class="t-label num" style="color:var(--n600);unicode-bidi:isolate">الأجرة 2.100 · العمولة 0.200</span></div></div>
  <div class="row" style="gap:0;margin:15px 0;padding:12px 0;border-top:1px solid var(--n100);border-bottom:1px solid var(--n100)">
    <div class="col" style="flex:1;gap:1px"><span class="t-caption" style="color:var(--n500)">للطالب</span><span class="t-title-md num">1.8 كم</span></div>
    <div style="width:1px;height:32px;background:var(--n200)"></div>
    <div class="col" style="flex:1;gap:1px;padding-inline-start:14px"><span class="t-caption" style="color:var(--n500)">الرحلة</span><span class="t-title-md num">6.4 كم</span></div>
    <div style="width:1px;height:32px;background:var(--n200)"></div>
    <div class="col" style="flex:1;gap:1px;padding-inline-start:14px"><span class="t-caption" style="color:var(--n500)">الوقت</span><span class="t-title-md num">14 د</span></div></div>
  <div class="row" style="gap:10px;align-items:flex-start;margin-bottom:12px">
    <div class="col" style="align-items:center;gap:0;padding-top:5px">
      <div style="width:8px;height:8px;border-radius:50%;background:${B}"></div>
      <div style="width:2px;height:22px;background:var(--n300)"></div>
      <div style="width:8px;height:8px;border-radius:50%;background:${OK}"></div></div>
    <div class="col" style="flex:1;gap:12px">
      <span class="t-title-sm bold">حي الجامعة، شارع الملكة نور</span>
      <span class="t-title-sm bold">جامعة اليرموك — البوابة الشمالية</span></div></div>
  <div class="row" style="gap:7px;margin-bottom:4px">${pill('يدفع من المحفظة', 'info')}${pill('تقييم الطالب 4.8', 'mute')}</div>
  <div class="sp"></div>
  <div class="row" style="gap:10px;padding-bottom:4px">
    <button class="btn btn-ghost" style="height:54px;flex:.4;font-size:15px">تجاهل</button>
    <button class="btn btn-primary" style="height:54px;flex:1;font-size:16px">اقبل الرحلة</button></div>
</div>`));

c.push(cell('28', 'وضع الرحلة', 'خطوة واحدة · زر بارتفاع 54 · بلا تمرير — يستخدمه وهو يسوق', `
${statusBar()}
<div style="position:absolute;top:0;inset-inline:0;height:430px;overflow:hidden">
  ${mapBg({ h: 430, route: 'M110,360 L110,300 L186,300 L186,150 L280,150', pins: [{ x: 280, y: 150, c: OK }], live: { x: 130, y: 322 } })}</div>
<div style="position:absolute;top:52px;inset-inline:16px;z-index:60">
  <div class="float" style="padding:12px 14px">
    <div class="row"><span class="t-caption" style="color:var(--n500)">الوجهة</span><div class="sp"></div>
      <span class="t-caption num" style="color:var(--n500)">4.2 كم متبقية</span></div>
    <span class="t-title-md" style="display:block;margin-top:2px">اليرموك — البوابة الشمالية</span></div></div>
<div style="position:absolute;inset-inline:0;bottom:0;top:408px;background:#fff;border-radius:24px 24px 0 0;padding:16px;display:flex;flex-direction:column">
  <div class="row" style="gap:11px;margin-bottom:14px">
    <div class="av" style="width:46px;height:46px;font-size:19px">ح</div>
    <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold">حمزة الطعاني</span>
      <span class="t-caption" style="color:var(--n500)">الراكب · يدفع من المحفظة</span></div>
    <div class="row" style="gap:8px">
      <div style="width:42px;height:42px;border-radius:12px;background:var(--b50);display:grid;place-items:center">${ic('msg', { s: 19, c: B })}</div>
      <div style="width:42px;height:42px;border-radius:12px;background:var(--b50);display:grid;place-items:center">${ic('phone', { s: 19, c: B })}</div></div></div>
  <div class="card" style="background:var(--b50);border-color:var(--b200);padding:14px;margin-bottom:12px">
    <span class="t-label" style="color:var(--b800)">أدخل رمز الإنزال من الطالب</span>
    <div class="row" style="gap:8px;margin-top:9px;direction:ltr">
      ${[7, 4, 1, '', '', ''].map((d, i) => `<div style="flex:1;height:52px;border-radius:12px;background:#fff;
        border:${i === 3 ? `1.5px solid ${B}` : '1px solid var(--b200)'};display:grid;place-items:center;
        font:700 22px 'IBM Plex Sans Arabic'">${d}</div>`).join('')}</div>
    <span class="t-caption" style="color:var(--b800);display:block;margin-top:8px">6 أرقام — تأكيد من الطرفين يحمي الاثنين من النزاعات</span></div>
  <div class="sp"></div>
  <div class="row" style="gap:10px;padding-bottom:4px">
    <button class="btn btn-ghost" style="height:54px;flex:.34;font-size:14px">مشكلة</button>
    <button class="btn btn-primary" style="height:54px;flex:1;font-size:16px">تأكيد الإنزال وإنهاء الرحلة</button></div>
</div>`));

c.push(cell('29', 'رحلاتي', 'قائمة نظيفة بحالة واضحة لكل رحلة', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">رحلاتي</span></div>
<div class="body">
  ${seg(['اليوم', 'الأسبوع', 'الكل'], 0)}
  <div style="height:12px"></div>
  ${[['8:12 ص', 'حي الجامعة<span class="ltr" style="opacity:.5;font-weight:400"> &#8594; </span>اليرموك', '1.900', 'مكتملة', 'ok', 'ok'],
    ['7:40 ص', 'إسكان الحكمة<span class="ltr" style="opacity:.5;font-weight:400"> &#8594; </span>اليرموك', '1.700', 'مكتملة', 'ok', 'ok'],
    ['7:05 ص', 'دوار الشهداء<span class="ltr" style="opacity:.5;font-weight:400"> &#8594; </span>اليرموك', '2.300', 'مكتملة', 'ok', 'ok'],
    ['6:48 ص', 'شارع الجامعة<span class="ltr" style="opacity:.5;font-weight:400"> &#8594; </span>اليرموك', '1.500', 'ألغاها الطالب', 'bad', 'bad']].map(([t, r, m, lbl, tone, g]) => `
  <div class="card" style="padding:12px;margin-bottom:9px">
    <div class="row" style="gap:11px">
      <div class="col" style="align-items:center;gap:0;width:44px;flex-shrink:0">
        <span class="t-caption num" style="color:var(--n500)">${t.split(' ')[0]}</span>
        <span class="t-caption" style="color:var(--n500)">${t.split(' ')[1]}</span></div>
      <div style="width:1px;height:32px;background:var(--n200)"></div>
      <div class="col" style="gap:3px;flex:1;min-width:0">
        <span class="t-title-sm bold">${r}</span>${pill(lbl, tone, g)}</div>
      <span class="t-title-sm num bold" style="color:${tone === 'ok' ? OK : 'var(--n400)'}">${m}</span></div></div>`).join('')}
</div>${tabBar(1, 'driver')}`));

c.push(cell('30', 'أرباحي', 'شاشة واحدة بتبويبات — تدمج 4 شاشات (573 سطر) اليوم', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">أرباحي</span></div>
<div class="body">
  <div class="card" style="margin-bottom:12px">
    <span class="t-label" style="color:var(--n500)">الرصيد القابل للسحب</span>
    <div class="row" style="align-items:baseline;gap:5px;margin-top:1px">
      <span class="num" style="font:700 30px/36px 'IBM Plex Sans Arabic'">142.500</span>
      <span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span></div>
    <div style="height:13px"></div>${btn('طلب سحب')}
    <div class="row" style="gap:7px;margin-top:10px;justify-content:center">
      ${ic('clock', { s: 14, c: '#67728A' })}<span class="t-caption" style="color:var(--n500)">التحويل خلال يومي عمل</span></div></div>
  ${seg(['يومي', 'أسبوعي', 'شهري'], 1)}
  <div style="height:12px"></div>
  <div class="card" style="margin-bottom:12px">
    <div class="row" style="margin-bottom:14px"><span class="t-title-sm bold">هذا الأسبوع</span><div class="sp"></div>
      <span class="t-title-sm num bold" style="unicode-bidi:isolate">96.400 د.أ</span></div>
    <div class="row" style="gap:7px;align-items:flex-end;height:88px">
      ${[[38, 'أحد'], [62, 'اثن'], [44, 'ثلا'], [80, 'أرب'], [100, 'خمس'], [26, 'جمع'], [12, 'سبت']].map(([h, d], i) => `
      <div class="col" style="flex:1;align-items:center;gap:6px">
        <div style="width:100%;height:${h * .72}px;border-radius:6px;background:${i === 4 ? B : 'var(--b200)'}"></div>
        <span class="t-caption" style="color:${i === 4 ? 'var(--n900)' : 'var(--n500)'};font-weight:${i === 4 ? 700 : 400}">${d}</span></div>`).join('')}
    </div></div>
  <div class="card flush">
    ${row({ icon: 'cash', tone: 'ok', iconColor: OK, title: 'سحب — تم التحويل', sub: 'الأحد 18 آب', trail: `<span class="t-title-sm num bold" style="color:${OK}">80.000</span>`, chev: false })}
    ${row({ icon: 'clock', tone: 'wr', iconColor: '#B45309', title: 'سحب — قيد المعالجة', sub: 'أمس 9:20 م', trail: `<span class="t-title-sm num bold" style="color:var(--n500)">50.000</span>`, chev: false })}
  </div>
</div>${tabBar(2, 'driver')}`));

c.push(cell('31', 'مركبتي ووثائقي', 'يدمج documents (258) + vehicle (90) · ويضيف تعديل/حذف المركبة', `
${statusBar()}${navBar('مركبتي ووثائقي')}
<div class="body">
  <div class="card" style="margin-bottom:13px">
    <div class="row" style="margin-bottom:12px"><span class="t-title-sm bold">المركبة</span><div class="sp"></div>
      <span class="t-label" style="color:var(--b700);font-weight:700">تعديل</span></div>
    <div class="row" style="gap:12px">
      <div class="ic" style="width:52px;height:52px;border-radius:14px">${ic('car', { s: 26, c: B, w: 1.6 })}</div>
      <div class="col" style="gap:3px;flex:1">
        <span class="t-title-md">هيونداي i10</span>
        <span class="t-caption" style="color:var(--n500)">فضّي · 2019 · 4 مقاعد</span></div>
      <div class="col" style="align-items:center;gap:2px">
        <span class="t-title-md num ltr">42-1839</span>
        <span class="t-caption" style="color:var(--n500)">اللوحة</span></div></div></div>
  <span class="t-label" style="color:var(--n500)">الوثائق</span>
  <div class="card flush" style="margin:8px 0 13px">
    ${row({ icon: 'id', tone: 'ok', iconColor: OK, title: 'الهوية الشخصية', sub: 'معتمدة · تنتهي 2029/04', trail: pill('معتمد', 'ok', 'ok') })}
    ${row({ icon: 'file', tone: 'ok', iconColor: OK, title: 'رخصة القيادة', sub: 'معتمدة · تنتهي 2027/11', trail: pill('معتمد', 'ok', 'ok') })}
    ${row({ icon: 'truck', tone: 'wr', iconColor: '#B45309', title: 'رخصة المركبة', sub: 'تنتهي بعد 21 يوماً', trail: pill('تنتهي قريباً', 'warn', 'warn') })}
    ${row({ icon: 'shield', tone: 'ok', iconColor: OK, title: 'شهادة عدم محكومية', sub: 'معتمدة', trail: pill('معتمد', 'ok', 'ok') })}</div>
  <div class="card" style="padding:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('lock', { s: 17, c: B })}
      <span class="t-caption" style="color:var(--n600);line-height:18px;flex:1">
        <b>وثائقك مشفّرة</b> ولا يراها إلا فريق التوثيق. <b>تُحذف نهائياً</b> عند رفض الطلب أو إغلاق حسابك — وهذا غير مُنفَّذ اليوم.</span></div></div>
</div>`));

c.push(cell('32', 'حسابي — الكابتن', 'نفس بنية حساب الطالب · مع حذف الحساب والروابط القانونية', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">حسابي</span></div>
<div class="body">
  <div class="card" style="margin-bottom:12px">
    <div class="row" style="gap:12px">
      <div class="av" style="width:50px;height:50px;font-size:21px">م</div>
      <div class="col" style="gap:2px;flex:1"><span class="t-title-md">محمد العبداللات</span>
        <span class="t-caption num ltr" style="color:var(--n500)">0796543210</span></div>
      <span class="t-label" style="color:var(--b700);font-weight:700">تعديل</span></div>
    <div class="row" style="gap:0;margin-top:13px;padding-top:12px;border-top:1px solid var(--n100)">
      <div class="col" style="flex:1;gap:1px"><span class="t-caption" style="color:var(--n500)">تقييمي</span>
        <div class="row" style="gap:4px"><span class="i i-star"></span><span class="t-title-sm num bold">4.9</span></div></div>
      <div style="width:1px;height:28px;background:var(--n200)"></div>
      <div class="col" style="flex:1;gap:1px;padding-inline-start:13px"><span class="t-caption" style="color:var(--n500)">إجمالي الرحلات</span>
        <span class="t-title-sm num bold">1,284</span></div>
      <div style="width:1px;height:28px;background:var(--n200)"></div>
      <div class="col" style="flex:1;gap:1px;padding-inline-start:13px"><span class="t-caption" style="color:var(--n500)">منذ</span>
        <span class="t-title-sm bold">آذار 2026</span></div></div></div>
  <div class="card flush" style="margin-bottom:12px">
    ${row({ icon: 'id', title: 'مركبتي ووثائقي', trail: pill('مكتملة', 'ok', 'ok') })}
    ${row({ icon: 'bell', title: 'الإشعارات' })}
    ${row({ icon: 'globe', title: 'اللغة', trail: `<span class="t-label" style="color:var(--n600)">العربية</span>` })}
  </div>
  <div class="card flush" style="margin-bottom:12px">
    ${row({ icon: 'headset', title: 'الدعم والمساعدة' })}
    ${row({ icon: 'lock', title: 'سياسة الخصوصية' })}
    ${row({ icon: 'file', title: 'الشروط والأحكام' })}
  </div>
  <div class="card flush">
    ${row({ icon: 'logout', tone: 'g', iconColor: '#4E5872', title: 'تسجيل الخروج', chev: false })}
    ${row({ icon: 'trash', tone: 'bad', iconColor: '#D92D20', title: '<span style="color:var(--bad)">حذف حسابي نهائياً</span>', chev: false })}
  </div>
</div>${tabBar(3, 'driver')}`));

out('05-driver.html', page({
  title: 'تطبيق الكابتن — 8 شاشات',
  sub: 'المبدأ الحاكم: الكابتن يستخدم التطبيق وهو يسوق · أهداف لمس 54 في وضع الرحلة',
  cells: c,
  notes: [
    { t: 'g', b: '<b>شاشة 25:</b> مفتاح «متصل» <b>بعرض الشاشة وارتفاع 60</b> — اليوم <span class="ltr">Switch</span> صغير داخل بطاقة (<span class="ltr">dashboard.tsx</span>). و<b>رقم بطل واحد</b> (أرباح اليوم)؛ التقييم والرحلات سطر ثانوي.' },
    { t: 'g', b: '<b>شاشة 27:</b> <b>ملء الشاشة + عدّاد + صوت + اهتزاز.</b> اليوم العرض الوارد <span class="ltr">ListRow</span> داخل بطاقة (<span class="ltr">dashboard.tsx:157-166</span>) — لن يراه أحد وهو يسوق. و<b>الصافي بعد العمولة</b> هو الرقم البطل لأنه أساس القرار.' },
    { t: 'w', b: '<b>شاشة 28:</b> رمز الإنزال <b>6 أرقام</b> — اليوم 4 أرقام (10⁴) <b>وبلا throttle</b> على مسارات الصعود/الإنزال (<span class="ltr">Trips/Routes/api.php</span>) <span class="ltr" style="opacity:.55">&#8658;</span> يمكن تأكيد إنزال راكب لم ينزل بالتخمين، وهذا يهزم ضابط «التأكيد من الطرفين» الذي يعتمد عليه مركز النزاعات.' },
    { t: 'r', b: '<b>شاشة 26 و31 — التزام غير مُنفَّذ:</b> النصّ يَعِد بحذف الوثائق عند الرفض أو إغلاق الحساب. الواقع: <span class="ltr">DriverDocumentService</span> يحذف الملف <b>عند الاستبدال فقط</b>؛ الرفض يُسجّل تدقيقاً بلا حذف، و<span class="ltr">ProfileService::deleteAccount</span> <b>لا يمسّ وثائق الكباتن إطلاقاً</b> <span class="ltr" style="opacity:.55">&#8658;</span> صور الهويات والرخص تبقى في التخزين <b>للأبد</b> بعد حذف الحساب.' },
    { t: 'r', b: '<b>ثغرة صامتة تُعطّل الشاشات 25 و28:</b> <span class="ltr">driver-app/src/lib/permissions.ts</span> يستورد <span class="ltr">expo-location</span> وهي <b>غير مثبّتة في <span class="ltr">package.json</span> وغير معلنة في <span class="ltr">plugins</span></b> <span class="ltr" style="opacity:.55">&#8658;</span> كل دوال الموقع تُرجع <span class="ltr">null</span> بصمت (<span class="ltr">catch</span> يبتلعها) <span class="ltr" style="opacity:.55">&#8658;</span> <b>تتبّع الكابتن معطّل فعلياً</b>، وتسقط معه ميزات السلامة التي يعتمد عليها الباكند.' },
  ],
}));
console.log('generated 05-driver.html');
