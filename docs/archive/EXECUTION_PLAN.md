# خطة التنفيذ الملموسة — إعادة هيكلة رفيق (Execution Plan)

> خطة تشغيلية مبنية على دراسة الكود الفعلي. كل "Increment" قابل للشحن وحده (commit + push + توثيق)، وله: الهدف، الملفات المستهدفة، التفاصيل التقنية، ومعايير القبول.
> مرتبطة بـ `REVAMP_PLAN.md` (الرؤية) و`BENCHMARK.md` (المراجع). آخر تحديث: يونيو 2026.

## مبادئ التنفيذ (Engineering Rules)
1. **التصميم خط أحمر**: كل شاشة جديدة تتبع نظام التصميم v3 (tokens موحّدة، RTL، i18n، لايت+دارك).
2. **لا واجهات صامتة**: كل زر/شاشة موصولة بـ `@rafeeq/api-client` فعلياً (endpoints موجودة بالكامل — تحقّقنا).
3. **التدهور الآمن (graceful degradation)**: أي فشل تكامل (خريطة/دفع/realtime) لا يكسر الشاشة (نمط `Safely` موجود).
4. **عربي + لايت ديفولت** عبر التطبيقين.
5. **تكامل بين التطبيقات**: طلب الطالب يظهر للكابتن، وحالة الكابتن تنعكس للطالب (عبر REST + Reverb realtime).
6. **commit مرقّم [RFQ-###]** + تحديث `PROGRESS.md` مع كل دفعة.

## الأساس الجاهز الذي نبني عليه (موجود فعلاً)
- **Backend غني**: 30 وحدة، endpoints كاملة للمصادقة/المواصلات/الدفع/المحفظة/طلبات الرحلة/السائق.
- **`LiveMap`** متقدّم (Google JS أو Leaflet/OSM، كابتن متحرّك، polyline، onPick) → خريطة-أولاً ممكنة فوراً.
- **`User.roles[]`** موجود بالموديل → multi-role ممكن.
- **`payments.create({purpose:'subscription', subscription_id})`** → دفع الاشتراك مدعوم، فقط غير موصول بالواجهة.
- **`StudentProfile.onboarded` + `university_id`** → onboarding ممكن عبر `profile.updateStudentProfile`.

---

## الخريطة الزمنية (7 Increments)

| # | Increment | الأثر | الخطر |
|---|-----------|-------|-------|
| 1 | نظام التصميم v3 (tokens + primitives) | عالٍ (أساس كل شي) | منخفض (إضافي) |
| 2 | Onboarding + أذونات | عالٍ (شكوى مباشرة) | منخفض (شاشات جديدة) |
| 3 | خريطة-أولاً (رئيسية الطالب + الكابتن) | عالٍ جداً (بصري) | متوسط (يستبدل home) |
| 4 | حساب موحّد متعدد الأدوار | عالٍ (شكوى الكابتن) | متوسط (backend+tests) |
| 5 | اشتراك + دفع منطقي + محفظة موحّدة | عالٍ جداً (شكوى مباشرة) | متوسط |
| 6 | تتبّع رحلة timeline + realtime | عالٍ | متوسط |
| 7 | تلميع نهائي + a11y | متوسط | منخفض |

---

## Increment 1 — نظام التصميم الموحّد v3
**الهدف:** أساس بصري متّسق وفاخر يستخدمه التطبيقان، دون كسر الموجود.
**الملفات:**
- `packages/shared/src/theme/scheme.ts` — توسيع `ThemeColors` بـ tokens دلالية (elevation/overlay/successSoft/warningSoft/dangerSoft/infoSoft/hairline/scrim).
- `packages/shared/src/theme/elevation.ts` (جديد) — مستويات ظلّ موحّدة لايت/دارك.
- `student-app/src/components/ui-kit.tsx` + `driver-app/src/components/ui-kit.tsx` (جديد) — primitives فاخرة: `PressableScale`, `Sheet` (bottom sheet), `SegmentedControl`, `Stepper`, `Chip`, `Divider`, `Skeleton`, `KeyValue`, `Sheetهيدر`.
- تحسين `Button` (إضافة variants: `solid|outline|ghost|danger` + أحجام + أيقونة) دون كسر الواجهة الحالية.
**القبول:** يبني tsc منطقياً؛ الشاشات الحالية تعمل كما هي؛ الـ primitives الجديدة جاهزة للاستخدام في Increments التالية؛ لايت+دارك صحيحان.

## Increment 2 — Onboarding + تمهيد الأذونات
**الهدف:** أول تجربة عالمية: تعريف موجز + طلب الموقع/الإشعارات في سياقها + اختيار اللغة/الجامعة.
**الملفات:**
- `student-app/app/(onboarding)/_layout.tsx` + `intro.tsx` (3 شرائح) + `permissions.tsx` (موقع/إشعارات priming) + `profile-setup.tsx` (الجامعة + نقطة الانطلاق).
- `driver-app/app/(onboarding)/...` مماثل (موقع/إشعارات + ملخّص الكابتن).
- `student-app/src/lib/permissions.ts` (جديد) — wrappers آمنة حول expo-location/expo-notifications (لا ترمي أبداً).
- `student-app/src/store/prefs.ts` — إضافة `onboardingDone` flag + ربط بـ `StudentProfile.onboarded`.
- توجيه: `app/index.tsx` → onboarding إن لم يكتمل، وإلا home.
- i18n: مفاتيح `onboarding.*`, `permissions.*` في `packages/shared/src/i18n/ar.ts|en.ts`.
**القبول:** أول فتح → شرائح → أذونات (مع شرح) → اختيار جامعة → home؛ تخطّي مسموح؛ يُطلب الموقع في سياقه؛ يعمل عربي/إنجليزي.

## Increment 3 — خريطة-أولاً
**الهدف:** الرئيسية محورها خريطة + فعل أساسي مهيمن.
**الملفات:**
- `student-app/app/(app)/home.tsx` — إعادة بناء: خريطة ملء الشاشة (`LiveMap`) + bottom `Sheet`: «إلى أين؟ (جامعتك)» + «اطلب رحلة الآن» (يستدعي `rideRequests.estimate` ثم `create`) + بطاقة الاشتراك/المحفظة مختصرة + صف خدمات أفقي. نقل الخدمات الثانوية لـ«المزيد».
- `student-app/app/(app)/services.tsx` (جديد) — صفحة الخدمات الإضافية (طرود/مفقودات/تبادل/مساعد/طوارئ/مكافآت).
- `driver-app/app/(app)/dashboard.tsx` — إعادة بناء: خريطة + مفتاح **Online/Offline** كبير + الطلب الحالي + ملخّص أرباح اليوم.
- `driver-app/src/store/availability.ts` (جديد) — حالة الاتصال + بثّ الموقع.
- i18n + تنظيف نصوص `LiveMap` العربية → مفاتيح.
**القبول:** فتح التطبيق يُظهر خريطة فوراً؛ زر واحد مهيمن؛ الكابتن يبدّل online/offline ويراها الباك إند؛ يعمل مع/بدون مفتاح خرائط (fallback).

## Increment 4 — حساب موحّد متعدد الأدوار (رقم واحد: طالب+كابتن)
**الهدف:** نفس الرقم يعمل على المنصتين بلا رفض.
**الملفات (Backend):**
- `backend/Modules/Auth/Requests/RegisterRequest.php` — عدم رفض رقم موجود عند طلب صفة كابتن.
- `backend/Modules/Auth/Services/AuthService.php` — منطق: إن وُجد المستخدم → أضف دور `driver` + أنشئ `driver_profile` (إن لم يوجد) بدل خطأ التفرّد.
- مسار `POST /v1/auth/become-driver` (أو توسيع register) + Policy.
- اختبارات: `backend/Modules/Auth/Tests/...` — «رقم طالب يصبح كابتن»، «منع تكرار driver_profile».
**الملفات (Frontend):**
- `driver-app/app/(auth)/login.tsx` + `register.tsx` — رسالة «لديك حساب رفيق؟ فعّل صفة الكابتن» بدل «الرقم مسجّل».
- `driver-app/src/store/auth.ts` — مسار التفعيل.
**القبول:** رقم مسجّل كطالب يسجّل دخول الكابتن بنجاح (بعد OTP) ويُنشأ له driver_profile؛ الاختبارات تمرّ؛ لا كسر لتسجيل جديد.

## Increment 5 — اشتراك + دفع منطقي + محفظة موحّدة
**الهدف:** مسار اشتراك واضح بخطوة دفع فعلية + مركز مالي موحّد.
**الملفات:**
- `student-app/app/(app)/subscriptions.tsx` — إعادة بناء: اختيار جامعة/مسار → خطط مفهومة (سعر/عدد رحلات/مدة) → «اشترك» → شاشة تأكيد ودفع.
- `student-app/app/(app)/checkout.tsx` (جديد) — يستدعي `transport.subscribe` ثم `payments.create({purpose:'subscription', subscription_id})` → عرض `CliqInstructions` + رفع إيصال (`submitProof`) → حالة «بانتظار التأكيد».
- `student-app/app/(app)/wallet.tsx` — مركز مالي موحّد: الرصيد + الشحن (`wallet.topupInstructions`) + العمليات (`wallet.transactions`) + طلبات الدفع (`payments.mine`) بحالة timeline.
- دمج `payments.tsx` ضمن wallet.
- i18n `subscriptions.*`, `wallet.*`, `payments.*`.
**القبول:** الطالب يشترك → يُوجَّه لدفع فعلي (CliQ/إيصال) → الاشتراك «pending» بحالة واضحة؛ المحفظة تعرض الرصيد والعمليات وطلبات الدفع؛ لا «اشتراك وهمي» بلا دفع.

## Increment 6 — تتبّع الرحلة timeline + تكامل الطلب
**الهدف:** تكامل حيّ بين الطالب والكابتن.
**الملفات:**
- `student-app/app/(app)/ride-request.tsx` + `trips.tsx` — حالة الرحلة timeline (بانتظار سائق→مُسند→بالطريق→بالرحلة→وصلت) + خريطة حيّة (`transport.tripLocation`/realtime) + كود الصعود.
- `driver-app/app/(app)/offers.tsx` + `trip/[id].tsx` — استقبال طلب من خريطة + قبول → ملاحة → إتمام.
- `student-app/src/lib/realtime.ts` / `driver-app` — قنوات Reverb للطلب/الموقع.
**القبول:** طلب الطالب يظهر للكابتن؛ قبول الكابتن ينعكس فوراً عند الطالب؛ الموقع يتحرّك حيّاً؛ يعمل بتدهور آمن لو realtime معطّل (polling).

## Increment 7 — تلميع نهائي + a11y
- `Skeleton` لكل قوائم؛ `EmptyState` موحّد؛ انتقالات؛ تدقيق تباين WCAG (4.5:1/3:1)؛ مراجعة دارك/لايت وعربي/إنجليزي لكل شاشة؛ إزالة كل النصوص الـhardcoded.
**القبول:** لا نص عربي مكتوب في الكود؛ كل شاشة تمرّ لايت+دارك+عربي+إنجليزي؛ حالات تحميل/فارغة موحّدة.

---

## ملاحظة تحقّق (مهمة)
بيئة العمل لا تشغّل تطبيقات Expo/React Native (لا node_modules). لذلك:
- الكود يُكتب متّسقاً مع الأنماط والأنواع الموجودة، ويُراجَع منطقياً.
- **التحقّق النهائي بصرياً/وظيفياً يتمّ عند المالك** عبر `expo start` بعد كل دفعة.
- نُبقي كل تغيير صغيراً وقابلاً للتراجع، ومدفوعاً تدريجياً ليراجعه المالك على GitHub.
