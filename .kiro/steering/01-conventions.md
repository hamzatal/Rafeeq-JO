---
inclusion: always
---

# قواعد العمل والاتفاقيات (Rafeeq) — يُحمَّل تلقائياً

## 1) استئناف العمل في جلسة جديدة (ابدأ من هنا)
1. اقرأ [`docs/01-MASTER-PLAN.md`](../../docs/01-MASTER-PLAN.md) — لوحة الحالة (المنجز/الجاري/التالي) خطوة بخطوة.
2. اقرأ [`docs/10-STITCH-SCREENS.md`](../../docs/10-STITCH-SCREENS.md) — حالة كل شاشة مقابل Stitch.
3. اقرأ [`docs/11-COMMIT-CONVENTION.md`](../../docs/11-COMMIT-CONVENTION.md) — تسلسل RFQ.
**لا تعِد دراسة كل الملفات ولا تطلب من المستخدم إعادة الشرح** — استأنف من «التالي».

## 2) ترقيم الكوميت (RFQ)
- الصيغة: `RFQ-<n> — <وصف عربي موجز>` (رقم متزايد بواحد، لا يتكرّر ولا يرجع).
- **آخر رقم مستخدم مسجّل في نهاية جدول [`docs/01-MASTER-PLAN.md`](../../docs/01-MASTER-PLAN.md)** — خذه وزِد 1.
- تفاصيل + تصحيح التسلسل التاريخي: [`docs/11-COMMIT-CONVENTION.md`](../../docs/11-COMMIT-CONVENTION.md).

## 3) سير الدمج (المستخدم لا يعمل merge يدوي)
المستخدم يسحب `git pull origin main` فقط. لكل دفعة:
1. `git checkout -b <feat|fix>/<وصف>` من `main` محدّث.
2. عدّل + commit بصيغة `RFQ-<n> — ...`.
3. `push_to_remote` للفرع ثم `create_pull_request` (للسجل).
4. **ادمج بنفسك:** `git checkout main && git merge --ff-only <branch>` ثم `push_to_remote main`.
   (استخدم أدوات github power؛ لا `git push` مباشر. لا force-push على main.)
5. حدّث الدوكس (`01-MASTER-PLAN` + `10-STITCH-SCREENS`) مع كل دفعة.

## 4) بوابة الجودة قبل الدمج
- **backend:** `cd backend && ./vendor/bin/phpunit` يجب أن يكون **أخضر** (خط الأساس 172 اختبار) + `./vendor/bin/pint --dirty`. لا تدمج backend بلا تشغيل الاختبارات.
- **تعديلات backend الحسّاسة** (تسعير/محفظة/مطابقة): أضِف/شغّل اختبارات.
- **frontend:** استخدم فقط حزماً مثبّتة فعلاً (تحقّق من `package.json`). حزم غير مثبّتة = شاشة بيضاء. (سبق أن كسر `expo-linear-gradient` غير المثبّت الطالبَ — الدرس: تأكّد من الاستيراد.)

## 5) التصميم (إلزامي)
- **Stitch فقط.** توكنز من `useTheme()` / Tailwind — لا hex يدوي (إلا أبيض على كحلي).
- افتراضي: **عربي + لايت**. دعم كامل للدارك والإنجليزية.
- نصوص المستخدم عبر i18n (`packages/shared/src/i18n` + `src/i18n` بكل تطبيق) — لا نصوص عربية مكتوبة داخل المكوّنات المشتركة.

## 6) معايير الكود
- **Backend:** Controllers رفيعة → Services → Repositories. مدخلات FormRequest، مخرجات Resources، استجابة `ApiResponse` موحّدة. كل موديول مكتفٍ ذاتياً + ServiceProvider مُسجّل في `bootstrap/providers.php`. Enums في `Shared/Enums`. عمليات حسّاسة → `audit_logs`.
- **Frontend:** TypeScript صارم. أعِد استخدام مكوّنات `packages/shared`. RTL + ثنائي اللغة.

## 7) القاعدة الذهبية
شغل **كامل جاهز للإنتاج** — لا skeleton، لا اختصار، لا كسر لمزايا قائمة. خطوة خطوة عبر الجلسات حتى الاكتمال 100% حسب [`docs/01-MASTER-PLAN.md`](../../docs/01-MASTER-PLAN.md).
