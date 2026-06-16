---
inclusion: always
---

# معايير العمل والاتفاقيات (Rafeeq)

## قاعدة ذهبية
ممنوع الاختصار، ممنوع تخطّي أي ميزة، ممنوع الشغل الناقص أو الـ skeleton فقط.
كل ميزة تُبنى **كاملة وجاهزة للإنتاج**. نمشي خطوة خطوة عبر جلسات متعددة حتى يكتمل المشروع 100% حسب `docs/ROADMAP.md`.

## الـ Commits
- صيغة الرسالة: `[RFQ-###] <type>: <وصف واضح>`
  - `###` رقم متسلسل بثلاث خانات يزيد عبر كامل المشروع (RFQ-001, RFQ-002, ...).
  - `type` واحد من: feat, fix, refactor, docs, chore, test, infra.
- كل commit يوضّح بدقّة ما أُنجز في ذلك القسم.
- آخر رقم RFQ مستخدم مسجّل في `docs/PROGRESS.md` (خانة "آخر Commit").

## تتبّع التقدّم (إلزامي مع كل push)
1. حدّث `docs/PROGRESS.md`: المنجز ✅، الجاري 🔄، المتبقي ⏳ لكل مرحلة/موديول، وآخر رقم commit.
2. حدّث قائمة المراحل في `README.md`.

## استئناف العمل بمحادثة جديدة
ابدأ دائماً بقراءة: `docs/PROGRESS.md` ثم `docs/ROADMAP.md` ثم ملفات `.kiro/steering/`.
لا تطلب من المستخدم إعادة شرح المشروع. استأنف من "الخطوة التالية" في PROGRESS.

## الفروع و PRs
- لا تدفع على main مباشرة. افتح فرع per-phase: `feature/phaseN-<اسم>`.
- بعد كل قسم منطقي: push + (تحديث/فتح) PR، وأعطِ المستخدم رابط المراجعة على GitHub.

## معايير الكود (Backend - Laravel)
- Controllers رفيعة → كل المنطق في Services. الوصول للبيانات عبر Repositories.
- مدخلات عبر FormRequest. مخرجات عبر API Resources. استجابة موحّدة عبر `ApiResponse`.
- كل موديول مكتفٍ ذاتياً: Controllers/Services/Models/Repositories/Requests/Resources/Events/Jobs/Policies/Routes/Database/Migrations + ServiceProvider خاص يُسجَّل في `bootstrap/providers.php`.
- Enums في `Shared/Enums`. UUID عبر trait `HasUuid`. نصوص عربية في الرسائل الموجّهة للمستخدم.
- العمليات الحساسة تُسجَّل في `audit_logs`. الحقول الحساسة مشفّرة.

## معايير الكود (Frontend)
- TypeScript صارم. مكوّنات قابلة لإعادة الاستخدام. RTL + ثنائي اللغة من البداية.
- design tokens والأنواع من `frontend/packages/shared` (لا تكرار).

## التشغيل المحلي
طريقة التشغيل محدّثة دائماً في `README.md` و`docs/deployment/local-setup.md`.
