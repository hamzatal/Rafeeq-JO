# 📚 دليل توثيق رفيق (Rafeeq Documentation Index)

نقطة الدخول الموحّدة لكل توثيق المشروع. ابدأ من **"ابدأ هنا"** ثم انتقل للقسم الذي يهمّك.

> **ملاحظة تنظيمية:** بعض المواضيع لها ملف "مرجعي مختصر" بالجذر (`docs/X.md`) وملف "تفصيلي" داخل مجلد فرعي (`docs/<group>/...`). يُشار للملف المعتمد (Canonical) في كل قسم.

---

## ▶️ ابدأ هنا (Start Here)

| الملف | الوصف |
|------|-------|
| [PROGRESS.md](./PROGRESS.md) | **اقرأه أولاً.** حالة المشروع الحالية، نسبة الإنجاز الصادقة، والخطوة التالية، وسجلّ التغييرات (RFQ-xxx). |
| [HANDOFF.md](./HANDOFF.md) | ملخّص شامل لتسليم المشروع وفهمه بسرعة. |
| [RUNNING.md](./RUNNING.md) | كيفية تشغيل المشروع محلياً (backend + 3 تطبيقات). |

---

## 🏛️ المعمارية (Architecture)

| الملف | الوصف |
|------|-------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Canonical** — نظرة عامة على المعمارية (Modular Monolith / Laravel). |
| [architecture/system-architecture.md](./architecture/system-architecture.md) | تفاصيل معمارية النظام والطبقات. |
| [architecture/CODE-MAP.md](./architecture/CODE-MAP.md) | خريطة الكود: أين تجد ماذا (الوحدات والطبقات). |
| [MODULE_GUIDE.md](./MODULE_GUIDE.md) | دليل بنية الوحدة (Module) وكيفية إضافة وحدة جديدة. |
| [RESILIENCE.md](./RESILIENCE.md) | مبدأ الـ Fallback الآمن (يعمل بدون مفاتيح خارجية). |

---

## 🗄️ قاعدة البيانات (Database)

| الملف | الوصف |
|------|-------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | **Canonical** — مخطّط قاعدة البيانات الموثّق يدوياً. |
| [DATABASE_SCHEMA.generated.md](./DATABASE_SCHEMA.generated.md) | مخطّط مُولَّد آلياً من الـ migrations (مرجع تقني). |
| [database/schema.md](./database/schema.md) | شرح إضافي للعلاقات. |

> الجداول: ~50 جدول عبر 59 migration. مفاتيح UUID، مبالغ بالـ fils (integer)، jsonb، فهارس. راجع PROGRESS لأي ملاحظات اتساق FK.

---

## ✨ المزايا والأعمال (Features & Business)

| الملف | الوصف |
|------|-------|
| [FEATURES.md](./FEATURES.md) | قائمة المزايا الكاملة عبر الوحدات الـ 31. |
| [DESIGN.md](./DESIGN.md) | نظام التصميم والهوية البصرية (RTL/عربي أولاً). |
| [business/overview.md](./business/overview.md) | نظرة عمل/منتج عامة. |
| [ROADMAP.md](./ROADMAP.md) · [business/roadmap.md](./business/roadmap.md) | خارطة الطريق (مراحل المنتج). |

---

## 💳 الدفع والتكاملات (Payments & Integrations)

| الموضوع | الوصف |
|------|-------|
| **CliQ + الفواتير** | تدفّق الشحن: رقم مرجعي `RFQ-YYYY-#####` + رفع إيصال + تحقق GPT-Vision (مبلغ + اسم المُرسِل) → اعتماد تلقائي أو مراجعة بشرية. الـ alias قابل للتغيير من لوحة الأدمن (`/admin/settings/cliq`). |
| **الذكاء الاصطناعي (AI)** | GptClient (chat + vision + JSON + سقف tokens) مع `NullGptClient` fallback. خدمات: مساعد الطالب، رؤى الأدمن، مراقبة الاحتيال، ذكاء المسارات، تحقق الفواتير. |
| [WHATSAPP_OTP.md](./WHATSAPP_OTP.md) | تفعيل OTP عبر WhatsApp — بوّابتان: OpenWA (self-hosted) و WhatsApp Business Cloud الرسمي (Meta). |

---

## 🚀 النشر والتشغيل (Deployment & Operations)

| الملف | الوصف |
|------|-------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | **Canonical** — دليل النشر للإنتاج. |
| [deployment/local-setup.md](./deployment/local-setup.md) | إعداد البيئة المحلية (backend). |
| [deployment/frontend-setup.md](./deployment/frontend-setup.md) | إعداد التطبيقات (Expo / Next.js). |
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) | قائمة ما تبقّى للإطلاق (تكاملات + بنية تحتية + متاجر). |
| [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) | خطة التنفيذ. |

---

## 🔐 الأمان (Security)

| الملف | الوصف |
|------|-------|
| [SECURITY.md](./SECURITY.md) | **Canonical** — نموذج الأمان (RBAC، Sanctum، rate limiting، رؤوس أمان). |
| [security/security-model.md](./security/security-model.md) | تفاصيل إضافية لنموذج الأمان. |

> **تنبيه أمني قائم:** `composer audit` يُظهر 3 تنبيهات على `laravel/framework` v11 (أخطرها CRLF injection). يُنصح بترقية الإطار بفرع منفصل. راجع PROGRESS.

---

## ⚖️ القانوني (Legal — عربي)

| الملف | الوصف |
|------|-------|
| [legal/terms-ar.md](./legal/terms-ar.md) | الشروط والأحكام. |
| [legal/privacy-ar.md](./legal/privacy-ar.md) | سياسة الخصوصية. |
| [legal/data-retention-ar.md](./legal/data-retention-ar.md) | سياسة الاحتفاظ بالبيانات. |
| [legal/prohibited-items-ar.md](./legal/prohibited-items-ar.md) | المواد الممنوعة (للطرود). |

---

## 🧪 الجودة (Quality)

- **الاختبارات:** `cd backend && php artisan test` (الحالي: 122 اختبار).
- **التحليل الساكن:** `cd backend && vendor/bin/phpstan analyse` (Larastan، إعداد في `phpstan.neon`).
- **فحص الأنواع (الفرونت):** لكل تطبيق `npx tsc --noEmit`.
- **الستايل:** `cd backend && vendor/bin/pint`.
