# 📚 دليل توثيق رفيق (Rafeeq Documentation Index)

نقطة الدخول الموحّدة لكل توثيق المشروع. ابدأ من **"ابدأ هنا"** ثم انتقل للقسم الذي يهمّك.

---

## ▶️ ابدأ هنا (Start Here)

| الملف | الوصف |
|------|-------|
| [PROGRESS.md](./PROGRESS.md) | **اقرأه أولاً.** حالة المشروع، نسبة الإنجاز، الخطوة التالية، وسجلّ التغييرات (RFQ-xxx). |
| [HANDOFF.md](./HANDOFF.md) | ملخّص شامل لتسليم المشروع وفهمه بسرعة. |
| [RUNNING.md](./RUNNING.md) | تشغيل المشروع محلياً (backend + 3 تطبيقات) وربط عنوان الخادم. |

---

## 🔍 التدقيق والدراسة (الأحدث)

| الملف | الوصف |
|------|-------|
| [FULL_PROJECT_AUDIT_2026-07.md](./FULL_PROJECT_AUDIT_2026-07.md) | التدقيق الشامل: حالة المشروع + المشاكل + خطة العمل. |
| [../backend/SECURITY_QA_AUDIT.md](../backend/SECURITY_QA_AUDIT.md) | تدقيق الأمان/الجودة التفصيلي بمراجع الأسطر. |
| [FEATURE_STUDY.md](./FEATURE_STUDY.md) | دراسة المزايا + توصيات نطاق الإطلاق (MVP). |

> ✅ **الهوية البصرية المعتمدة حالياً: نظام Onyx** (إنك `#0A0D12` + أزرق توقيعي `#2F6BFF`) — موحّدة عبر التطبيقات الثلاث (RFQ-286). معرض 30 اتجاه بديل للتحسين المستقبلي في [DESIGNS.md](./DESIGNS.md) (صور SVG في `designs/`).

---

## 🏛️ المعمارية (Architecture)

| الملف | الوصف |
|------|-------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **Canonical** — المعمارية (Modular Monolith / Laravel 12). |
| [architecture/system-architecture.md](./architecture/system-architecture.md) | تفاصيل الطبقات. |
| [architecture/CODE-MAP.md](./architecture/CODE-MAP.md) | خريطة الكود: أين تجد ماذا. |
| [MODULE_GUIDE.md](./MODULE_GUIDE.md) | بنية الوحدة (Module) وكيفية إضافة وحدة. |
| [RESILIENCE.md](./RESILIENCE.md) | مبدأ الـ Fallback الآمن (يعمل بدون مفاتيح خارجية). |

---

## 🗄️ قاعدة البيانات (Database)

| الملف | الوصف |
|------|-------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | **Canonical** — المخطّط الموثّق يدوياً. |
| [DATABASE_SCHEMA.generated.md](./DATABASE_SCHEMA.generated.md) | مخطّط مُولَّد آلياً من الـ migrations. |
| [database/schema.md](./database/schema.md) | شرح إضافي للعلاقات. |

> **65 جدول** (57 أعمال + 8 نظام) عبر 75 migration. مفاتيح UUID، مبالغ بالـ fils، jsonb. أُضيفت فهارس المسارات الساخنة (RFQ-288).

---

## ✨ المزايا والأعمال

| الملف | الوصف |
|------|-------|
| [FEATURES.md](./FEATURES.md) | قائمة المزايا عبر الوحدات الـ32. |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | نظام التصميم والهوية (RTL/عربي أولاً). |
| [business/overview.md](./business/overview.md) | نظرة عمل/منتج. |
| [ROADMAP.md](./ROADMAP.md) · [business/roadmap.md](./business/roadmap.md) | خارطة الطريق. |
| [business/BRAND_NAMING.md](./business/BRAND_NAMING.md) | تحليل اسم العلامة. |

---

## 💳 الدفع والتكاملات

| الموضوع | الوصف |
|------|-------|
| **CliQ + الفواتير** | رقم مرجعي `RFQ-YYYY-#####` + رفع إيصال + تحقّق GPT-Vision → اعتماد تلقائي أو مراجعة بشرية. |
| **الذكاء الاصطناعي** | GptClient (chat + vision) مع `NullGptClient` fallback: مساعد، رؤى، مكافحة احتيال، تحقّق فواتير. |
| [WHATSAPP_OTP.md](./WHATSAPP_OTP.md) | تفعيل OTP عبر WhatsApp Business Cloud (Meta). |

---

## 🚀 النشر والتشغيل

| الملف | الوصف |
|------|-------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | **Canonical** — النشر للإنتاج. |
| [deployment/local-setup.md](./deployment/local-setup.md) | البيئة المحلية (backend). |
| [deployment/frontend-setup.md](./deployment/frontend-setup.md) | التطبيقات (Expo / Next.js). |
| [deployment/android-build.md](./deployment/android-build.md) | بناء APK عبر EAS. |
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) | ما تبقّى للإطلاق. |

---

## 🔐 الأمان (Security)

| الملف | الوصف |
|------|-------|
| [SECURITY.md](./SECURITY.md) | **Canonical** — نموذج الأمان (RBAC، Sanctum، rate limiting، رؤوس). |
| [security/security-model.md](./security/security-model.md) | تفاصيل إضافية. |

> ✅ عُولجت الثغرات الحرجة (بثّ خاص، حجوزات المحفظة، تجاوز MFA، دفتر الكوبونات، SOS) في RFQ-287 — راجع تقرير الأمان.

---

## ⚖️ القانوني (عربي)

| الملف | الوصف |
|------|-------|
| [legal/terms-ar.md](./legal/terms-ar.md) | الشروط والأحكام. |
| [legal/privacy-ar.md](./legal/privacy-ar.md) | الخصوصية. |
| [legal/data-retention-ar.md](./legal/data-retention-ar.md) | الاحتفاظ بالبيانات. |
| [legal/prohibited-items-ar.md](./legal/prohibited-items-ar.md) | المواد الممنوعة. |

---

## 🧪 الجودة

- **الاختبارات:** `cd backend && ./vendor/bin/phpunit` (الحالي: **166 اختبار — كلها ناجحة**).
- **فحص الأنواع (الفرونت):** لكل تطبيق `npm run typecheck`.
- **التحليل الساكن:** `cd backend && vendor/bin/phpstan analyse` · **الستايل:** `vendor/bin/pint`.

---

## 🗃️ الأرشيف

[archive/](./archive/) — خطط وهويات سابقة (للمرجع التاريخي فقط).
