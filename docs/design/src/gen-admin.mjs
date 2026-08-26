import { writeFileSync } from 'fs';
import { ic, pill, money, btn, seg } from './ui.mjs';
import { shell, table, kpi, panel, ADMIN_CSS } from './admin.mjs';
const B = '#1259E3', OK = '#047857', LIVE = '#F59E0B', BAD = '#D92D20', WARN = '#B45309';
const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const mono = t => `<span class="num ltr bold">${t}</span>`;
const ar = `<span class="ltr" style="opacity:.5"> &#8594; </span>`;

const btnRow = (...b) => b.join('<span style="width:8px;display:inline-block"></span>');
const sm = (l, v = 'secondary') => `<button class="btn btn-${v}" style="width:auto;height:34px;font-size:12px;padding:0 13px">${l}</button>`;

/* ═════════ 33 — لوحة القيادة ═════════ */
const p1 = shell('لوحة القيادة', 'لوحة القيادة', 'الأحد 24 آب 2026 · محدَّث قبل ثانيتين',
  `<div class="akpis">
    ${kpi('إيراد اليوم', '1,842', 'د.أ', 74, B, '18% عن أمس · 74% من هدف اليوم', 'var(--ok)')}
    ${kpi('رحلات مكتملة', '312', '', 61, B, '61% من متوسّط الأسبوع', 'var(--n600)')}
    ${kpi('كباتن متصلون', '48 / 126', '', 38, LIVE, '38% — أقل من المستهدف 50%', 'var(--warn)')}
    ${kpi('شحنات بانتظار المراجعة', '23', '', 92, BAD, '4 متجاوزة الـ 24 ساعة', 'var(--bad)')}
  </div>
  <div class="a2">
    ${table(['الرحلة', 'الطالب', 'الكابتن', 'الأجرة', 'الحالة'], [
    [mono('TRP-4821'), 'حمزة ط.', 'محمد ع.', `<span class="num">1.250</span>`, pill('جارية', 'live', 'live')],
    [mono('TRP-4820'), 'سارة م.', 'أحمد خ.', `<span class="num">2.100</span>`, pill('مكتملة', 'ok', 'ok')],
    [mono('TRP-4819'), 'عمر ن.', 'خالد س.', `<span class="num">1.750</span>`, pill('مكتملة', 'ok', 'ok')],
    [mono('TRP-4818'), 'ليان ق.', '—', `<span class="num">1.250</span>`, pill('بانتظار كابتن', 'warn', 'wait')],
    [mono('TRP-4817'), 'يوسف ب.', 'محمد ع.', `<span class="num">3.400</span>`, pill('ملغاة', 'bad', 'bad')],
    [mono('TRP-4816'), 'دانا ف.', 'سامر ر.', `<span class="num">1.900</span>`, pill('مكتملة', 'ok', 'ok')],
    [mono('TRP-4815'), 'ريم ح.', 'أحمد خ.', `<span class="num">1.250</span>`, pill('مكتملة', 'ok', 'ok')],
  ])}
    <div class="col" style="gap:14px">
      ${panel('يحتاج إجراءً', `<div>
      ${[['shield', 'bad', 'بلاغ SOS مفتوح', 'TRP-4821 · قبل 4 دقائق', 'عاجل', 'bad'],
      ['wallet', 'wr', '4 شحنات متجاوزة SLA', 'أقدمها قبل 31 ساعة', 'مراجعة', 'warn'],
      ['file', '', '6 كباتن بانتظار توثيق', 'الوثائق مرفوعة ومكتملة', 'توثيق', 'info'],
      ['cash', 'wr', '4 طلبات سحب معلّقة', 'إجمالي 320 ديناراً', 'اعتماد', 'warn']].map(([i, tone, t, d, lbl, pk]) => `
      <div class="row" style="padding:9px 14px;gap:10px;border-top:1px solid var(--n100)">
        <div class="ic ${tone}" style="width:30px;height:30px;border-radius:9px">${ic(i, { s: 15, c: pk === 'bad' ? BAD : pk === 'warn' ? WARN : B, w: 2 })}</div>
        <div class="col" style="gap:0;flex:1"><span class="t-label bold">${t}</span>
          <span class="t-caption" style="color:var(--n500)">${d}</span></div>
        ${pill(lbl, pk)}</div>`).join('')}</div>`)}
      ${panel('أعلى المناطق طلباً', `<div style="padding:12px 14px">
      ${[['حي الجامعة', 128, 100], ['دوار الشهداء', 86, 67], ['إسكان الحكمة', 54, 42], ['شارع الجامعة', 39, 30]].map(([n, v, w]) => `
      <div class="row" style="margin-bottom:4px"><span class="t-label">${n}</span><div class="sp"></div>
        <span class="t-label num" style="color:var(--n600)">${v}</span></div>
      <div class="abar" style="margin-bottom:11px"><i style="width:${w}%;background:${B}"></i></div>`).join('')}</div>`)}
    </div>
  </div>`,
  btnRow(sm('تصدير CSV'), sm('تشغيل المطابقة', 'primary')));

/* ═════════ 34 — الطلبات الحيّة ═════════ */
const p2 = shell('الطلبات الحيّة', 'الطلبات الحيّة', '14 طلباً بانتظار كابتن · تحديث تلقائي كل 5 ثوانٍ',
  `<div class="row" style="gap:9px;margin-bottom:14px">
    ${seg(['الكل 14', 'بانتظار كابتن 6', 'مُطابَقة 8'], 1).replace('class="seg"', 'class="seg" style="max-width:420px"')}
    <div class="sp"></div>${pill('المطابقة الآلية تعمل — كل 5 دقائق', 'ok', 'dok')}</div>
  ${table(['الطلب', 'الطالب', 'من', 'إلى', 'الفئة', 'الأجرة', 'منذ', 'الحالة', ''], [
    [mono('REQ-9012'), 'ليان ق.', 'حي الجامعة', 'اليرموك', 'اقتصادي', `<span class="num">1.250</span>`, `<span class="num">4 د</span>`, pill('بانتظار كابتن', 'warn', 'wait'), sm('مطابقة يدوية', 'primary')],
    [mono('REQ-9011'), 'يوسف ب.', 'دوار الشهداء', 'اليرموك', 'عائلي', `<span class="num">2.100</span>`, `<span class="num">6 د</span>`, pill('بانتظار كابتن', 'warn', 'wait'), sm('مطابقة يدوية', 'primary')],
    [mono('REQ-9010'), 'ريم ح.', 'إسكان الحكمة', 'اليرموك', 'اقتصادي', `<span class="num">1.700</span>`, `<span class="num">2 د</span>`, pill('مُطابَقة', 'info', 'dinf'), sm('عرض')],
    [mono('REQ-9009'), 'عمر ن.', 'شارع الجامعة', 'اليرموك', 'اقتصادي', `<span class="num">1.500</span>`, `<span class="num">9 د</span>`, pill('بانتظار كابتن', 'warn', 'wait'), sm('مطابقة يدوية', 'primary')],
    [mono('REQ-9008'), 'سارة م.', 'حي الجامعة', 'اليرموك', 'بلس', `<span class="num">3.400</span>`, `<span class="num">11 د</span>`, pill('متأخّر', 'bad', 'warn'), sm('مطابقة يدوية', 'primary')],
    [mono('REQ-9007'), 'دانا ف.', 'دوار الشهداء', 'اليرموك', 'اقتصادي', `<span class="num">1.250</span>`, `<span class="num">1 د</span>`, pill('مُطابَقة', 'info', 'dinf'), sm('عرض')],
  ])}
  <div class="apanel" style="margin-top:14px;padding:13px 14px;background:var(--warn-soft);border-color:#F5D89B">
    <div class="row" style="gap:9px">${ic('alert', { s: 17, c: WARN, w: 2 })}
      <span class="t-label" style="color:#7C4A03;flex:1"><b>سقف الترقيم مضبوط على 100 صفّاً.</b>
      اليوم <span class="ltr">per_page</span> بلا سقف <span class="ltr" style="opacity:.55">&#8658;</span> <span class="ltr">?per_page=1000000</span> يستنزف الذاكرة وقاعدة البيانات.</span></div></div>`,
  btnRow(sm('تصدير'), sm('تشغيل المطابقة الآن', 'primary')));

/* ═════════ 35 — الكباتن ═════════ */
const p3 = shell('الكباتن', 'الكباتن', '126 كابتناً · 6 بانتظار التوثيق · 48 متصل الآن',
  `<div class="akpis" style="grid-template-columns:repeat(4,1fr)">
    ${kpi('معتمدون', '112', '', 89, OK, '89% من الإجمالي', 'var(--n600)')}
    ${kpi('بانتظار التوثيق', '6', '', 40, WARN, 'أقدم طلب قبل 3 أيام', 'var(--warn)')}
    ${kpi('موقوفون', '4', '', 12, BAD, 'بقرار إداري', 'var(--bad)')}
    ${kpi('متوسّط التقييم', '4.72', '', 94, B, 'من 5', 'var(--n600)')}
  </div>
  ${table(['الكابتن', 'الهاتف', 'المركبة', 'الوثائق', 'الرحلات', 'التقييم', 'الحالة', ''], [
    ['سامر الرشيد', mono('0785••••04'), 'كيا بيكانتو 2020', pill('ناقص 1', 'warn', 'warn'), `<span class="num">0</span>`, '—', pill('قيد المراجعة', 'warn', 'wait'), sm('مراجعة', 'primary')],
    ['محمد العبداللات', mono('0796••••10'), 'هيونداي i10 2019', pill('مكتملة', 'ok', 'ok'), `<span class="num">1,284</span>`, `<span class="num">4.9</span>`, pill('متصل', 'live', 'live'), sm('ملف')],
    ['أحمد الخطيب', mono('0791••••55'), 'تويوتا يارس 2021', pill('مكتملة', 'ok', 'ok'), `<span class="num">842</span>`, `<span class="num">4.8</span>`, pill('معتمد', 'ok', 'ok'), sm('ملف')],
    ['خالد السعدي', mono('0779••••31'), 'نيسان صني 2018', pill('تنتهي قريباً', 'warn', 'warn'), `<span class="num">613</span>`, `<span class="num">4.6</span>`, pill('معتمد', 'ok', 'ok'), sm('ملف')],
    ['ماهر العبيدي', mono('0788••••72'), 'شيفروليه أفيو 2017', pill('مرفوضة', 'bad', 'bad'), `<span class="num">0</span>`, '—', pill('مرفوض', 'bad', 'bad'), sm('ملف')],
    ['زيد الحوراني', mono('0797••••18'), 'هيونداي أكسنت 2022', pill('مكتملة', 'ok', 'ok'), `<span class="num">96</span>`, `<span class="num">4.4</span>`, pill('موقوف', 'bad', 'bad'), sm('ملف')],
  ])}`,
  btnRow(sm('تصدير CSV'), sm('دعوة كابتن', 'primary')));

/* ═════════ 36 — ملف الكابتن ═════════ */
const p4 = shell('الكباتن', 'سامر الرشيد', 'كابتن · قيد المراجعة · تقدّم بالطلب قبل 3 أيام',
  `<div class="a2">
    <div class="col" style="gap:14px">
      ${panel('الوثائق — مراجعة', `<div>
      ${[['id', 'الهوية الشخصية', 'مرفوعة قبل 3 أيام', 'ok'], ['file', 'رخصة القيادة', 'مرفوعة قبل 3 أيام', 'ok'],
        ['truck', 'رخصة المركبة', 'مرفوعة قبل 3 أيام', 'ok'], ['shield', 'شهادة عدم محكومية', 'لم تُرفع', 'missing']].map(([i, t, d, st]) => `
      <div class="row" style="padding:10px 14px;gap:10px;border-top:1px solid var(--n100)">
        <div class="ic ${st === 'ok' ? '' : 'wr'}" style="width:32px;height:32px;border-radius:9px">${ic(i, { s: 16, c: st === 'ok' ? B : WARN })}</div>
        <div class="col" style="gap:0;flex:1"><span class="t-label bold">${t}</span>
          <span class="t-caption" style="color:var(--n500)">${d}</span></div>
        ${st === 'ok' ? btnRow(sm('عرض'), sm('اعتماد', 'primary'), sm('رفض', 'danger')) : pill('ناقص', 'warn', 'warn')}</div>`).join('')}</div>`)}
      ${panel('المركبة', `<div style="padding:13px 14px">
        <div class="row" style="gap:12px">
          <div class="ic" style="width:46px;height:46px;border-radius:12px">${ic('car', { s: 23, c: B, w: 1.6 })}</div>
          <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold">كيا بيكانتو 2020</span>
            <span class="t-caption" style="color:var(--n500)">أبيض · 4 مقاعد · فئة اقتصادي</span></div>
          <div class="col" style="align-items:center;gap:1px"><span class="t-title-sm num ltr bold">51-2077</span>
            <span class="t-caption" style="color:var(--n500)">اللوحة</span></div></div></div>`)}
    </div>
    <div class="col" style="gap:14px">
      ${panel('القرار', `<div style="padding:13px 14px">
        <div class="row" style="gap:12px;margin-bottom:13px">
          <div class="av" style="width:44px;height:44px;font-size:18px;background:var(--n400)">س</div>
          <div class="col" style="gap:2px;flex:1"><span class="t-title-sm bold">سامر الرشيد</span>
            <span class="t-caption num ltr" style="color:var(--n500)">0785••••04</span></div></div>
        <div class="apanel" style="background:var(--warn-soft);border-color:#F5D89B;padding:11px;margin-bottom:13px">
          <span class="t-caption" style="color:#7C4A03"><b>لا يمكن الاعتماد</b> — شهادة عدم المحكومية ناقصة.</span></div>
        ${btn('اعتماد الكابتن', 'primary', 'style="opacity:.45;height:40px;font-size:13px"')}
        <div style="height:8px"></div>
        ${btn('طلب مستند ناقص', 'secondary', 'style="height:40px;font-size:13px"')}
        <div style="height:8px"></div>
        ${btn('رفض الطلب', 'danger', 'style="height:40px;font-size:13px"')}</div>`)}
      ${panel('سجلّ التدقيق', `<div>
      ${[['رفع رخصة المركبة', 'قبل 3 أيام'], ['رفع رخصة القيادة', 'قبل 3 أيام'], ['رفع الهوية', 'قبل 3 أيام'], ['إنشاء حساب كابتن', 'قبل 4 أيام']].map(([t, d]) => `
      <div class="row" style="padding:8px 14px;border-top:1px solid var(--n100)">
        <span class="t-caption">${t}</span><div class="sp"></div>
        <span class="t-caption" style="color:var(--n500)">${d}</span></div>`).join('')}</div>`)}
    </div>
  </div>`, sm('رجوع للقائمة'));

/* ═════════ 37 — المدفوعات ═════════ */
const p5 = shell('المدفوعات', 'المدفوعات — شحن CliQ', '23 بانتظار المراجعة · 4 متجاوزة SLA الـ 24 ساعة',
  `<div class="row" style="gap:9px;margin-bottom:14px">
    ${seg(['بانتظار المراجعة 23', 'معتمدة', 'مرفوضة'], 0).replace('class="seg"', 'class="seg" style="max-width:420px"')}
    <div class="sp"></div>${pill('الاعتماد الآلي مسقوف بـ 20 ديناراً', 'info', 'dinf')}</div>
  ${table(['الطلب', 'الطالب', 'المبلغ', 'المرجع البنكي', 'الإيصال', 'فحص AI', 'منذ', ''], [
    [mono('PAY-3341'), 'حمزة ط.', `<span class="num bold">10.000</span>`, mono('CLQ8837201'), sm('عرض'), pill('مطابق · ثقة 94%', 'ok', 'ok'), `<span class="num">18 د</span>`, btnRow(sm('اعتماد', 'primary'), sm('رفض', 'danger'))],
    [mono('PAY-3340'), 'سارة م.', `<span class="num bold">25.000</span>`, mono('CLQ8837190'), sm('عرض'), pill('يتجاوز السقف — مراجعة بشرية', 'warn', 'warn'), `<span class="num">42 د</span>`, btnRow(sm('اعتماد', 'primary'), sm('رفض', 'danger'))],
    [mono('PAY-3339'), 'عمر ن.', `<span class="num bold">5.000</span>`, mono('CLQ8837156'), sm('عرض'), pill('اسم غير مطابق', 'bad', 'bad'), `<span class="num">31 س</span>`, btnRow(sm('اعتماد', 'primary'), sm('رفض', 'danger'))],
    [mono('PAY-3338'), 'ليان ق.', `<span class="num bold">10.000</span>`, mono('CLQ8837101'), sm('عرض'), pill('صورة معدَّلة — احتيال محتمل', 'bad', 'bad'), `<span class="num">33 س</span>`, btnRow(sm('اعتماد', 'primary'), sm('رفض', 'danger'))],
    [mono('PAY-3337'), 'يوسف ب.', `<span class="num bold">15.000</span>`, mono('CLQ8837088'), sm('عرض'), pill('مرجع مكرَّر', 'bad', 'bad'), `<span class="num">35 س</span>`, btnRow(sm('اعتماد', 'primary'), sm('رفض', 'danger'))],
  ])}
  <div class="apanel" style="margin-top:14px;padding:13px 14px;background:var(--b50);border-color:var(--b200)">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('lock', { s: 17, c: B, w: 2 })}
      <span class="t-label" style="color:var(--b900);flex:1;line-height:19px">
        <b>الإيصال يُنقَّح قبل أي معالجة آلية</b> — يُحجب رقم الحساب واسم المُحوِّل، ولا يُرسل أي رابط عام.
        اليوم <span class="ltr">PaymentService::proofUrl()</span> يولّد <b>رابطاً عاماً موقّعاً 10 دقائق بلا مصادقة</b> ويرسله إلى OpenAI بلا تنقيح ولا موافقة ولا إفصاح.</span></div></div>`,
  btnRow(sm('تصدير'), sm('إعدادات CliQ')));

/* ═════════ 38 — السلامة و SOS ═════════ */
const p6 = shell('السلامة و SOS', 'السلامة و SOS', 'بلاغان مفتوحان · 7 أعلام مخاطر هذا الأسبوع',
  `<div class="apanel" style="margin-bottom:14px;background:var(--bad-soft);border-color:#F9CFCB">
    <div class="row" style="padding:14px;gap:12px">
      <div style="width:42px;height:42px;border-radius:12px;background:${BAD};display:grid;place-items:center">${ic('shield', { s: 21, c: '#fff', w: 2.2 })}</div>
      <div class="col" style="gap:2px;flex:1"><span class="t-title-md" style="color:#8A1A12">بلاغ استغاثة مفتوح</span>
        <span class="t-label" style="color:#8A1A12">حمزة الطعاني · ${mono('TRP-4821')} · الكابتن محمد العبداللات · قبل 4 دقائق</span></div>
      ${btnRow(sm('الموقع الحيّ'), sm('اتصال بالطالب', 'primary'), sm('إغلاق البلاغ', 'danger'))}</div></div>
  <div class="a2">
    ${panel('بلاغات الاستغاثة', table(['البلاغ', 'الطالب', 'الرحلة', 'منذ', 'الحالة', ''], [
    [mono('SOS-118'), 'حمزة ط.', mono('TRP-4821'), `<span class="num">4 د</span>`, pill('مفتوح', 'bad', 'dbad'), sm('معالجة', 'primary')],
    [mono('SOS-117'), 'ريم ح.', mono('TRP-4802'), `<span class="num">2 س</span>`, pill('مفتوح', 'bad', 'dbad'), sm('معالجة', 'primary')],
    [mono('SOS-116'), 'دانا ف.', mono('TRP-4771'), `<span class="num">أمس</span>`, pill('مُغلق', 'ok', 'ok'), sm('عرض')],
    [mono('SOS-115'), 'عمر ن.', mono('TRP-4740'), `<span class="num">قبل 3 أيام</span>`, pill('مُغلق', 'ok', 'ok'), sm('عرض')],
  ])).replace('<div class="apanel"><div class="apanel">', '<div class="apanel">')}
    ${panel('أعلام المخاطر', `<div>
      ${[['انحراف عن المسار', 'محمد ع. · TRP-4790', 'bad'], ['إلغاء متكرر', 'زيد ح. · 6 مرات', 'warn'],
      ['GPS متوقّف أثناء رحلة', 'خالد س. · TRP-4766', 'bad'], ['رحلة بلا تأكيد إنزال', 'أحمد خ. · TRP-4752', 'warn'],
      ['تقييم منخفض متكرر', 'زيد ح. · 3.1', 'warn']].map(([t, d, k]) => `
      <div class="row" style="padding:9px 14px;gap:10px;border-top:1px solid var(--n100)">
        <div class="ic ${k === 'bad' ? 'bad' : 'wr'}" style="width:28px;height:28px;border-radius:8px">${ic('alert', { s: 14, c: k === 'bad' ? BAD : WARN, w: 2 })}</div>
        <div class="col" style="gap:0;flex:1"><span class="t-label bold">${t}</span>
          <span class="t-caption" style="color:var(--n500)">${d}</span></div>
        ${sm('فحص')}</div>`).join('')}</div>`)}
  </div>
  <div class="apanel" style="margin-top:14px;padding:13px 14px;background:var(--bad-soft);border-color:#F9CFCB">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('alert', { s: 17, c: BAD, w: 2 })}
      <span class="t-label" style="color:#8A1A12;flex:1;line-height:19px">
        <b>هذه الصفحة غير موجودة عملياً اليوم.</b> الباكند يعرّض 5 مسارات إدارية (<span class="ltr">/admin/safety/risk-flags · cancellations · sos</span>)
        و<b>لا واحد منها مستهلك</b>، وصفحة <span class="ltr">safety</span> الحالية تستدعي <span class="ltr">api.assistant.risks()</span> من موديول AI بدلاً منها
        <span class="ltr" style="opacity:.55">&#8658;</span> <b>الطالب يضغط الاستغاثة، والبلاغ يُسجّل، ولا أحد يراه.</b></span></div></div>`,
  sm('تصدير التقرير'));

/* ═════════ 39 — التسعير ═════════ */
const p7 = shell('التسعير والخطط', 'التسعير والخطط', 'كل الأسعار تُحسب على السيرفر — لا قيمة من العميل إطلاقاً',
  `<div class="row" style="gap:9px;margin-bottom:14px">
    ${seg(['أسعار الرحلات', 'مصفوفة المناطق', 'خطط الاشتراك', 'الكوبونات'], 0).replace('class="seg"', 'class="seg" style="max-width:520px"')}</div>
  <div class="a2">
    ${panel('محدّدات التسعير', `<div style="padding:14px">
      ${[['الأجرة الأساسية', '0.500', 'د.أ', 'تُطبَّق على كل رحلة'],
      ['سعر الكيلومتر', '0.120', 'د.أ', 'يُضاف على المسافة الفعلية'],
      ['الحدّ الأدنى للأجرة', '1.000', 'د.أ', 'لا تنزل الأجرة تحته'],
      ['عمولة المنصّة', '12', '%', 'تُخصم من أجرة الكابتن'],
      ['سقف الاعتماد الآلي', '20.000', 'د.أ', 'ما فوقه مراجعة بشرية إلزامية']].map(([l, v, u, h]) => `
      <div class="row" style="gap:12px;padding:9px 0;border-bottom:1px solid var(--n100)">
        <div class="col" style="gap:1px;flex:1"><span class="t-label bold">${l}</span>
          <span class="t-caption" style="color:var(--n500)">${h}</span></div>
        <div class="row" style="gap:6px">
          <div class="input" style="width:88px;height:34px;font-size:13px;justify-content:center">
            <span class="num bold">${v}</span></div>
          <span class="t-caption" style="color:var(--n500);width:24px;unicode-bidi:isolate">${u}</span></div></div>`).join('')}
      <div style="height:13px"></div>${btn('حفظ التغييرات', 'primary', 'style="height:38px;font-size:13px"')}</div>`)}
    <div class="col" style="gap:14px">
      ${panel('مثال محسوب', `<div style="padding:14px">
        <span class="t-caption" style="color:var(--n500)">حي الجامعة ${ar} اليرموك · 6.4 كم</span>
        <div style="height:11px"></div>
        ${[['الأجرة الأساسية', '0.500'], ['6.4 كم × 0.120', '0.768'], ['خصم الكوبون', '−0.200']].map(([l, v]) => `
        <div class="row" style="padding:5px 0"><span class="t-label" style="color:var(--n600)">${l}</span><div class="sp"></div>
          <span class="t-label num bold">${v}</span></div>`).join('')}
        <div class="row" style="padding-top:9px;margin-top:5px;border-top:1px solid var(--n200)">
          <span class="t-title-sm bold">يدفع الطالب</span><div class="sp"></div>${money('1.068')}</div>
        <div class="row" style="padding-top:7px"><span class="t-label" style="color:var(--n600)">صافي الكابتن</span><div class="sp"></div>
          <span class="t-label num bold" style="color:${OK}">0.940</span></div></div>`)}
      ${panel('سجلّ التغييرات', `<div>
        ${[['رفع العمولة 10% <span class="ltr" style="opacity:.5">&#8592;</span> 12%', 'حمزة ط. · قبل يومين'], ['تعديل سعر الكيلومتر', 'حمزة ط. · قبل أسبوع'],
        ['إضافة سقف الاعتماد الآلي', 'النظام · قبل أسبوع']].map(([t, d]) => `
        <div class="row" style="padding:8px 14px;border-top:1px solid var(--n100)">
          <div class="col" style="gap:0;flex:1"><span class="t-caption bold">${t}</span>
            <span class="t-caption" style="color:var(--n500)">${d}</span></div>${sm('عرض')}</div>`).join('')}</div>`)}
    </div>
  </div>`, sm('تصدير الإعدادات'));

/* ═════════ 40 — الدعم والشكاوى ═════════ */
const p8 = shell('الدعم والشكاوى', 'الدعم والشكاوى', '9 تذاكر مفتوحة · الشكاوى مدموجة في نفس الطابور',
  `<div class="row" style="gap:9px;margin-bottom:14px">
    ${seg(['الكل 9', 'تذاكر دعم 5', 'شكاوى 4'], 0).replace('class="seg"', 'class="seg" style="max-width:380px"')}
    <div class="sp"></div>${pill('الشكاوى والتذاكر جدول واحد بحقل type', 'ok', 'ok')}</div>
  ${table(['التذكرة', 'النوع', 'المُرسِل', 'الموضوع', 'فرز AI', 'منذ', 'الحالة', ''], [
    [mono('TKT-771'), pill('شكوى', 'bad', ''), 'حمزة ط.', 'الكابتن رفض إنزالي في الموقع الصحيح', pill('أولوية عالية', 'bad', 'warn'), `<span class="num">22 د</span>`, pill('مفتوحة', 'warn', 'wait'), sm('ردّ', 'primary')],
    [mono('TKT-770'), pill('دعم', 'info', ''), 'سارة م.', 'لم يُضَف رصيد الشحن', pill('مالي', 'warn', ''), `<span class="num">1 س</span>`, pill('مفتوحة', 'warn', 'wait'), sm('ردّ', 'primary')],
    [mono('TKT-769'), pill('شكوى', 'bad', ''), 'ريم ح.', 'سيارة غير نظيفة', pill('أولوية متوسطة', 'warn', ''), `<span class="num">4 س</span>`, pill('قيد المعالجة', 'info', 'dinf'), sm('عرض')],
    [mono('TKT-768'), pill('دعم', 'info', ''), 'محمد ع.', 'كيف أرفع شهادة عدم المحكومية؟', pill('استفسار', 'mute', ''), `<span class="num">6 س</span>`, pill('بانتظار الردّ', 'warn', 'wait'), sm('ردّ', 'primary')],
    [mono('TKT-767'), pill('شكوى', 'bad', ''), 'عمر ن.', 'خُصم مبلغ مرتين', pill('مالي — عاجل', 'bad', 'warn'), `<span class="num">9 س</span>`, pill('مُحوَّلة لنزاع', 'info', 'dinf'), sm('عرض')],
    [mono('TKT-766'), pill('دعم', 'info', ''), 'دانا ف.', 'تغيير رقم الهاتف', pill('حساب', 'mute', ''), `<span class="num">أمس</span>`, pill('مُغلقة', 'ok', 'ok'), sm('عرض')],
  ])}
  <div class="apanel" style="margin-top:14px;padding:13px 14px;background:var(--b50);border-color:var(--b200)">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('msg', { s: 17, c: B, w: 2 })}
      <span class="t-label" style="color:var(--b900);flex:1;line-height:19px">
        <b>دمج Complaints داخل Support.</b> اليوم موديولان منفصلان: جانب الطالب في <span class="ltr">Complaints</span> <b>ميت تماماً</b>
        (صفر استهلاك) والأدمن عنده صفحة 158 سطراً لطابور لا أحد يغذّيه. والأهم:
        <span class="ltr">support.show</span> و<span class="ltr">support.reply</span> غير موصولتين <span class="ltr" style="opacity:.55">&#8658;</span> <b>الطالب يفتح تذكرة ولا يستطيع قراءة الردّ</b>.</span></div></div>`,
  sm('تصدير'));

/* ═════════ 41 — الأمان والتدقيق ═════════ */
const p9 = shell('الأمان والتدقيق', 'الأمان والتدقيق', 'سجلّ كل إجراء حسّاس · قابل للتصدير · لا يُحذف',
  `<div class="akpis">
    ${kpi('محاولات دخول فاشلة (24س)', '38', '', 24, WARN, '3 حسابات وصلت حدّ القفل', 'var(--warn)')}
    ${kpi('حسابات بمصادقة ثنائية', '6 / 8', '', 75, OK, 'كل الإداريين ملزمون', 'var(--ok)')}
    ${kpi('إجراءات حسّاسة (اليوم)', '142', '', 55, B, 'كلها مسجّلة', 'var(--n600)')}
    ${kpi('مهام مجدولة فاشلة', '0', '', 3, OK, 'آخر تشغيل قبل 12 دقيقة', 'var(--ok)')}
  </div>
  ${table(['الوقت', 'المستخدم', 'الإجراء', 'الهدف', 'IP', 'النتيجة'], [
    [`<span class="num ltr">09:41:12</span>`, 'حمزة ط.', 'اعتماد شحن CliQ', mono('PAY-3341'), mono('82.212.•.•'), pill('نجح', 'ok', 'ok')],
    [`<span class="num ltr">09:38:04</span>`, 'حمزة ط.', 'تعديل عمولة المنصّة', '10% <span class="ltr" style="opacity:.5">&#8592;</span> 12%', mono('82.212.•.•'), pill('نجح', 'ok', 'ok')],
    [`<span class="num ltr">09:22:51</span>`, 'النظام', 'تنظيف بيانات التتبّع', '4,120 صفّاً', '—', pill('نجح', 'ok', 'ok')],
    [`<span class="num ltr">09:14:33</span>`, 'مجهول', 'محاولة دخول', mono('0791••••55'), mono('45.9.•.•'), pill('فشل — قفل 15 د', 'bad', 'bad')],
    [`<span class="num ltr">08:57:19</span>`, 'ليان أ.', 'اعتماد طلب سحب', mono('PYT-208'), mono('82.212.•.•'), pill('نجح', 'ok', 'ok')],
    [`<span class="num ltr">08:40:02</span>`, 'النظام', 'حذف أكواد OTP منتهية', '318 صفّاً', '—', pill('نجح', 'ok', 'ok')],
    [`<span class="num ltr">08:12:47</span>`, 'حمزة ط.', 'رفض وثيقة كابتن', 'ماهر العبيدي', mono('82.212.•.•'), pill('نجح', 'ok', 'ok')],
  ])}
  <div class="apanel" style="margin-top:14px;padding:13px 14px;background:var(--ok-soft);border-color:#A7E3CB">
    <div class="row" style="gap:9px;align-items:flex-start">${ic('check', { s: 17, c: OK, w: 2.4 })}
      <span class="t-label" style="color:#04503A;flex:1;line-height:19px">
        <b>هذا المحور سليم أصلاً في المشروع</b> — <span class="ltr">AuditLogger</span> يغطّي كل تغييرات الحالة الحسّاسة فعلياً.
        المطلوب فقط: <b>عرضه</b> بشكل قابل للاستخدام + تنبيه على <span class="ltr">failed_jobs</span> (غير موجود اليوم،
        و<span class="ltr">healthcheck</span> العامل هو <span class="ltr">queue:monitor … || exit 0</span> أي <b>لا يفشل أبداً</b>).</span></div></div>`,
  btnRow(sm('تصدير CSV'), sm('إعدادات الأمان')));

const PAGES = [
  ['33', 'لوحة القيادة', 'ما يحتاج إجراءً في المقدّمة — لا مؤشّرات للزينة', p1],
  ['34', 'الطلبات الحيّة', 'الطابور الذي يقرّر نجاح المنصّة يومياً', p2],
  ['35', 'الكباتن', 'التوثيق هو عنق الزجاجة — لذلك في المقدّمة', p3],
  ['36', 'ملف الكابتن — مراجعة الوثائق', 'قرار واحد واضح، ولا يمكن الاعتماد مع نقص', p4],
  ['37', 'المدفوعات — شحن CliQ', 'مع سقف الاعتماد الآلي وتنقيح الإيصال', p5],
  ['38', 'السلامة و SOS', 'غير موجودة عملياً اليوم — أخطر فجوة في المشروع', p6],
  ['39', 'التسعير والخطط', 'كل الأسعار على السيرفر · مع مثال محسوب حيّ', p7],
  ['40', 'الدعم والشكاوى', 'مدموجان في طابور واحد بحقل type', p8],
  ['41', 'الأمان والتدقيق', 'المحور السليم أصلاً — يحتاج عرضاً فقط', p9],
];

const FOOT = [
  `<div class="note"><b>الصفحات التسع المتبقية</b> (تُبنى على نفس القوالب الثلاثة: KPIs + جدول · جدول + لوحة جانبية · نموذج + معاينة):
   الرحلات · الرؤى والتحليلات · الطلاب · الجغرافيا والمسارات · السحوبات · التقارير · النزاعات · الإعدادات والموظفون · تسجيل الدخول.</div>`,
  `<div class="note g"><b>التغييرات البصرية مقابل الحالي:</b> السايدبار من <span class="ltr">bg-navy</span> (أسود تقريباً · 31 رابطاً · 6 مجموعات)
   إلى <b>فاتح</b> (18 رابطاً · 4 مجموعات) · رأس الجدول من <span class="ltr">bg-navy</span> على <b>كل</b> جدول إلى <span class="ltr">neutral-50</span> ·
   الملاحة المزدوجة (Sidebar + نفس الروابط في Topbar) إلى <b>command palette واحدة</b> ·
   <span class="ltr">tabular-nums</span> على كل مبلغ · <span class="ltr">ms/me/start/end</span> بدل <span class="ltr">ml/mr/left/right</span> ·
   و<b>صفر</b> استخدام <span class="ltr">dark:</span> (اليوم 57).</div>`,
  `<div class="note w"><b>إلزامي لكل جدول:</b> حالة تحميل (skeleton) · حالة فراغ · حالة خطأ مع إعادة محاولة · وسقف <span class="ltr">per_page</span> عند 100.
   اليوم <span class="ltr">per_page</span> بلا سقف في <span class="ltr">RideRequestController:129</span> و<span class="ltr">PaymentController:77</span>.</div>`,
];

const CHUNK = 3;
for (let k = 0; k < 3; k++) {
  const slice = PAGES.slice(k * CHUNK, k * CHUNK + CHUNK);
  const isLast = k === 2;
  out(`06-admin-${k + 1}.html`, `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:1400px}${ADMIN_CSS}</style></head><body><div class="sheet-body">
<div class="sheet-h">
  <div class="mk"><svg width="30" height="30" viewBox="0 0 96 96" fill="none">
    <circle cx="70" cy="26" r="8.5" stroke="#fff" stroke-width="7"/>
    <path d="M70 43.5 C70 58 60 68 45 72" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <circle cx="27" cy="73.5" r="7.5" fill="#fff"/></svg></div>
  <div><h1>لوحة الإدارة ${k + 1}/3 — ${slice.map(s => s[1]).join(' · ')}</h1>
    <div class="sub">من 28 صفحة و6 مجموعات إلى 18 صفحة و4 مجموعات · سايدبار فاتح · رأس جدول فاتح · العرض 1280 بمقياس 1:1</div></div>
</div>
${slice.map(([n, t, d, body]) => `
<div style="margin-bottom:30px">
  <div class="cap"><div><span class="n">${n}</span><span class="t">${t}</span></div><div class="d">${d}</div></div>
  ${body}
</div>`).join('')}
${isLast ? FOOT.join('') : ''}
</div></body></html>`);
}
console.log('generated 06-admin-1/2/3.html');
