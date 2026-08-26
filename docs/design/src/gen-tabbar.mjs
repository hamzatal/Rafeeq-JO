import { writeFileSync } from 'fs';
import { tabBar, ic, icf, TABS } from './ui.mjs';

const out = (f, s) => writeFileSync(new URL(f, import.meta.url), s);
const W = 1500;

const VARIANTS = [
  ['a', 'أ — الحالي', 'حدّ رقيق 1px + كبسولة <code>brand-50</code> باهتة. الحدّ يُقرأ فاصلاً لا ارتفاعاً، والكبسولة على أبيض <b>1.09:1</b> فلا تكاد تُرى. والأيقونة 19px بفرق لون فقط.'],
  ['b', 'ب — مرفوع + كبسولة فاتحة', 'الحدّ يصير ظلّاً علوياً ناعماً فيُقرأ البار مرفوعاً فوق الخريطة. الكبسولة تكبر إلى 50×31 والأيقونة إلى 21px. لا تزال الأيقونة خطّية في الحالتين.'],
  ['c', 'ج — مرفوع + كبسولة مصمتة وأيقونة مصمتة', 'الكبسولة <code>brand-600</code> مصمتة وأيقونتها بيضاء — <b>5.89:1</b>، لا لبس فيها بلمحة واحدة. وهذا هو ما تفعله كل منصّة حديثة: خطّي للساكن، مصمت للنشط.'],
  ['d', 'د — مرفوع + أيقونة مصمتة + مؤشّر علوي', 'بلا كبسولة: شريط <code>brand-600</code> بسماكة 3px أعلى التبويب النشط وأيقونة مصمتة زرقاء. أهدأ من (ج) لكن المؤشّر العلوي نمط لوحي أكثر منه هاتفي.'],
];

const bar = (v, set, active) => `
<div style="position:relative;width:390px;height:120px;background:#F2F5F9;border-radius:14px;overflow:hidden">
  <div style="position:absolute;inset-inline:0;top:0;height:56px;background:#fff;
    box-shadow:0 4px 12px rgba(18,47,107,.05)"></div>
  <div style="position:absolute;inset-inline:14px;top:14px;height:28px;background:var(--n100);border-radius:8px"></div>
  ${tabBar(active, set, v)}
</div>`;

out('r-tabbar.html', `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="kit.css"><style>body{width:${W}px;background:#fff}</style></head><body>
<div style="padding:34px 38px">
  <div style="font:700 21px 'IBM Plex Sans Arabic';margin-bottom:4px">بار التنقّل — أربع بدائل</div>
  <div style="font:400 14px/23px 'IBM Plex Sans Arabic';color:var(--n600);margin-bottom:8px">
    كل بديل بحالتين: تبويب أوّل نشط (طالب) وتبويب ثالث نشط (كابتن). والقاعدة المطبَّقة:
    <b>«حدّ أو ظلّ، لا الاثنان معاً»</b> — فالبار المرفوع فوق خريطة يأخذ ظلّاً، لا حدّاً.</div>

  ${VARIANTS.map(([v, t, d]) => `
  <div style="border-top:1px solid var(--n200);padding-top:18px;margin-top:18px">
    <div class="row" style="gap:26px;align-items:flex-start">
      <div style="flex:0 0 430px">
        <div style="font:700 16px 'IBM Plex Sans Arabic';color:${v === 'c' ? 'var(--b700)' : 'var(--n900)'};margin-bottom:6px">
          ${t}${v === 'c' ? ' &nbsp;<span class="pill pill-ok" style="font-size:11px">المعتمد</span>' : ''}</div>
        <div style="font:400 13px/22px 'IBM Plex Sans Arabic';color:var(--n700)">${d}</div>
      </div>
      ${bar(v, 'student', 0)}
      ${bar(v, 'driver', 2)}
    </div>
  </div>`).join('')}

  <div style="border-top:1px solid var(--n200);padding-top:20px;margin-top:22px">
    <div style="font:700 16px 'IBM Plex Sans Arabic';margin-bottom:12px">الأيقونات — خطّي مقابل مصمت</div>
    <div class="row" style="gap:30px;flex-wrap:wrap">
      ${['home', 'car', 'wallet', 'user', 'gauge', 'cash'].map(n => `
      <div style="text-align:center">
        <div class="row" style="gap:10px">
          <div style="width:52px;height:32px;border-radius:999px;display:grid;place-items:center;background:var(--n50)">
            ${ic(n, { s: 21, c: '#67728A', w: 1.8 })}</div>
          <div style="width:52px;height:32px;border-radius:999px;display:grid;place-items:center;
            background:var(--b600);box-shadow:0 3px 9px rgba(18,89,227,.34)">${icf(n, { s: 22, c: '#fff' })}</div>
        </div>
        <div style="font:500 11.5px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:8px;direction:ltr">${n}</div>
      </div>`).join('')}
    </div>
    <div style="font:400 12.5px/21px 'IBM Plex Sans Arabic';color:var(--n600);margin-top:16px">
      <b>وتغيّرت أيقونتان:</b> الكوكبِت كان <code>chart</code> — ومخطّط أعمدة ليس كوكبِتاً، فصار
      <code>gauge</code> (عدّاد). و<code>user</code> كان رأسه مقتطعاً أعلى المربّع فصار مُتَمَركزاً.
      و<b>لمس كل تبويب 97×64</b> — أوسع من الحدّ الأدنى 44 بمرّتين.
    </div>
  </div>
</div></body></html>`);

console.log('generated: r-tabbar');
