import { writeFileSync } from 'fs';
import { mark, markOnDark } from './ui.mjs';

const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);

/**
 * Store-listing assets sheet: what the launcher, the store card and the notification
 * shade actually look like, at the sizes the platforms use. Rendered so the choices
 * can be checked by eye rather than argued about — an icon that reads at 1024 and
 * dissolves at 48 is a common and expensive mistake.
 */
const centred = (canvas, ink, opts) => {
  const box = Math.round((canvas * ink) / (67 / 96));

  return `<div style="transform:translate(${(box * (48 - 50.8) / 96).toFixed(2)}px, ${(box * 0.5 / 96).toFixed(2)}px)">${mark(box, opts)}</div>`;
};

const tile = (size, bg, radius, markColor) => `
<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${bg};
  display:grid;place-items:center;flex-shrink:0">${centred(size, 0.6, { path: markColor, w: 7 })}</div>`;

const APPS = [
  { key: 'student', name: 'رفيق', sub: 'للطلاب', bg: '#1259E3', pkg: 'jo.rafeeq.student' },
  { key: 'driver', name: 'رفيق كابتن', sub: 'للكباتن', bg: '#0E1524', pkg: 'jo.rafeeq.driver' },
];

/** Android launcher masks: circle, squircle, rounded square, teardrop. */
const MASKS = [
  ['دائرة', '50%'], ['سكويركل', '28%'], ['مربّع مستدير', '22.37%'], ['قطرة', '50% 50% 50% 12%'],
];

const section = (title, why, body) => `
<div style="border-top:1px solid var(--n200);padding-top:22px;margin-top:26px">
  <div style="font:700 17px 'IBM Plex Sans Arabic';margin-bottom:4px">${title}</div>
  <div style="font:400 13px/22px 'IBM Plex Sans Arabic';color:var(--n700);margin-bottom:18px;max-width:1000px">${why}</div>
  ${body}</div>`;

out('r-store.html', `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:1500px;background:#fff}</style></head><body>
<div style="padding:36px 40px">
  <div style="font:700 22px 'IBM Plex Sans Arabic';margin-bottom:5px">أصول المتجر — كيف تظهر فعلاً</div>
  <div style="font:400 14px/24px 'IBM Plex Sans Arabic';color:var(--n600);max-width:1040px">
    الأيقونة تُقاس في مكانين لا مكان واحد: بطاقة المتجر عند 512، ومشغّل التطبيقات عند 48.
    وأيقونة تُقرأ عند 1024 وتذوب عند 48 خطأ شائع ومُكلف — فالمقاسات أدناه هي الحقيقية.
  </div>

  ${section('الأيقونة عبر المقاسات',
  `الحبر يشغل <b>60٪</b> من القماش في كل مقاس، وهو <b>متمركز بصرياً</b> لا هندسياً: العلامة
   قُطرية فصندوق حبرها 62.5×67 من مربّع 96، ومركزه (50.8، 47.5) لا (48، 48). القياس بـviewBox
   وحده كان يُخرجها <b>أصغر</b> ومزاحة عن المركز.`,
  APPS.map(a => `
  <div class="row" style="gap:22px;align-items:flex-end;margin-bottom:20px">
    <div style="width:118px;font:700 14px 'IBM Plex Sans Arabic'">${a.name}</div>
    ${[512, 192, 96, 72, 48, 36].map(s => `
    <div style="text-align:center">
      ${tile(s, a.bg, '22.37%', '#fff')}
      <div style="font:500 11px 'IBM Plex Sans Arabic';color:var(--n500);margin-top:7px;direction:ltr">${s}</div>
    </div>`).join('')}
    <div style="flex:1"></div>
    <div style="font:400 12px/20px 'IBM Plex Sans Arabic';color:var(--n600);max-width:230px">
      عند <b>36</b> تبقى الحلقة والنقطة والمنحنى مميَّزة — لأنّ سماكة الخط ثابتة عند 7/96
      ولا تُقاس مع الحجم.</div>
  </div>`).join(''))}

  ${section('أقنعة مشغّل أندرويد',
  `أندرويد يقصّ الأيقونة التكيّفية بشكل يختاره المشغّل لا نحن. فالحبر مثبَّت عند <b>58٪</b>
   داخل منطقة الأمان 66٪ — بهامش. وهذه هي الأشكال الأربعة الشائعة على القماش نفسه.`,
  `<div class="row" style="gap:34px">
    ${APPS.map(a => `<div class="row" style="gap:16px">
      ${MASKS.map(([label, r]) => `<div style="text-align:center">
        ${tile(84, a.bg, r, '#fff')}
        <div style="font:400 11px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:7px">${label}</div>
      </div>`).join('')}</div>`).join('<div style="width:1px;background:var(--n200)"></div>')}
  </div>`)}

  ${section('بطاقة المتجر',
  `الاسم والوصف القصير كما يظهران في نتائج البحث. الوصف القصير <b>80 حرفاً</b> على Play،
   ويُقرأ قبل الوصف الطويل — فهو الجملة التي تحسم التنزيل.`,
  APPS.map(a => `
  <div class="card" style="max-width:640px;margin-bottom:12px;display:flex;gap:16px;align-items:center">
    ${tile(72, a.bg, '22.37%', '#fff')}
    <div class="col" style="gap:3px;flex:1">
      <span class="t-title-md">${a.name}</span>
      <span class="t-body" style="color:var(--n600)">${a.key === 'student'
      ? 'مقعدك إلى الجامعة — سعر ثابت معلن قبل الطلب'
      : 'اربح من طريقك اليومي إلى الجامعة'}</span>
      <span class="t-caption ltr" style="color:var(--n500)">${a.pkg}</span>
    </div>
    <button class="btn btn-primary btn-sm" style="width:88px">تنزيل</button>
  </div>`).join(''))}

  ${section('أيقونة الإشعار — أندرويد يرمي اللون',
  `أندرويد يستخدم <b>قناة الشفافية فقط</b> ويصبغ الشكل بلون التطبيق. فأي أيقونة ملوَّنة تصل
   كمربّع مصمت. لذلك أيقونة الإشعار <b>ظلّ أبيض على شفافية</b>، وحبرها 72٪ لأنّها تُعرَض عند 24dp.`,
  `<div class="row" style="gap:34px;align-items:center">
    ${[['#0E1524', 'شريط داكن'], ['#F2F5F9', 'شريط فاتح']].map(([bg, label]) => `
    <div style="text-align:center">
      <div style="width:180px;height:56px;border-radius:12px;background:${bg};display:flex;
        align-items:center;gap:11px;padding:0 14px">
        <div style="width:24px;height:24px;display:grid;place-items:center">
          ${mark(21, { path: bg === '#0E1524' ? '#fff' : '#1259E3', dot: bg === '#0E1524' ? '#fff' : '#1259E3', w: 8.5 })}</div>
        <div class="col" style="gap:1px;align-items:flex-start">
          <span style="font:700 11.5px 'IBM Plex Sans Arabic';color:${bg === '#0E1524' ? '#fff' : '#0E1524'}">رفيق</span>
          <span style="font:400 10.5px 'IBM Plex Sans Arabic';color:${bg === '#0E1524' ? 'rgba(255,255,255,.7)' : 'var(--n600)'}">كابتنك وصل</span></div>
      </div>
      <div style="font:400 11.5px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:8px">${label}</div>
    </div>`).join('')}
    <div style="font:400 12.5px/21px 'IBM Plex Sans Arabic';color:var(--n600);max-width:340px">
      <b>ولا PII في أي نصّ إشعار.</b> الإشعار يُرسَم على الشاشة المقفلة ويُنسَخ إلى الساعة
      والحاسوب — فهو جرس باب يقول إنّ شيئاً حدث، لا الشيء نفسه. اسم المُرسِل و80 حرفاً من
      المحادثة كانا هنا، وأُزيلا.</div>
  </div>`)}

  ${section('الشعار على خلفيات مختلفة',
  `النسخة الأساسية مسار أزرق ونقطة كهرمانية. وعلى الداكن يصير المسار أبيض <b>والنقطة تبقى
   كهرمانية</b>، لأنّ الوصول هو المكافأة وهو الاستخدام الوحيد المسموح للون ثانٍ.`,
  `<div class="row" style="gap:0">
    ${[['#FFFFFF', 'أبيض', false], ['#F2F5F9', 'رمادي فاتح', false], ['#EFF6FF', 'brand-50', false],
    ['#1259E3', 'brand-600', true], ['#0E1524', 'داكن', true]].map(([bg, label, dark]) => `
    <div style="flex:1;text-align:center;padding:26px 0;background:${bg}">
      ${dark ? markOnDark(56) : mark(56, { path: '#1259E3' })}
      <div style="font:500 11.5px 'IBM Plex Sans Arabic';color:${dark ? 'rgba(255,255,255,.8)' : 'var(--n600)'};margin-top:11px">${label}</div>
    </div>`).join('')}
  </div>`)}
</div></body></html>`);

console.log('generated: r-store');
