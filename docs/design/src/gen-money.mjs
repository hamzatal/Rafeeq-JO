import { writeFileSync } from 'fs';
import { ic, statusBar, navBar, tabBar, pill, row, money, btn, field, seg, cell, page } from './ui.mjs';
const B = '#1259E3', OK = '#047857';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const cur = `<span style="unicode-bidi:isolate">د.أ</span>`;
const c = [];

c.push(cell('17', 'المحفظة', 'شاشة مالية واحدة — تبتلع payments.tsx الميتة (188 سطر)', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">المحفظة</span></div>
<div class="body">
  <div class="card" style="margin-bottom:12px">
    <span class="t-label" style="color:var(--n500)">الرصيد المتاح</span>
    <div class="row" style="align-items:baseline;gap:5px;margin-top:1px">
      <span class="num" style="font:700 30px/36px 'IBM Plex Sans Arabic'">12.500</span>
      <span class="t-title-sm" style="color:var(--n600);unicode-bidi:isolate">د.أ</span></div>
    <div class="row" style="gap:9px;margin-top:14px">
      <button class="btn btn-primary btn-sm" style="flex:1">${ic('plus', { s: 16, c: '#fff', w: 2.4 })} شحن الرصيد</button>
      <button class="btn btn-secondary btn-sm" style="flex:1">اشتراكي</button></div></div>
  ${seg(['الحركات', 'الشحنات'], 0)}
  <div style="height:12px"></div>
  <div class="card flush">
    ${[['رحلة — اليرموك', 'اليوم 8:12 ص', '−1.050', 'bad', ''],
      ['شحن عبر CliQ', 'أمس 6:40 م', '+10.000', 'ok', 'معتمد'],
      ['شحن عبر CliQ', 'أمس 2:15 م', '+5.000', 'wait', 'قيد المراجعة'],
      ['كوبون STUDENT20', 'قبل 3 أيام', '+2.000', 'ok', ''],
      ['رحلة — دوار الشهداء', 'قبل 4 أيام', '−1.750', 'bad', '']].map(([t, d, m, k, badge]) => {
    const up = m.startsWith('+');
    const tone = k === 'wait' ? 'wr' : up ? 'ok' : 'bad';
    const col = k === 'wait' ? '#B45309' : up ? OK : '#D92D20';
    return `<div class="lr">
      <div class="ic ${tone}">${ic(k === 'wait' ? 'clock' : up ? 'cash' : 'car', { s: 17, c: col })}</div>
      <div class="col" style="gap:2px;flex:1;min-width:0"><span class="t-title-sm bold">${t}</span>
        <div class="row" style="gap:6px"><span class="t-caption" style="color:var(--n500)">${d}</span>
        ${badge ? pill(badge, k === 'wait' ? 'warn' : 'ok', k === 'wait' ? 'wait' : 'ok') : ''}</div></div>
      <span class="t-title-sm num bold" style="color:${k === 'wait' ? 'var(--n500)' : col};unicode-bidi:isolate">${m}</span></div>`;
  }).join('')}
  </div>
</div>${tabBar(2)}`));

c.push(cell('18', 'شحن الرصيد — CliQ', 'مسار شحن واحد فقط · اليوم يوجد مسارَان أحدهما ميت', `
${statusBar()}${navBar('شحن الرصيد')}
<div class="body">
  <span class="t-label" style="color:var(--n500)">المبلغ</span>
  <div class="row" style="gap:8px;margin:8px 0 14px">
    ${['5', '10', '20', '50'].map((v, i) => `<div class="chip ${i === 1 ? 'on' : ''}" style="flex:1;text-align:center" class="num">${v}</div>`).join('')}</div>
  ${field('أو أدخل مبلغاً', '10.000', { icon: 'cash' })}
  <div class="card" style="margin:16px 0 12px">
    <div class="row" style="margin-bottom:12px">${ic('id', { s: 19, c: B })}<span class="t-title-sm bold">حوّل إلى هذا الاسم المستعار</span></div>
    <div class="row" style="background:var(--b50);border-radius:12px;padding:12px 13px">
      <span class="t-title-md ltr num" style="color:var(--b800);flex:1">RAFEEQ.JO</span>
      <span class="t-label" style="color:var(--b700);font-weight:700">نسخ</span></div>
    <div class="t-caption" style="color:var(--n500);margin-top:10px;line-height:18px">
      حوّل المبلغ عبر CliQ من تطبيق بنكك، ثم ارفع صورة الإيصال. تُراجع خلال دقائق.</div></div>
  <div class="card" style="border-style:dashed;border-color:var(--n300);align-items:center;display:flex;flex-direction:column;gap:8px;padding:22px">
    <div class="ic" style="width:44px;height:44px">${ic('cam', { s: 21, c: B })}</div>
    <span class="t-title-sm bold">ارفع صورة الإيصال</span>
    <span class="t-caption" style="color:var(--n500);text-align:center">JPG أو PNG · حتى 8 ميجابايت</span></div>
  <div class="card" style="margin-top:12px;background:var(--warn-soft);border-color:#F5D89B;padding:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('shield', { s: 17, c: '#B45309', w: 2 })}
      <span class="t-caption" style="color:#7C4A03;line-height:18px;flex:1">
        <b>خصوصيتك:</b> صورة الإيصال تُراجَع آلياً. نُخفي رقم حسابك قبل أي معالجة، ولا تُحفظ بعد الاعتماد.</span></div></div>
  <div style="height:14px"></div>${btn('إرسال للمراجعة')}
</div>`));

c.push(cell('19', 'اشتراكي', 'خطّي الشهري — التدفّق المنفصل للرحلات المجدولة (قرار ب)', `
${statusBar()}${navBar('اشتراكي')}
<div class="body">
  <div class="card" style="background:${B};border-color:${B};margin-bottom:14px">
    <div class="row"><span class="t-label" style="color:rgba(255,255,255,.8)">الخطة الحالية</span><div class="sp"></div>
      <span class="pill" style="background:rgba(255,255,255,.2);color:#fff">نشط</span></div>
    <span class="t-title-lg" style="color:#fff;display:block;margin-top:3px">شهري — ذهاب وعودة</span>
    <div class="row" style="gap:0;margin-top:14px;padding-top:13px;border-top:1px solid rgba(255,255,255,.22)">
      <div class="col" style="flex:1;gap:1px"><span class="t-caption" style="color:rgba(255,255,255,.75)">رحلات متبقية</span>
        <span class="t-title-md num" style="color:#fff">32</span></div>
      <div style="width:1px;height:30px;background:rgba(255,255,255,.22)"></div>
      <div class="col" style="flex:1;gap:1px;padding-inline-start:14px"><span class="t-caption" style="color:rgba(255,255,255,.75)">ينتهي في</span>
        <span class="t-title-md num" style="color:#fff">14 أيلول</span></div></div></div>
  <span class="t-label" style="color:var(--n500)">رحلاتي المجدولة</span>
  <div class="card flush" style="margin:8px 0 14px">
    ${row({ icon: 'clock', title: 'الأحد — 7:30 ص', sub: 'البيت <span class="ltr" style="opacity:.5">&#8592;</span> اليرموك · مقعد محفوظ' })}
    ${row({ icon: 'clock', title: 'الأحد — 2:00 م', sub: 'اليرموك <span class="ltr" style="opacity:.5">&#8592;</span> البيت · مقعد محفوظ' })}
    ${row({ icon: 'plus', tone: 'g', iconColor: '#4E5872', title: 'إضافة موعد ثابت' })}</div>
  ${btn('تغيير الخطة', 'secondary')}
  <div style="height:9px"></div>
  <div class="t-caption" style="color:var(--n500);text-align:center">إلغاء الاشتراك متاح في أي وقت من الدعم</div>
</div>`));

c.push(cell('20', 'الإشعارات', 'حالة مقروء/غير مقروء واضحة بلا اعتماد على اللون وحده', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">الإشعارات</span><div class="sp"></div>
  <span class="t-label" style="color:var(--b700);font-weight:700">تعليم الكل كمقروء</span></div>
<div class="body">
  ${[[1, 'car', 'كابتنك في الطريق', 'محمد العبداللات — يصل خلال 4 دقائق', 'قبل دقيقتين', 'info'],
    [1, 'cash', 'تم اعتماد شحن الرصيد', 'أُضيف 10.000 دينار إلى محفظتك', 'قبل 18 دقيقة', 'ok'],
    [0, 'gift', 'كوبون جديد لك', 'خصم 20% على أول 3 رحلات — STUDENT20', 'أمس', 'info'],
    [0, 'shield', 'حدّثنا سياسة الخصوصية', 'اطّلع على التغييرات', 'قبل 3 أيام', 'mute'],
    [0, 'car', 'انتهت رحلتك', 'اليرموك — البوابة الشمالية · 1.050 دينار', 'قبل 4 أيام', 'ok']].map(([unread, i, t, d, when, tone]) => `
  <div class="card" style="padding:12px;margin-bottom:9px;${unread ? `border-inline-start:3px solid ${B}` : ''}">
    <div class="row" style="gap:11px;align-items:flex-start">
      <div class="ic ${tone === 'ok' ? 'ok' : tone === 'mute' ? 'g' : ''}" style="width:34px;height:34px">
        ${ic(i, { s: 16, c: tone === 'ok' ? OK : tone === 'mute' ? '#4E5872' : B })}</div>
      <div class="col" style="gap:2px;flex:1;min-width:0">
        <div class="row" style="gap:6px"><span class="t-title-sm bold">${t}</span>
          ${unread ? `<div style="width:7px;height:7px;border-radius:50%;background:${B}"></div>` : ''}</div>
        <span class="t-caption" style="color:var(--n600);line-height:17px">${d}</span>
        <span class="t-caption" style="color:var(--n500);margin-top:2px">${when}</span></div></div></div>`).join('')}
</div>`));

c.push(cell('21', 'حسابي', 'يضمّ حذف الحساب + روابط قانونية حقيقية — كلها ناقصة اليوم', `
${statusBar()}<div class="nav-h"><span class="t-title-lg">حسابي</span></div>
<div class="body">
  <div class="card" style="margin-bottom:12px">
    <div class="row" style="gap:12px">
      <div class="av" style="width:50px;height:50px;font-size:21px">ح</div>
      <div class="col" style="gap:2px;flex:1"><span class="t-title-md">حمزة الطعاني</span>
        <span class="t-caption num ltr" style="color:var(--n500)">0791234567</span></div>
      <span class="t-label" style="color:var(--b700);font-weight:700">تعديل</span></div></div>
  <div class="card" style="padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
    <div class="ic" style="width:38px;height:38px">${ic('star', { s: 18, c: B })}</div>
    <div class="col" style="gap:1px;flex:1"><span class="t-caption" style="color:var(--n500)">نقاطي</span>
      <span class="t-title-md num">1,240</span></div>
    ${pill('فضّي', 'info')}
    <span class="chev">${ic('chev', { s: 17, c: '#96A0B2', w: 2 })}</span></div>
  <div class="card flush" style="margin-bottom:12px">
    ${row({ icon: 'sparkle', title: 'مساعد رفيق' })}
    ${row({ icon: 'bell', title: 'الإشعارات' })}
    ${row({ icon: 'globe', title: 'اللغة', trail: `<span class="t-label" style="color:var(--n600)">العربية</span>` })}
    ${row({ icon: 'shield', title: 'جهات الاتصال للطوارئ' })}
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
  <div class="t-caption" style="color:var(--n500);text-align:center;margin-top:14px">رفيق · الإصدار <span class="ltr num">1.0.0</span></div>
</div>${tabBar(3)}`));

c.push(cell('22', 'حذف الحساب', '⚠ غير موجود اليوم في أي واجهة = رفض مؤكّد من المتجرين', `
${statusBar()}${navBar('حذف الحساب')}
<div class="body" style="padding-top:8px">
  <div class="col" style="align-items:center;gap:12px;margin-bottom:20px">
    <div style="width:62px;height:62px;border-radius:50%;background:var(--bad-soft);display:grid;place-items:center">
      ${ic('alert', { s: 29, c: '#D92D20', w: 2 })}</div>
    <span class="t-title-lg" style="text-align:center">حذف حسابك نهائياً؟</span></div>
  <div class="card" style="margin-bottom:12px">
    <span class="t-title-sm bold" style="display:block;margin-bottom:11px">ما سيُحذف فوراً</span>
    ${[['اسمك ورقم هاتفك وبريدك', 'تُستبدل بقيم مُجهَّلة'],
      ['عناوينك المحفوظة', 'تُحذف كلياً'],
      ['محادثاتك وتقييماتك', 'تُجهَّل الهوية'],
      ['أي وثائق مرفوعة', 'تُحذف من التخزين']].map(([a, b]) => `
    <div class="row" style="gap:8px;margin-bottom:8px;align-items:flex-start">
      <span class="i i-ok" style="margin-top:4px"></span>
      <span class="t-caption" style="color:var(--n700);flex:1"><b>${a}</b> — ${b}</span></div>`).join('')}
  </div>
  <div class="card" style="background:var(--warn-soft);border-color:#F5D89B;margin-bottom:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('file', { s: 17, c: '#B45309', w: 2 })}
      <span class="t-caption" style="color:#7C4A03;line-height:18px;flex:1">
        <b>يُحتفظ بسجلّ المدفوعات مُجهَّل الهوية</b> لخمس سنوات — التزام محاسبي وقانوني، وبلا أي بيان يعرّفك.</span></div></div>
  <div class="card" style="background:var(--bad-soft);border-color:#F9CFCB;margin-bottom:16px;padding:12px">
    <div class="row" style="gap:9px"><span class="i i-bad" style="margin-top:3px"></span>
      <span class="t-caption" style="color:#8A1A12;line-height:18px;flex:1">
        رصيدك الحالي <b class="num">12.500</b> دينار <b>سيُفقد</b>. اسحبه أو استخدمه قبل الحذف.</span></div></div>
  ${btn('حذف حسابي نهائياً', 'danger')}
  <div style="height:9px"></div>${btn('إلغاء', 'ghost')}
</div>`));

c.push(cell('23', 'مساعد رفيق', 'حبّة على الرئيسية + مدخل هنا — لا يحتل مركز التبويب', `
${statusBar()}${navBar('مساعد رفيق', { action: pill('AI', 'info') })}
<div class="body" style="padding-top:6px">
  <div class="card" style="background:var(--b50);border-color:var(--b200);padding:12px;margin-bottom:14px">
    <div class="row" style="gap:9px">${ic('sparkle', { s: 17, c: B, w: 2 })}
      <span class="t-caption" style="color:var(--b900);flex:1;line-height:18px">
        يقرأ بياناتك في التطبيق فقط. لا يشارك محادثاتك ولا يتخذ قراراً مالياً بدلاً عنك.</span></div></div>
  <div style="display:flex;flex-direction:column;gap:11px">
    <div style="align-self:flex-start;max-width:82%;background:var(--n100);border-radius:16px 16px 16px 5px;padding:11px 13px">
      <span class="t-body">كم صرفت على الرحلات هذا الشهر؟</span></div>
    <div style="align-self:flex-end;max-width:86%;background:${B};border-radius:16px 16px 5px 16px;padding:11px 13px">
      <span class="t-body" style="color:#fff">صرفت <b class="num">18.400</b> دينار على <b class="num">14</b> رحلة في آب.
      متوسّط الرحلة <b class="num">1.314</b> دينار.<br><br>
      لو أخذت الخطة الشهرية (<b class="num">24</b> ديناراً / <b class="num">40</b> رحلة) توفّر حوالي <b class="num">7</b> دنانير شهرياً.</span></div>
    <div style="align-self:flex-end" class="row" style="gap:7px">
      <span class="chip" style="font-size:11.5px">اعرض الخطط</span></div>
    <div style="align-self:flex-start;max-width:60%;background:var(--n100);border-radius:16px 16px 16px 5px;padding:11px 13px">
      <span class="t-body">وين أقرب نقطة التقاط؟</span></div>
    <div class="row" style="align-self:flex-end;gap:5px;padding:4px 0">
      ${[0, 1, 2].map(i => `<div style="width:6px;height:6px;border-radius:50%;background:var(--b400);opacity:${1 - i * 0.28}"></div>`).join('')}</div>
  </div>
</div>
<div style="position:absolute;inset-inline:0;bottom:0;padding:11px 16px 20px;background:#fff;border-top:1px solid var(--n200)">
  <div class="row" style="gap:9px">
    <div class="input ph" style="flex:1">اسأل عن رحلاتك أو رصيدك…</div>
    <div style="width:46px;height:46px;border-radius:12px;background:${B};display:grid;place-items:center;flex-shrink:0">
      ${ic('send', { s: 18, c: '#fff', w: 2 })}</div></div></div>`));

c.push(cell('24', 'الاستغاثة (SOS)', 'مبسّطة جذرياً — تُستخدم في حالة ذعر · اليوم 340 سطراً', `
${statusBar()}${navBar('الطوارئ')}
<div class="body" style="padding-top:10px">
  <div style="background:var(--bad-soft);border:1px solid #F9CFCB;border-radius:16px;padding:22px;display:flex;
    flex-direction:column;align-items:center;gap:14px;margin-bottom:16px">
    <div style="width:104px;height:104px;border-radius:50%;background:var(--bad);display:grid;place-items:center;
      box-shadow:0 0 0 10px rgba(217,45,32,.14)">${ic('shield', { s: 46, c: '#fff', w: 2.2 })}</div>
    <div class="col" style="align-items:center;gap:3px">
      <span class="t-title-md" style="color:#8A1A12">اضغط مطوّلاً للاستغاثة</span>
      <span class="t-caption" style="color:#8A1A12;text-align:center">نرسل موقعك وتفاصيل رحلتك لفريق السلامة وجهات اتصالك</span></div></div>
  <span class="t-label" style="color:var(--n500)">جهات اتصالي</span>
  <div class="card flush" style="margin:8px 0 14px">
    ${row({ icon: 'phone', title: 'والدي', sub: '0796••••21', trail: pill('أساسي', 'info'), chev: false })}
    ${row({ icon: 'phone', title: 'أحمد — أخي', sub: '0785••••04', chev: false })}
    ${row({ icon: 'plus', tone: 'g', iconColor: '#4E5872', title: 'إضافة جهة اتصال', chev: false })}</div>
  <div class="card flush">
    ${row({ icon: 'headset', tone: 'wr', iconColor: '#B45309', title: 'اتصال بالشرطة — 911', chev: false })}
  </div>
  <div class="card" style="margin-top:14px;padding:12px">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('map', { s: 17, c: B })}
      <span class="t-caption" style="color:var(--n600);line-height:18px;flex:1">
        موقعك يُرسل <b>لحظة الاستغاثة فقط</b>. لا نتتبّعك في الخلفية أبداً.</span></div></div>
</div>`));

out('04-student-money.html', page({
  title: 'تطبيق الطالب — المال والحساب والسلامة',
  sub: '8 شاشات · تشمل حذف الحساب والروابط القانونية (كلها ناقصة اليوم)',
  cells: c,
  notes: [
    { t: 'r', b: '<b>شاشة 22 — رافض مؤكّد اليوم:</b> <span class="ltr">DELETE /profile</span> <b>موصول في الباكند</b> (<span class="ltr">Users/Routes/api.php:20</span>) لكن بحث <span class="ltr">grep</span> في كل <span class="ltr">frontend/</span> عن حذف حساب رجع <b>صفر نتائج</b> — لا زر ولا شاشة ولا استدعاء. Apple تُلزم بذلك منذ يونيو 2022 (بند 5.1.1(v)) وGoogle Play كذلك. <b>وأيضاً:</b> الحذف اليوم <span class="ltr">soft delete</span> فقط — الاسم والهاتف و<span class="ltr">national_id</span> تبقى، خلافاً لما يعلنه <span class="ltr">data-retention-ar.md</span>.' },
    { t: 'r', b: '<b>شاشة 21:</b> أزرار الخصوصية والشروط تفتح مستنداً حقيقياً. اليوم: تطبيق الطالب يوجّه <b>كليهما</b> إلى <span class="ltr">/support</span> (<span class="ltr">settings.tsx:91-92</span>)، وتطبيق الكابتن <span class="ltr">onPress={() => undefined}</span> — <b>زر ميت</b>. والمستندات في <span class="ltr">docs/legal/</span> غير منشورة على أي رابط عام، والمتجران يشترطانه.' },
    { t: 'w', b: '<b>شاشة 18:</b> البيان الصريح عن مراجعة الإيصال ضروري — اليوم <span class="ltr">PaymentService::proofUrl()</span> يرسل الإيصال إلى OpenAI كـ<b>رابط عام موقّع صالح 10 دقائق بلا مصادقة</b> (أو base64 كامل)، والإيصال يحمل اسم المُحوِّل ورقم الحساب. <b>بلا تنقيح، بلا موافقة، وبلا إفصاح عن OpenAI كمعالج فرعي.</b>' },
    { t: 'g', b: '<b>شاشة 19:</b> هذا هو تطبيق قرار (ب) — الرحلات المجدولة صارت <b>«خطّي الشهري»</b> بتدفّق منفصل تماماً مدخله من هنا، لا خياراً موازياً في شاشة الطلب.' },
  ],
}));
console.log('generated 04-student-money.html');
