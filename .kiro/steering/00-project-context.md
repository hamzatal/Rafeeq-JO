---
inclusion: always
---

# سياق مشروع رفيق (Rafeeq) — اقرأ أولاً (يُحمَّل تلقائياً)

> الهدف: تفهم المشروع فوراً **بدون إعادة دراسة كل الملفات**. للحالة والخطة راجع
> [`docs/01-MASTER-PLAN.md`](../../docs/01-MASTER-PLAN.md) و [`docs/10-STITCH-SCREENS.md`](../../docs/10-STITCH-SCREENS.md).
> فهرس كل التوثيق: [`docs/README.md`](../../docs/README.md).

## ما هو رفيق
منصة **نقل وخدمات طلابية ذكية في الأردن**. النواة: الطالب يطلب رحلة بيته↔جامعته، ونجمّع طلاب نفس المنطقة+الجامعة مع كابتن معتمد بسعر عادل وتتبّع وأمان ودفع إلكتروني. نبدأ **إربد** ثم نتوسّع لكل الأردن بتفعيل `is_active`. تفاصيل الفكرة (غير تقنية): [`docs/00-VISION.md`](../../docs/00-VISION.md).

## التطبيقات الثلاثة
- `frontend/student-app` — تطبيق الطالب (Expo / React Native + TS).
- `frontend/driver-app` — تطبيق الكابتن (Expo / RN + TS).
- `frontend/admin-dashboard` — لوحة الإدارة (Next.js + Tailwind).
- `frontend/packages/shared` (توكنز التصميم + الأنواع + i18n) و `packages/api-client` (عميل REST).
- `backend` — Laravel 12 · PHP 8.4 · Modular Monolith (32 موديول).

## الحقائق التقنية (محدّثة — لا تثق بأي مصدر قديم يخالفها)
- **Backend:** Laravel **12** · PHP **8.4** · PostgreSQL 16 · Redis · Reverb (realtime) · Sanctum. المبالغ بالفلس (int). مفاتيح UUID. namespaces: `Rafeeq\Core|Shared|Infrastructure|Modules`.
- **الاختبارات:** 172 اختبار (PHPUnit). **شغّلها قبل دمج أي تعديل backend** (`cd backend && ./vendor/bin/phpunit`).
- **التشغيل:** backend `composer install && php artisan migrate:fresh --seed && php artisan serve`. frontend `cd frontend && npm install` ثم `npm run student|driver|admin`.

## 🎨 التصميم — **Stitch** هو المصدر الوحيد والنهائي (كل الهويات السابقة مُلغاة)
المرجع: `stitch_rafeeq_ai_student_platform.zip` (جذر الريبو) + [`docs/03-DESIGN-SYSTEM.md`](../../docs/03-DESIGN-SYSTEM.md).
- **الألوان:** كحلي ملكي `#002045` (primary) + Smart Teal `#006A65` (accent/AI/حيّ/نجاح) + خلفيات off-white.
- **الخط:** `IBM Plex Sans Arabic` حصراً (بديل Cairo نهائياً).
- **الوضع:** فاتح + داكن مدعومان، **الافتراضي فاتح**. اللغة: عربي + إنجليزي، **الافتراضي عربي** + RTL.
- **الملاحة:** موبايل = تبويب سفلي (زر «رفيق AI» مركزي في الطالب) · الإدارة = Sidebar يمين RTL.
- **قاعدة:** اقرأ التوكنز من `useTheme()` (موبايل) / Tailwind (إدارة). **لا تكتب ألوان hex يدوياً** إلا الأبيض-على-كحلي.
- توكنز الكود: `frontend/packages/shared/src/theme/scheme.ts` + `admin-dashboard/tailwind.config.ts`.

## التسعير والعمولة (المرحلة 3)
- **مبني على المسافة (GPS/Haversine)** — `Core/Support/Geo` + `Modules/Matching/Services/PricingService`. مفاتيح في `config/rafeeq.php` (فتح عداد 300 فلس + 250/كم + 20/دقيقة + حد أدنى 1000 + ليلي 1.25×).
- **عمولة المنصة 15%** (`splitCommission`, zero-sum) تُخصم من الكابتن عبر المحفظة (لا كاش مباشر).
- التفاصيل والدراسة: [`docs/02-PRICING-ZONES.md`](../../docs/02-PRICING-ZONES.md).

## الدفع والأمان و AI (باختصار)
- **الدفع:** CliQ — Payment Request برقم `RFQ-2026-#####` + تحقّق GPT Vision + fallback يدوي. (لا علاقة له بترقيم الكوميت.)
- **الأمان:** كباتن معتمدون + OTP صعود/إنزال + SOS + audit + مكافحة احتيال. (ثغرات موثّقة للمعالجة في المرحلة 4.)
- **AI:** عبر GPT API مع `NullGptClient` fallback (مساعد/تحقّق دفع/مسارات/احتيال/شكاوى/مفقودات).

## القاعدة الذهبية
شغل **كامل وجاهز للإنتاج** — لا skeleton ولا اختصار. التزام حرفي بتصميم Stitch. لا تكسر `main` (شغّل اختبارات backend قبل الدمج).
