---
inclusion: always
---

# سياق مشروع رفيق (Rafeeq) — اقرأ أولاً

> هذا الملف يُحمَّل تلقائياً في كل جلسة. الهدف: استعادة سياق المشروع كاملاً دون إعادة شرح.

## ما هو رفيق
منصة نقل وخدمات طلابية ذكية في الأردن، مدعومة بالذكاء الاصطناعي (GPT). ليست تطبيق حجز فقط — هي:
شبكة نقل جامعية + منصة خدمات طلابية + شبكة إرسال أغراض + نظام أمان ومتابعة + مساعد ذكي + منصة إدارة للجامعات مستقبلاً.

## الفئات
طالب · كابتن (سائق معتمد) · إدارة · دعم فني · (مستقبلاً) جامعات وشركات.

## الخدمات الأساسية
1. النقل الجامعي (اشتراكات، رحلات يومية، تتبّع مباشر، تقييمات، إشعارات).
2. إرسال الأغراض (parcel) بين الجامعات/النقاط مع OTP تسليم واستلام.
3. المفقودات (Lost & Found) مع مطابقة ذكية بالـ GPT.
4. التبادل الطلابي (Campus Exchange).

## محرّك الـ AI
Rafeeq Assistant · Support Agent · Complaint Analyzer · Safety Monitor · Route Intelligence · Lost&Found Matching · Analytics · Payment Vision.

## الدفع
CliQ Jordan: إنشاء Payment Request برقم فريد (مثل RFQ-2026-83472) + مبلغ + انتهاء صلاحية، رفع إشعار التحويل، تحقق ذكي بـ GPT Vision، مركز شفافية مالية، ضمان رفيق (تذكرة تلقائية عند التأخير). مستقبلاً: Request-To-Pay → بوابة دفع → محفظة رفيق.

## الأمان (9 طبقات)
OTP → توثيق السائق → الوثائق الرسمية → Face Verification → Liveness → Trip OTP → SOS → Audit Logs → Risk Monitoring.
مبدأ: **Trust First**. لا نخزّن صور الوجه/الـ liveness — نتيجة التحقق فقط.

## التقنيات (Stack)
- Backend: Laravel 11 (PHP 8.2+) Modular Monolith. Namespaces: `Rafeeq\Core`, `Rafeeq\Shared`, `Rafeeq\Infrastructure`, `Rafeeq\Modules`, `Rafeeq\AI`.
- DB: PostgreSQL 16 + PostGIS. مفاتيح UUID. المبالغ المالية بوحدة الفلس (integer).
- Redis: cache/queue/session/broadcast. Realtime: Laravel Reverb.
- Auth: Laravel Sanctum (tokens بـ UUID).
- تطبيق الطالب + الكابتن: Expo (React Native + TypeScript) — iOS + Android + Web.
- لوحة الإدارة: Next.js + TypeScript + Tailwind.
- مشترك: `frontend/packages/shared` (design system + types + api client).
- AI: OpenAI GPT + Vision. الدفع: CliQ. الإشعارات: Firebase FCM. الخرائط: Google/Mapbox.
- عربي أولاً + RTL + ثنائي اللغة (ar/en).

## التصميم
ألوان الطالب: Primary Blue #2563EB · Royal Gold #D4A017 · Navy #0F172A · BG #F8FAFC · Surface #FFFFFF.
ألوان الكابتن: Navy #0F172A · Cards #1E293B · Gold #D4A017 · White #FFFFFF.
الخط: Tajawal (400/500/600/700/800). الأسلوب: احترافي، هادئ، رسمي، قريب من التطبيقات البنكية.

## أين تجد التفاصيل
- خطة كاملة بالتفصيل: `docs/ROADMAP.md`
- الحالة الحالية + الخطوة التالية: `docs/PROGRESS.md`
- المعمارية: `docs/architecture/system-architecture.md`
- قاعدة البيانات: `docs/database/schema.md`
- الأمان: `docs/security/security-model.md`
