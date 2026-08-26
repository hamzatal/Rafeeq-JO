# مصادر الهوية — قابلة لإعادة التوليد

الصفائح في `../v2/` **ليست صوراً ميتة** — هي ناتج هذا الكود.

```bash
cd docs/design/src
npm i -D playwright && npx playwright install chromium
for g in gen-student gen-money gen-driver gen-admin gen-extra; do node $g.mjs; done
node shoot.mjs            # كل الصفائح
node shoot.mjs 05-driver   # صفيحة واحدة
```

| الملف | الدور |
|---|---|
| `kit.css` | **التوكنز**. كل لون ومقاس ومسافة. تغيير اللون هنا يغيّر كل الصفائح. |
| `ui.mjs` | مكتبة المكوّنات: أيقونات Lucide · شريط الحالة · التبويب · البطاقات · الصفوف · الخريطة |
| `admin.mjs` | قوالب لوحة الإدارة: الهيكل · الجداول · KPIs |
| `gen-*.mjs` | تعريف الشاشات كبيانات |
| `shoot.mjs` | يصوّر بـ Playwright · **يفشل** إن تجاوزت صورة 8000px |

**تبديل لون العلامة:** عدّل `--b50…--b900` في `kit.css` وأعد التشغيل. النظام مستقل عن اللون.
