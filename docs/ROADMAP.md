# خارطة الطريق التفصيلية الكاملة — رفيق (Rafeeq)

> هذا هو المرجع الكامل لكل ما سيُبنى. لا يُختصر منه شيء. كل بند يجب أن يُنفّذ بالكامل.
> الحالة الحيّة لكل بند في `docs/PROGRESS.md`.

الرموز: ✅ منجز · 🔄 جارٍ · ⏳ متبقٍ

---

## نظرة عامة على البنية (Monorepo)

```
Rafeeq-JO/
├── backend/                 Laravel 11 modular monolith (API)
├── apps/
│   ├── student-app/         Expo RN (iOS/Android/Web)
│   ├── driver-app/          Expo RN (iOS/Android/Web)
│   └── admin-dashboard/     Next.js
├── packages/
│   ├── shared/              design tokens + TS types + utils
│   └── api-client/          typed REST client مشترك
├── docs/                    توثيق
├── monitoring/ · deployment/
```

---

# PHASE 0 — الأساس (Foundation)

**Backend**
- ✅ Monorepo + docker-compose (Postgres+PostGIS, Redis, MinIO, Mailpit)
- ✅ هيكل Laravel 11 (bootstrap, public, artisan, config/*)
- ✅ طبقة Core: ApiResponse, Base Controller/Service/Repository, Exceptions موحّدة, Middleware (ForceJson, SetLocale, Role, Permission, Audit)
- ✅ طبقة Shared: Enums (UserType/Status, Otp*, Driver*, Document*), trait HasUuid
- ✅ طبقة Infrastructure: SMS gateway (Log/Http) + provider
- ✅ RBAC (Role/Permission/HasRoles) + Audit logging
- ⏳ Reverb (WebSockets) config — يُفعّل في Phase 2
- ⏳ GPT client (Infrastructure/Gpt) — يُبنى في Phase 3/5
- ⏳ CI (GitHub Actions): lint (Pint) + test (PHPUnit)

**Frontend**
- ⏳ `packages/shared`: design tokens (ألوان الطالب/الكابتن، Tajawal، spacing، radii)، i18n (ar/en)، أنواع TS أساسية
- ⏳ `packages/api-client`: عميل REST نوعي (axios) + معالجة التوكن + أخطاء موحّدة
- ⏳ تهيئة الثلاث تطبيقات (Expo x2 + Next.js) مع RTL + Tajawal + ثيم

---

# PHASE 1 — الهوية والأمان (Auth & Security)

**Module: Auth** 🔄
- جداول: users, otp_codes, personal_access_tokens (UUID), framework tables, RBAC, audit_logs ✅
- Models: User (HasRoles/HasApiTokens/SoftDeletes), OtpCode, PersonalAccessToken ✅
- OtpService: إصدار/تحقق (hashed، TTL، محاولات، cooldown، إبطال السابق) ✅
- AuthService: register, verifyOtp, login (phone+password / phone+OTP), logout, refresh, me, resetPassword ⏳
- Requests: Register, VerifyOtp, ResendOtp, Login, ForgotPassword, ResetPassword, UpdateProfile ⏳
- Resources: UserResource ⏳
- Controller + Routes (`/api/v1/auth/*`) ⏳
- Command: `rafeeq:prune-otps` ⏳
- Seeders: RolesPermissions + Admin user ⏳
- Throttling على otp/login ⏳
- اختبارات Feature لكل مسار ⏳

**Module: Users** ⏳
- إدارة الملف الشخصي، تغيير الهاتف (بـ OTP)، تغيير كلمة المرور، الأفاتار، الإعدادات/اللغة، حذف الحساب (GDPR).

**Module: Students** ⏳
- student_profiles (university_id, student_number, faculty, gender, default_pickup_point, reward_tier)
- ربط الطالب بجامعة، تحديث بيانات الطالب، شاشة onboarding.

**Module: Drivers** ⏳
- driver_profiles (status, verification_level, national_id مشفّر, rating, total_trips, face/liveness verified_at)
- driver_documents (رفع/مراجعة) + Vehicles (مركبة الكابتن)
- تدفّق التوثيق: تسجيل كابتن → رفع وثائق → مراجعة إدارة → موافقة/رفض
- Face Verification + Liveness (نتيجة فقط، عبر مزوّد) — placeholder service الآن، تكامل في Phase 5

**الأمان العام** ⏳
- سياسات كلمات المرور، rate limiting، تشفير الحقول الحساسة، Audit شامل.

**Frontend (auth screens)** ⏳
- الطالب: Splash, Onboarding, تسجيل/دخول بالهاتف, OTP, اختيار الجامعة, إكمال الملف.
- الكابتن: تسجيل, OTP, رفع الوثائق, شاشة "قيد المراجعة", حالة التوثيق.
- Admin: تسجيل دخول الموظفين, إدارة المستخدمين/الكباتن, مراجعة الوثائق.

---

# PHASE 2 — النقل (Mobility — قلب المنصة)

**Module: Universities** ⏳
- universities (name_ar/en, code, city, location[PostGIS], logo, is_active, contact)
- CRUD (admin)، قائمة عامة للطلاب.

**Module: Areas** ⏳
- areas (محافظة/منطقة, name_ar/en, polygon[PostGIS])، ربط بنقاط التجمّع.

**Module: PickupPoints** ⏳
- pickup_points (name, location[Point], area_id, university_id?, landmark)، قرب جغرافي (nearby).

**Module: Routes** ⏳
- routes (university_id, name, from_area, to_university, schedule, price_fils, capacity, active)
- route_stops (route_id, pickup_point_id, order, eta)
- Route Intelligence (Phase 5) يقترح أفضل مسار/نقطة.

**Module: Subscriptions** ⏳
- subscription_plans (route_id/university, type[monthly/term/weekly], price_fils, rides_count|unlimited)
- subscriptions (student_id, plan_id, status[pending/active/expired/cancelled], starts/ends, remaining_rides)
- تدفّق: اختيار خطة → إنشاء اشتراك pending → دفع (Phase 3) → تفعيل.
- تجديد، إيقاف، تجميد، استرداد.

**Module: Trips** ⏳
- trips (route_id, driver_id, vehicle_id, scheduled_at, status[scheduled/started/completed/cancelled], started/ended_at)
- trip_passengers (trip_id, student_id, subscription_id, pickup_point_id, status[booked/onboard/dropped/no_show], boarded_at)
- trip_tracking (trip_id, location[Point], speed, recorded_at) — بث لحظي عبر Reverb
- Trip OTP: كود لكل راكب لتأكيد الصعود (طبقة أمان 6).
- تدفّق الكابتن: بدء الرحلة → قائمة الركاب → تأكيد صعود (OTP) → ملاحة → إنهاء.
- تدفّق الطالب: رحلتي القادمة → تتبّع الكابتن مباشر → كود الصعود → تقييم بعد الانتهاء.

**Module: Ratings** ⏳
- ratings (trip_id, student_id, driver_id, stars, comment) → تحديث متوسط الكابتن.

**Realtime** ⏳
- Reverb channels: `trip.{id}` (موقع/حالة)، `user.{id}` (إشعارات).

**Frontend** ⏳
- الطالب: الرئيسية، الاشتراكات (تصفّح/شراء/إدارة)، رحلاتي، تتبّع مباشر بالخريطة، كود الصعود، التقييم.
- الكابتن: لوحة اليوم، رحلاتي، قائمة الركاب، تأكيد الصعود، الملاحة، إنهاء الرحلة.
- Admin: الجامعات، المناطق، نقاط التجمّع، المسارات، الاشتراكات، الرحلات (مراقبة حيّة).

---

# PHASE 3 — الدفع (Payments — CliQ + GPT Vision)

**Module: Payments** ⏳
- payment_requests (number[RFQ-YYYY-#####], payable[subscription/parcel/...], amount_fils, status[pending/submitted/under_review/approved/rejected/expired], expires_at)
- payments (payment_request_id, method[cliq], proof_path, extracted{amount,time,ref}, verified_by[ai|admin], approved_at)
- تدفّق: إنشاء طلب → عرض تعليمات CliQ → رفع إشعار التحويل → فحص GPT Vision → اعتماد تلقائي/شبه تلقائي → تفعيل المدفوع له.
- ضمان رفيق: تذكرة دعم تلقائية عند تأخّر الاعتماد.
- idempotency + audit كامل + مراجعة بشرية fallback.

**GPT Vision (Infrastructure/Gpt + AI/Vision/PaymentVerification)** ⏳
- تحليل صورة التحويل: المبلغ، الوقت، رقم الطلب، اسم المستفيد → درجة ثقة → قرار.

**مركز الشفافية المالية** ⏳
- للطالب: كل عملياته (رقم/حالة/وقت دفع/وقت اعتماد/سجل).
- للإدارة: طابور المراجعة، اعتماد/رفض يدوي، تقارير.

**Module: Wallet (تأسيس)** ⏳
- wallets + wallet_transactions (تُفعّل كميزة لاحقاً؛ تأسيس الجداول الآن).

**Frontend** ⏳
- الطالب: شاشة الدفع، تعليمات CliQ، رفع الإشعار، حالة الطلب، سجل المدفوعات.
- Admin: طابور المراجعة، تفاصيل العملية + صورة + استخراج AI، اعتماد/رفض، تقارير مالية.

---

# PHASE 4 — الخدمات الإضافية (Parcels · Lost&Found · Rewards)

**Module: Parcels** ⏳
- parcels (sender_id, receiver{name,phone}, from_point, to_point, category, description, size, fee_fils, status[created/awaiting_pickup/in_transit/delivered/cancelled])
- parcel_events (parcel_id, type, actor, location, at) — chain of custody
- OTP عند التسليم للكابتن + OTP عند الاستلام من المستلم.
- سياسة الممنوعات + إقرار مسؤولية.
- ربط بالرحلات (الكابتن يحمل الطرد ضمن مساره).

**Module: LostFound** ⏳
- lost_found_items (type[lost/found], category, title, description, images, location, status[open/matched/resolved])
- lost_found_matches (lost_id, found_id, score) — مطابقة ذكية GPT (Phase 5).

**Module: Rewards (Rafeeq Rewards)** ⏳
- reward_accounts (user_id, tier[bronze/silver/gold/platinum], points)
- reward_transactions (earn/redeem, points, reason)
- قواعد الكسب (رحلة مكتملة، إحالة، ...) + المكافآت (خصومات/أولوية دعم).

**Module: Exchange (Campus Exchange)** ⏳
- exchange_items (owner, type[book/notes/tool], title, condition, images, status[available/reserved/closed]) + طلبات التبادل.

**Frontend** ⏳
- الطالب: إرسال طرد، تتبّع الطرد، المفقودات (إبلاغ/تصفّح/مطابقة)، النقاط والمستويات، التبادل.
- الكابتن: الطرود المسندة، استلام/تسليم بـ OTP.
- Admin: الطرود، المفقودات، النقاط، التبادل.

---

# PHASE 5 — الذكاء الاصطناعي (AI Engine)

**Infrastructure/Gpt** ⏳ — عميل OpenAI (chat + vision) + ضوابط تكلفة + تتبّع توكنز + caching + moderation.

**AI/Assistants** ⏳
- RafeeqAssistant (مساعد الطالب: أسئلة/اشتراكات/توجيه) + سجل المحادثات (ai_conversations/ai_messages).
- SupportAssistant (تحليل التذاكر، تصنيف، اقتراح حل).
- ComplaintAssistant (تحليل شكوى، تحديد خطورة، تقرير).
- PaymentAssistant (مساعدة الدفع).
- ParcelAssistant · LostFoundAssistant · AnalyticsAssistant.

**AI/Prompts** ⏳ — قوالب مُدارة بإصدارات لكل مساعد.

**AI/Vision** ⏳ — PaymentVerification (مُفعّل Phase 3)، DriverVerification (وثائق)، ComplaintImages، ParcelInspection.

**AI/Moderation · Classification · RecommendationEngine · RouteIntelligence · SafetyMonitoring · AIAnalytics** ⏳
- Safety Monitor: مراقبة تقييمات/شكاوى/تأخير/إلغاءات → أنماط خطرة → تنبيه.
- Route Intelligence: أفضل نقطة/مسار/كابتن/وقت.

**Frontend** ⏳ — شاشة مساعد رفيق (chat) في الطالب والكابتن، ودمج AI في الدعم/الشكاوى بالـ admin، ومركز AI بالـ admin.

---

# PHASE 6 — الدعم والشكاوى والإدارة (Support · Complaints · Admin · Analytics)

**Module: Support** ⏳
- support_tickets (user, category[subscription/trip/payment/driver/student/technical/parcel/pickup], status, priority, level[1-4])
- ticket_messages (ticket, sender, body, attachments)
- تصعيد: L1 Rafeeq AI → L2 موظف → L3 مشرف → L4 إدارة.

**Module: Complaints** ⏳
- complaints (against[driver/student], reporter, category, severity[low/medium/high/critical], status, ai_report)
- في الحرج (تحرش/عنف/تهديد): تجميد الحساب فوراً + فتح تحقيق + إشعار الإدارة.

**Module: Notifications** ⏳
- notifications (user, type, title, body, data, read_at) + قنوات: DB + FCM push + (email).
- تفضيلات الإشعارات لكل مستخدم.

**Module: Analytics + Reports** ⏳
- لوحات: مستخدمون، كباتن، اشتراكات، رحلات، طرود، شكاوى، مدفوعات، إيرادات، AI.
- تقارير قابلة للتصدير + AI Analytics.

**Module: Settings** ⏳ — إعدادات منصة عامة (أسعار، سياسات، نصوص، feature flags).

**Module: AuditLogs (واجهة)** ⏳ — عرض/بحث سجل التدقيق للإدارة.

**Admin Dashboard (كامل)** ⏳
- layouts + auth + كل الصفحات: dashboard, users, students, drivers, universities, routes, subscriptions, trips, parcels, lost-found, payments, rewards, complaints, support, ai-center, analytics, notifications, audit-logs, settings, permissions.

---

# PHASE 7 — الإطلاق (Launch Hardening)

**Module: Safety/SOS** ⏳
- sos_incidents (user, trip?, location, status) — زر طوارئ: إرسال الموقع + بيانات الرحلة + فتح حادثة + إشعار إدارة فوري.
- risk_flags (مصدر، نوع، خطورة) من Safety Monitor.

**التجهيز للنشر** ⏳
- Security review، rate limits، backups، health-checks، logging/monitoring (monitoring/).
- Dockerfiles + بيئات (development/staging/production)، نشر، disaster-recovery.
- App store / Play store assets للتطبيقات. PWA للويب.
- اختبارات شاملة (unit/feature/e2e) + تحميل.
- توثيق API كامل (OpenAPI) + Postman collection.
- سياسات قانونية: خصوصية، شروط، ممنوعات الطرود، احتفاظ بيانات.

---

## معايير القبول العامة لكل موديول
1. Migrations + Models + Enums كاملة.
2. Service يحوي كل المنطق + Repository + Requests + Resources.
3. Endpoints موثّقة + محميّة بالصلاحيات + throttling عند اللزوم.
4. عمليات حساسة في audit_logs.
5. اختبارات Feature تغطّي المسارات الأساسية.
6. واجهات Frontend المرتبطة + ربط فعلي بالـ API.
7. تحديث PROGRESS.md + README.md + commit مرقّم.
