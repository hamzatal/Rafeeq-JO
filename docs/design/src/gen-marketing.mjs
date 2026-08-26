import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ic, mark, markOnDark, mapGhost } from './ui.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../Rafeeq-JO/marketing/posts');
mkdirSync(OUT, { recursive: true });

const B = '#1259E3', B50 = '#EFF6FF', B200 = '#BFDBFE', B700 = '#0E47B4';
const INK = '#0E1524', N500 = '#67728A', N600 = '#4E5872', N200 = '#DDE3EC';
const OK = '#047857', LIVE = '#F59E0B', BAD = '#D92D20';

/** Digits isolated so bidi cannot reorder them — the same rule the apps follow. */
const N = (t) => `<span style="unicode-bidi:isolate;direction:ltr">${t}</span>`;
const JOD = (v) => `${N(v)} <span style="unicode-bidi:isolate">د.أ</span>`;

/** Optically centred mark: the ink box is 62.5x67 of a 96 unit box, centred at (50.8, 47.5). */
const cMark = (canvas, ratio, opts = {}) => {
  const box = Math.round((canvas * ratio) / (67 / 96));

  return `<div style="transform:translate(${(box * (48 - 50.8) / 96).toFixed(1)}px,${(box * 0.5 / 96).toFixed(1)}px)">${mark(box, opts)}</div>`;
};

const page = (w, h, body, bg) => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>html,body{margin:0;padding:0}
body{width:${w}px;height:${h}px;background:${bg};overflow:hidden}</style></head><body>
<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg}">${body}</div>
</body></html>`;

/** Brand strip that closes every post. Sized from the canvas so it scales. */
const strip = (w, dark = false) => {
  const h = Math.round(w * 0.125);
  const div = dark ? 'rgba(255,255,255,.25)' : N200;

  return `<div style="position:absolute;inset-inline:0;bottom:0;height:${h}px;
    background:${dark ? 'rgba(255,255,255,.07)' : B50};display:flex;align-items:center;
    justify-content:center;gap:${Math.round(w * 0.018)}px">
    ${dark ? markOnDark(Math.round(w * 0.05)) : mark(Math.round(w * 0.05), { path: B })}
    <span style="font:700 ${Math.round(w * 0.044)}px/1 'IBM Plex Sans Arabic';color:${dark ? '#fff' : INK}">رفيق</span>
    <span style="width:2px;height:${Math.round(w * 0.034)}px;background:${div}"></span>
    <span style="font:500 ${Math.round(w * 0.03)}px/1 'IBM Plex Sans Arabic';color:${dark ? 'rgba(255,255,255,.82)' : B700}">مقعدك إلى الجامعة</span>
  </div>`;
};

/** Faint city behind a post, with a veil so text stays crisp. */
const backdrop = (w, h, dark = false) => `
<div style="position:absolute;top:0;left:0;width:${Math.round(w / 2.6)}px;height:${Math.round(h / 2.6)}px;
  transform:scale(2.6);transform-origin:top left;opacity:.55">
  ${mapGhost({
  w: Math.round(w / 2.6), h: Math.round(h / 2.6),
  tint: dark ? 'rgba(255,255,255,.05)' : 'rgba(18,89,227,.07)',
  road: dark ? 'rgba(255,255,255,.07)' : 'rgba(18,89,227,.11)',
  routeC: dark ? 'rgba(255,255,255,.22)' : 'rgba(18,89,227,.26)', seed: 31,
})}</div>
<div style="position:absolute;inset:0;background:radial-gradient(ellipse ${Math.round(w * 0.8)}px ${Math.round(h * 0.6)}px at 50% 44%,
  ${dark ? 'rgba(14,21,36,.94)' : 'rgba(255,255,255,.96)'} 0%,
  ${dark ? 'rgba(14,21,36,.94)' : 'rgba(255,255,255,.96)'} 40%,
  ${dark ? 'rgba(14,21,36,.6)' : 'rgba(255,255,255,.68)'} 70%, transparent 92%)"></div>`;

const POSTS = [];
const add = (o) => POSTS.push(o);

/* ═════════ 1 · «كم تدفع فعلاً؟» — العمود الفقري ═════════ */
add({
  file: '01-price-comparison', w: 1080, h: 1350, bg: B50,
  title: 'مقارنة السعر — المنشور الأساسي',
  caption: `من حي الجامعة للبوابة الشمالية.

لحالك بالتكسي: 5.250 د.أ
مع رفيق، مقعد مشترك: 1.500 د.أ

نفس الطريق. نفس الوقت. الفرق إنّك مش لحالك.

السعر معلن قبل ما تطلب، وما بيتغيّر.

⬇️ التطبيق بالبايو
#رفيق #جامعة_اليرموك #إربد #مواصلات_الطلاب`,
  body: `${backdrop(1080, 1350)}
  <div style="position:absolute;inset-inline:64px;top:110px">
    <div style="font:500 34px/1 'IBM Plex Sans Arabic';color:${B700};margin-bottom:14px">من حي الجامعة إلى اليرموك</div>
    <div style="font:700 68px/1.15 'IBM Plex Sans Arabic';color:${INK}">كم تدفع<br>فعلاً؟</div>
  </div>
  <div style="position:absolute;inset-inline:64px;top:400px;display:flex;flex-direction:column;gap:20px">
    ${[['تكسي لحالك', '5.250', '#fff', INK, N200, false],
    ['باص + تكسي للمجمّع', '2.000', '#fff', INK, N200, false],
    ['مقعد مشترك مع رفيق', '1.500', B, '#fff', B, true]].map(([label, price, bg, fg, bd, hero]) => `
    <div style="background:${bg};border:${hero ? '0' : `2px solid ${bd}`};border-radius:26px;
      padding:${hero ? '34px 32px' : '26px 32px'};display:flex;align-items:center;
      ${hero ? 'box-shadow:0 14px 40px rgba(18,89,227,.3)' : ''}">
      <span style="font:${hero ? 700 : 500} ${hero ? 38 : 33}px/1.3 'IBM Plex Sans Arabic';color:${fg};flex:1">${label}</span>
      <span style="font:700 ${hero ? 62 : 48}px/1 'IBM Plex Sans Arabic';color:${fg}">${JOD(price)}</span>
    </div>`).join('')}
  </div>
  <div style="position:absolute;inset-inline:64px;top:850px;font:500 30px/1.5 'IBM Plex Sans Arabic';color:${N600};text-align:center">
    السعر معلن <b style="color:${INK}">قبل</b> ما تطلب — وما بيتغيّر</div>
  <div style="position:absolute;inset-inline:150px;top:960px;background:${B};border-radius:999px;height:96px;
    display:flex;align-items:center;justify-content:center;gap:14px;box-shadow:0 12px 34px rgba(18,89,227,.28)">
    <span style="font:700 38px/1 'IBM Plex Sans Arabic';color:#fff">نزّل رفيق</span>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"
      stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></div>
  ${strip(1080)}`,
});

/* ═════════ 2 · الحساب الشهري ═════════ */
add({
  file: '02-monthly-math', w: 1080, h: 1080, bg: '#fff',
  title: 'الحساب الشهري',
  caption: `20 يوم دراسي. ذهاب وعودة.

تكسي: ~3.500 للرحلة ⇒ 70 د.أ بالشهر
رفيق، مقعد مشترك: 1.500 للرحلة ⇒ 60 د.أ
ومع الخطّ الشهري: أقل.

احسبها على مسافتك — الأسعار كلها معلنة بالتطبيق.

⬇️ البايو
#رفيق #توفير #طلاب_الأردن`,
  body: `${backdrop(1080, 1080)}
  <div style="position:absolute;inset-inline:70px;top:96px;text-align:center">
    <div style="font:500 32px/1 'IBM Plex Sans Arabic';color:${N600}">20 يوم دراسي · ذهاب وعودة</div>
    <div style="font:700 52px/1 'IBM Plex Sans Arabic';color:${INK};margin-top:18px">كم بتصرف بالشهر؟</div>
  </div>
  <div style="position:absolute;inset-inline:0;top:280px;display:flex;flex-direction:column;align-items:center;gap:8px">
    <div style="font:500 30px/1 'IBM Plex Sans Arabic';color:${N500}">بالتكسي</div>
    <div style="font:700 132px/1 'IBM Plex Sans Arabic';color:${BAD}">${JOD('70')}</div>
    <svg width="60" height="70" viewBox="0 0 24 24" fill="none" stroke="${N200}" stroke-width="2.4"
      stroke-linecap="round" style="margin:6px 0"><path d="M12 4v16M6 14l6 6 6-6"/></svg>
    <div style="font:500 30px/1 'IBM Plex Sans Arabic';color:${N500}">مع رفيق</div>
    <div style="font:700 132px/1 'IBM Plex Sans Arabic';color:${OK}">${JOD('60')}</div>
  </div>
  <div style="position:absolute;inset-inline:80px;bottom:200px;background:${B50};border-radius:22px;
    padding:24px;text-align:center;font:500 29px/1.45 'IBM Plex Sans Arabic';color:${B700}">
    ومع <b>خطّي الشهري</b> أقل — والسعر ثابت كل يوم</div>
  ${strip(1080)}`,
});

/* ═════════ 3 · كاروسيل «كيف تعمل» — 5 شرائح ═════════ */
const STEPS = [
  ['من بيتك للجامعة<br>بـ4 خطوات', null, 'hero'],
  ['اختر وجهتك', 'والسعر يظهر <b>قبل</b> ما تطلب', 'search'],
  ['رفيق يجمعك', 'مع طلاب من <b>منطقتك</b> بنفس الوقت', 'school'],
  ['كابتن موثَّق يوصلك', 'وتتبّعه على الخريطة لحظة بلحظة', 'car'],
  ['أعطِه رمز الصعود', 'أربعة أرقام — واركب. والدفع محفظة أو نقد', 'shield'],
];
STEPS.forEach(([t, sub, icon], i) => add({
  file: `03-carousel-${i + 1}`, w: 1080, h: 1350, bg: i === 0 ? B : '#fff',
  title: `كاروسيل «كيف تعمل» — شريحة ${i + 1}`,
  caption: i === 0 ? `من بيتك للجامعة بأربع خطوات. اسحب ⬅️

1️⃣ اختر وجهتك — السعر يظهر قبل ما تطلب
2️⃣ رفيق يجمعك مع طلاب من منطقتك
3️⃣ كابتن موثَّق يوصلك، وتتبّعه على الخريطة
4️⃣ أعطِه رمز الصعود واركب

الدفع محفظة أو نقد — زي ما يريحك.

⬇️ البايو
#رفيق #كيف_يعمل` : null,
  body: i === 0
    ? `${backdrop(1080, 1350, true)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px">
        ${cMark(1080, 0.2, { path: '#fff' })}
        <div style="font:700 76px/1.25 'IBM Plex Sans Arabic';color:#fff;text-align:center">${t}</div>
        <div style="display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.16);
          border-radius:999px;padding:18px 34px">
          <span style="font:500 32px/1 'IBM Plex Sans Arabic';color:#fff">اسحب</span>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"
            stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></div>
      </div>`
    : `${backdrop(1080, 1350)}
      <div style="position:absolute;inset-inline:0;top:150px;display:flex;justify-content:center">
        <div style="width:150px;height:150px;border-radius:44px;background:${B50};display:grid;place-items:center">
          ${ic(icon, { s: 82, c: B, w: 1.7 })}</div></div>
      <div style="position:absolute;inset-inline:78px;top:400px;text-align:center">
        <div style="width:72px;height:72px;border-radius:50%;background:${B};margin:0 auto 34px;
          display:grid;place-items:center;font:700 40px/1 'IBM Plex Sans Arabic';color:#fff">${N(String(i))}</div>
        <div style="font:700 62px/1.28 'IBM Plex Sans Arabic';color:${INK}">${t}</div>
        <div style="font:400 36px/1.55 'IBM Plex Sans Arabic';color:${N600};margin-top:26px">${sub}</div>
      </div>
      <div style="position:absolute;inset-inline:0;bottom:230px;display:flex;justify-content:center;gap:14px">
        ${STEPS.map((_, k) => `<div style="width:${k === i ? 40 : 14}px;height:14px;border-radius:7px;
          background:${k === i ? B : N200}"></div>`).join('')}</div>
      ${strip(1080)}`,
}));

/* ═════════ 4 · النقد — الميزة الجديدة ═════════ */
add({
  file: '04-cash-payment', w: 1080, h: 1350, bg: '#fff',
  title: 'الدفع نقداً — الميزة الجديدة',
  caption: `ما عندك محفظة مشحونة؟ ولا يهمّك.

ادفع للكابتن نقداً — بنفس المبلغ المعلن بالتطبيق بالضبط.

🔹 السعر ما بينتاقش بالسيارة: هو نفسه اللي شفته قبل ما تطلب
🔹 الرحلة تُسجَّل كاملة، فإذا صار أي خلاف عندنا كل التفاصيل
🔹 ما بندفعك تفتح حساب بنكي حتى توصل لجامعتك

محفظة أو نقد — زي ما يريحك.

⬇️ البايو
#رفيق #دفع_نقدي`,
  body: `${backdrop(1080, 1350)}
  <div style="position:absolute;inset-inline:64px;top:112px;text-align:center">
    <span style="display:inline-block;background:${LIVE};border-radius:999px;padding:14px 34px;
      font:700 30px/1 'IBM Plex Sans Arabic';color:#7C4A03;margin-bottom:30px">جديد</span>
    <div style="font:700 74px/1.2 'IBM Plex Sans Arabic';color:${INK}">ادفع نقداً<br>للكابتن</div>
    <div style="font:400 36px/1.5 'IBM Plex Sans Arabic';color:${N600};margin-top:26px">
      ما عندك محفظة مشحونة؟ ولا يهمّك</div>
  </div>
  <div style="position:absolute;inset-inline:64px;top:560px;display:flex;flex-direction:column;gap:18px">
    ${[['cash', 'بنفس المبلغ المعلن', 'السعر ما بينتاقش بالسيارة'],
    ['file', 'الرحلة تُسجَّل كاملة', 'فإذا صار خلاف، عندنا التفاصيل'],
    ['wallet', 'أو من المحفظة', 'زي ما يريحك — الخيار خيارك']].map(([icon, t, sub]) => `
    <div style="background:#fff;border:2px solid ${N200};border-radius:24px;padding:26px 30px;
      display:flex;align-items:center;gap:24px">
      <div style="width:78px;height:78px;border-radius:22px;background:${B50};display:grid;place-items:center;flex-shrink:0">
        ${ic(icon, { s: 42, c: B, w: 1.7 })}</div>
      <div>
        <div style="font:700 36px/1.25 'IBM Plex Sans Arabic';color:${INK}">${t}</div>
        <div style="font:400 28px/1.4 'IBM Plex Sans Arabic';color:${N600};margin-top:8px">${sub}</div>
      </div></div>`).join('')}
  </div>
  ${strip(1080)}`,
});

/* ═════════ 5 · السلامة ═════════ */
add({
  file: '05-safety', w: 1080, h: 1350, bg: '#fff',
  title: 'السلامة — موجَّه للأهل بقدر الطلاب',
  caption: `كل رحلة على رفيق فيها أربع طبقات حماية:

🔹 كابتن موثَّق — رخصة وترخيص مركبة وتأمين، مراجَعة يدوياً
🔹 رمز صعود — أربعة أرقام، حتى ما تركب السيارة الخطأ
🔹 تتبّع حيّ — الرحلة على الخريطة، وتقدر تشاركها
🔹 زرّ طوارئ — ظاهر بكل شاشة رحلة

⚠️ زرّ الطوارئ مش بديل عن 911. بالخطر المباشر اتصل بـ911 أول، وبعدها بلّغنا.

⬇️ البايو
#رفيق #سلامة_الطلاب`,
  body: `${backdrop(1080, 1350)}
  <div style="position:absolute;inset-inline:64px;top:108px;text-align:center">
    <div style="font:700 70px/1.2 'IBM Plex Sans Arabic';color:${INK}">أربع طبقات<br>حماية</div>
    <div style="font:400 34px/1.45 'IBM Plex Sans Arabic';color:${N600};margin-top:22px">بكل رحلة، بلا استثناء</div>
  </div>
  <div style="position:absolute;inset-inline:70px;top:430px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
    ${[['id', 'كابتن موثَّق', 'رخصة وتأمين<br>مراجَعة يدوياً'],
    ['shield', 'رمز صعود', 'أربعة أرقام<br>حتى ما تغلط بالسيارة'],
    ['crosshair', 'تتبّع حيّ', 'الرحلة على الخريطة<br>وتقدر تشاركها'],
    ['phone', 'زرّ طوارئ', 'ظاهر دائماً<br>بكل شاشة رحلة']].map(([icon, t, sub]) => `
    <div style="background:#fff;border:2px solid ${N200};border-radius:26px;padding:32px 24px;text-align:center">
      <div style="width:88px;height:88px;border-radius:26px;background:${B50};margin:0 auto 20px;
        display:grid;place-items:center">${ic(icon, { s: 46, c: B, w: 1.7 })}</div>
      <div style="font:700 34px/1.25 'IBM Plex Sans Arabic';color:${INK}">${t}</div>
      <div style="font:400 25px/1.45 'IBM Plex Sans Arabic';color:${N600};margin-top:10px">${sub}</div>
    </div>`).join('')}
  </div>
  <div style="position:absolute;inset-inline:70px;bottom:210px;background:#FFFBEB;border:2px solid #EFCFA0;
    border-radius:20px;padding:22px 26px;font:500 25px/1.45 'IBM Plex Sans Arabic';color:#7C4A03;text-align:center">
    زرّ الطوارئ <b>مش بديل</b> عن ${N('911')} — بالخطر المباشر اتصل فيهم أول</div>
  ${strip(1080)}`,
});

/* ═════════ 6 · توظيف الكباتن ═════════ */
add({
  file: '06-captain-recruit', w: 1080, h: 1350, bg: INK,
  title: 'توظيف الكباتن — هدف الأسبوعين الأولين',
  caption: `الرحلة الفاضية خسارة. خلّيها بأربع مقاعد.

إذا بتشتغل على خطّ الجامعة، رفيق يجمعلك طلاب من نفس المنطقة بنفس الوقت.

🔹 صافي الرحلة معروف قبل ما تقبلها — مش بعدها
🔹 السحب أسبوعي على CliQ
🔹 تقدر تقبض نقداً، والعمولة تتسوّى من رصيدك

المطلوب: رخصة سارية، ترخيص مركبة، تأمين، والمركبة مش أقدم من 7 سنين.

سجّل ككابتن ⬇️ البايو
#رفيق_كابتن #شغل_إربد`,
  body: `${backdrop(1080, 1350, true)}
  <div style="position:absolute;inset-inline:64px;top:120px">
    <div style="font:500 32px/1 'IBM Plex Sans Arabic';color:${LIVE};margin-bottom:20px">للكباتن</div>
    <div style="font:700 76px/1.2 'IBM Plex Sans Arabic';color:#fff">الرحلة الفاضية<br>خسارة</div>
    <div style="font:400 38px/1.45 'IBM Plex Sans Arabic';color:rgba(255,255,255,.78);margin-top:26px">
      خلّيها بأربع مقاعد</div>
  </div>
  <div style="position:absolute;inset-inline:64px;top:530px;display:flex;flex-direction:column;gap:16px">
    ${[['الصافي معروف', 'قبل ما تقبل الرحلة — مش بعدها'],
    ['السحب أسبوعي', 'على CliQ، بحدّ أدنى معلن'],
    ['تقبض نقداً كذلك', 'والعمولة تتسوّى من رصيدك تلقائياً']].map(([t, sub]) => `
    <div style="background:rgba(255,255,255,.07);border-radius:22px;padding:26px 30px;display:flex;gap:22px;align-items:center">
      <div style="width:14px;height:14px;border-radius:50%;background:${LIVE};flex-shrink:0"></div>
      <div style="flex:1"><div style="font:700 36px/1.2 'IBM Plex Sans Arabic';color:#fff">${t}</div>
        <div style="font:400 27px/1.4 'IBM Plex Sans Arabic';color:rgba(255,255,255,.68);margin-top:8px">${sub}</div></div>
    </div>`).join('')}
  </div>
  <div style="position:absolute;inset-inline:64px;top:1000px;font:500 26px/1.5 'IBM Plex Sans Arabic';
    color:rgba(255,255,255,.6);text-align:center">
    رخصة سارية · ترخيص مركبة · تأمين · المركبة مش أقدم من ${N('7')} سنين</div>
  <div style="position:absolute;inset-inline:150px;top:1075px;background:${LIVE};border-radius:999px;height:92px;
    display:flex;align-items:center;justify-content:center">
    <span style="font:700 36px/1 'IBM Plex Sans Arabic';color:#7C4A03">سجّل ككابتن</span></div>
  ${strip(1080, true)}`,
});

/* ═════════ 7 · سؤال وجواب — 4 منشورات ═════════ */
const FAQ = [
  ['قدّيش بستنّى؟', 'نافذة التجميع ${10} دقايق بالذروة. والوقت المتوقّع يظهرلك <b>قبل</b> ما تأكّد الطلب.', 'clock'],
  ['وإذا ما إجا حد غيري؟', 'تدفع مقعدك وحده. <b>رفيق ما يحمّلك ثمن المقاعد الفاضية</b> — هاي مشكلتنا لا مشكلتك.', 'school'],
  ['كيف بشحن المحفظة؟', 'حوالة CliQ من أي بنك أردني، بلا عمولة. <b>أو ادفع نقداً للكابتن</b> إذا ما بتحب المحافظ.', 'wallet'],
  ['وإذا ألغيت الرحلة؟', 'قبل الصعود: الحجز يُفَك ويرجع رصيدك <b>فوراً</b>. بعد الصعود بنفتحلك نزاع ونراجع الحالة.', 'x'],
];
FAQ.forEach(([q, a, icon], i) => add({
  file: `07-faq-${i + 1}`, w: 1080, h: 1080, bg: '#fff',
  title: `سؤال وجواب ${i + 1} — ${q}`,
  caption: `${q}

${a.replace(/<\/?b>/g, '').replace(/\$\{10\}/g, '10')}

عندك سؤال ثاني؟ اسأل بالتعليقات ونجاوبك بمنشور.

⬇️ البايو
#رفيق #أسئلتكم`,
  body: `${backdrop(1080, 1080)}
  <div style="position:absolute;inset-inline:72px;top:130px">
    <div style="display:flex;align-items:center;gap:24px;margin-bottom:40px">
      <div style="width:96px;height:96px;border-radius:28px;background:${B50};display:grid;place-items:center;flex-shrink:0">
        ${ic(icon, { s: 50, c: B, w: 1.7 })}</div>
      <div style="font:700 30px/1 'IBM Plex Sans Arabic';color:${B700}">سؤال متكرّر</div>
    </div>
    <div style="font:700 58px/1.28 'IBM Plex Sans Arabic';color:${INK}">${q}</div>
    <div style="width:110px;height:6px;border-radius:3px;background:${B};margin:34px 0"></div>
    <div style="font:400 37px/1.6 'IBM Plex Sans Arabic';color:${N600}">${a.replace(/\$\{10\}/g, N('10'))}</div>
  </div>
  ${strip(1080)}`,
}));

/* ═════════ 8 · ستوري — العدّاد ═════════ */
[5, 4, 3, 2, 1].forEach((d) => add({
  file: `08-story-countdown-${d}`, w: 1080, h: 1920, bg: B, safe: true,
  title: `ستوري عدّاد — باقي ${d} أيام`,
  caption: `باقي ${d} ${d === 1 ? 'يوم' : 'أيام'} 👀`,
  body: `${backdrop(1080, 1920, true)}
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
    ${cMark(1080, 0.17, { path: '#fff' })}
    <div style="font:500 44px/1 'IBM Plex Sans Arabic';color:rgba(255,255,255,.8)">باقي</div>
    <div style="font:700 300px/1 'IBM Plex Sans Arabic';color:#fff">${N(String(d))}</div>
    <div style="font:500 52px/1 'IBM Plex Sans Arabic';color:#fff">${d === 1 ? 'يوم' : 'أيام'}</div>
    <div style="font:500 38px/1 'IBM Plex Sans Arabic';color:rgba(255,255,255,.72);margin-top:20px">مقعدك إلى الجامعة</div>
  </div>`,
}));

/* ═════════ 9 · ستوري — رقم الأسبوع ═════════ */
add({
  file: '09-story-weekly-number', w: 1080, h: 1920, bg: '#fff', safe: true,
  title: 'ستوري — رقم الأسبوع (شفافية)',
  caption: `هذا الأسبوع: 312 رحلة، ومتوسّط 2.7 مقعد بالرحلة.

بننشر أرقامنا كل خميس. لأنّ الثقة تتبنى بالأرقام لا بالكلام.`,
  body: `${backdrop(1080, 1920)}
  <div style="position:absolute;inset-inline:90px;top:520px;text-align:center">
    <div style="font:500 40px/1 'IBM Plex Sans Arabic';color:${N500}">هذا الأسبوع</div>
    <div style="font:700 240px/1 'IBM Plex Sans Arabic';color:${B};margin:30px 0">${N('312')}</div>
    <div style="font:700 56px/1 'IBM Plex Sans Arabic';color:${INK}">رحلة</div>
    <div style="background:${B50};border-radius:28px;padding:36px;margin-top:70px">
      <div style="font:500 34px/1 'IBM Plex Sans Arabic';color:${N600}">متوسّط المقاعد المشغولة</div>
      <div style="font:700 78px/1 'IBM Plex Sans Arabic';color:${OK};margin-top:16px">${N('2.7')} / ${N('4')}</div>
    </div>
    <div style="font:400 32px/1.5 'IBM Plex Sans Arabic';color:${N500};margin-top:56px">
      بننشر أرقامنا كل خميس</div>
  </div>`,
});

/* ═════════ 10 · تغطية حيّ جديد ═════════ */
add({
  file: '10-coverage-new-area', w: 1080, h: 1080, bg: '#fff',
  title: 'تغطية — حيّ جديد',
  caption: `وصلنا حي الجامعة 🎉

من اليوم تقدر تطلب رفيق من حي الجامعة على اليرموك — مقعد مشترك بـ1.500 د.أ.

منطقتك مش موجودة؟ اكتبها بالتعليقات، وبنرتّبها حسب الطلب.

⬇️ البايو
#رفيق #حي_الجامعة #إربد`,
  body: `${backdrop(1080, 1080)}
  <div style="position:absolute;inset-inline:70px;top:120px;text-align:center">
    <div style="font:500 34px/1 'IBM Plex Sans Arabic';color:${OK};margin-bottom:20px">تغطية جديدة</div>
    <div style="font:700 78px/1.2 'IBM Plex Sans Arabic';color:${INK}">وصلنا<br>حي الجامعة</div>
  </div>
  <div style="position:absolute;inset-inline:120px;top:420px;height:300px;border-radius:32px;
    overflow:hidden;border:3px solid ${N200};background:${B50}">
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:60px">
      <div style="text-align:center">
        <div style="width:34px;height:34px;border-radius:50%;border:9px solid ${B};margin:0 auto 16px"></div>
        <div style="font:700 30px/1 'IBM Plex Sans Arabic';color:${INK}">حي الجامعة</div></div>
      <svg width="150" height="34" viewBox="0 0 150 34" fill="none">
        <path d="M146 17 H6" stroke="${B}" stroke-width="5" stroke-dasharray="15 11" stroke-linecap="round"/>
      </svg>
      <div style="text-align:center">
        <div style="width:34px;height:34px;border-radius:50%;background:${LIVE};margin:0 auto 16px"></div>
        <div style="font:700 30px/1 'IBM Plex Sans Arabic';color:${INK}">اليرموك</div></div>
    </div>
  </div>
  <div style="position:absolute;inset-inline:120px;top:760px;background:${B};border-radius:26px;
    padding:30px;text-align:center">
    <div style="font:500 30px/1 'IBM Plex Sans Arabic';color:rgba(255,255,255,.8)">مقعد مشترك</div>
    <div style="font:700 72px/1 'IBM Plex Sans Arabic';color:#fff;margin-top:12px">${JOD('1.500')}</div>
  </div>
  ${strip(1080)}`,
});

/* ═════════ 11 · إعلان مدفوع — 3 إبداعات ═════════ */
const ADS = [
  ['A', 'الرقم', '6 كيلو للجامعة', '1.500', `6 كيلو من بيتك للجامعة. مقعدك بـ1.500 د.أ.\n\nالسعر معلن قبل ما تطلب.\n\n⬇️ نزّل رفيق`],
  ['B', 'الألم', 'بتصرف 70 دينار بالشهر؟', '−30', `20 يوم دراسي بالتكسي = ~70 د.أ بالشهر.\n\nمع رفيق: 60 د.أ، ومع الخطّ الشهري أقل.\n\n⬇️ احسبها بنفسك`],
  ['C', 'الفكرة', '4 طلاب من منطقتك', '÷4', `4 طلاب من نفس المنطقة، نفس الوقت، مركبة واحدة.\n\nالكلفة تتقسّم. المقعد بـ1.500 د.أ.\n\n⬇️ نزّل رفيق`],
];
ADS.forEach(([k, angle, headline, big, cap]) => add({
  file: `11-ad-${k.toLowerCase()}-${angle}`, w: 1080, h: 1350, bg: '#fff',
  title: `إعلان ${k} — زاوية «${angle}»`,
  caption: cap,
  body: `${backdrop(1080, 1350)}
  <div style="position:absolute;inset-inline:70px;top:150px;text-align:center">
    <span style="display:inline-block;background:${B50};border-radius:999px;padding:12px 30px;
      font:700 26px/1 'IBM Plex Sans Arabic';color:${B700};margin-bottom:36px">زاوية ${angle}</span>
    <div style="font:700 66px/1.25 'IBM Plex Sans Arabic';color:${INK}">${headline}</div>
  </div>
  <div style="position:absolute;inset-inline:0;top:520px;text-align:center">
    <div style="font:700 190px/1 'IBM Plex Sans Arabic';color:${B}">${N(big)}</div>
    <div style="font:500 38px/1 'IBM Plex Sans Arabic';color:${N600};margin-top:20px">
      ${k === 'A' ? 'د.أ للمقعد المشترك' : k === 'B' ? 'دينار توفير بالشهر' : 'الكلفة تتقسّم'}</div>
  </div>
  <div style="position:absolute;inset-inline:150px;bottom:250px;background:${B};border-radius:999px;
    height:104px;display:flex;align-items:center;justify-content:center;gap:16px;
    box-shadow:0 14px 38px rgba(18,89,227,.32)">
    <span style="font:700 40px/1 'IBM Plex Sans Arabic';color:#fff">نزّل رفيق</span>
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6"
      stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg></div>
  ${strip(1080)}`,
}));

/* ═════════ 12 · غلاف فيسبوك + صورة الحساب ═════════ */
add({
  file: '12-facebook-cover', w: 1640, h: 856, bg: '#fff',
  title: 'غلاف فيسبوك',
  caption: null,
  body: `${backdrop(1640, 856)}
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:44px">
    ${cMark(1640, 0.115, { path: B })}
    <div>
      <div style="font:700 132px/1 'IBM Plex Sans Arabic';color:${INK}">رفيق</div>
      <div style="font:500 44px/1 'IBM Plex Sans Arabic';color:${B};margin-top:20px">مقعدك إلى الجامعة</div>
    </div>
  </div>
  <div style="position:absolute;inset-inline:0;bottom:52px;text-align:center;
    font:400 30px/1 'IBM Plex Sans Arabic';color:${N500}">
    نجمع طلاب منطقتك في رحلة واحدة إلى الجامعة · سعر ثابت معلن قبل الطلب</div>`,
});
add({
  file: '12-profile-picture', w: 1000, h: 1000, bg: B,
  title: 'صورة الحساب',
  caption: null,
  body: `<div style="position:absolute;inset:0;display:grid;place-items:center">${cMark(1000, 0.62, { path: '#fff' })}</div>`,
});

/* ── render ── */
const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--no-sandbox', '--font-render-hinting=none'] });
const index = [];

for (const p of POSTS) {
  const tmp = resolve(HERE, '_mkt.html');
  writeFileSync(tmp, page(p.w, p.h, p.body, p.bg));
  const ctx = await browser.newContext({ viewport: { width: p.w, height: p.h }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(320);
  await pg.screenshot({ path: `${OUT}/${p.file}.png` });
  await ctx.close();

  if (p.caption) writeFileSync(`${OUT}/${p.file}.txt`, p.caption + '\n');
  index.push({ ...p, kind: p.h === 1920 ? 'ستوري' : p.w === p.h ? 'مربّع' : p.w > p.h ? 'غلاف' : 'رأسي' });
  console.log(`${p.file.padEnd(28)} ${p.w}x${p.h}${p.caption ? '  +نصّ' : ''}`);
}
await browser.close();

writeFileSync(resolve(HERE, '_mkt-index.json'), JSON.stringify(index.map(
  ({ file, title, w, h, kind }) => ({ file, title, w, h, kind })), null, 2));
console.log(`\n${POSTS.length} منشوراً`);
