# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/HANDOFF.md` (ملخّص شامل) و`docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-085 |
| نسبة الإنجاز | ~59% (الأساس/القلب التشغيلي ~90%) |
| المرحلة الحالية | **إصلاحات frontend (لوجو أردني/سبلاش سيارة/لغة/راوتنج الأدمن/مشكلة فتح الكابتن) — التالي: M3** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
**أُنجز (M1+M2 backend):** موديول **Payments** (CliQ + GPT Vision)، موديول **Notifications** (FCM + SMS fallback)، موديول **Ratings** (تقييم ثنائي)، وبنية **Infrastructure/Gpt** + **Infrastructure/Push**. الإشعارات مربوطة بتدفقات الدفع/الرحلة/الطوارئ. راجع `docs/EXECUTION_PLAN.md` للخطة الكاملة M1–M10.

**التالي — M3 (التتبّع الحيّ + الخرائط + Express):**
1. عميل **Echo/Reverb** في تطبيقي الطالب والكابتن + خريطة حيّة (الطالب يتابع الكابتن، الكابتن يبث GPS، الإدارة خريطة الرحلات).
2. **Express**: تسعير ديناميكي ضمن سقف + min-fill + معاينة أرباح الكابتن.
3. ثم **واجهات Frontend** للدفع (طالب/إدارة) + الإشعارات + التقييم.

> التكاملات اليدوية المطلوبة لتشغيل M1/M2 فعلياً: `OPENAI_API_KEY` (للـ Vision)، `FIREBASE_*` (للـ FCM)، `CLIQ_*` (تعليمات التحويل)، `SMS_*` (fallback). كلها اختيارية — بدونها يعمل النظام عبر المراجعة اليدوية + الإشعار داخل التطبيق + سجل log. التفاصيل في `docs/HANDOFF.md`.

---

## لوحة التقدّم

### Phase 0 — الأساس (backend ✅ / frontend ⏳)
- ✅ Monorepo, docker-compose, .gitignore, README, editorconfig
- ✅ هيكل Laravel 11 (bootstrap/app.php, providers, public/index.php, artisan)
- ✅ config/* (app, auth, database, cache, queue, session, sanctum, services, cors, filesystems, logging, otp)
- ✅ Core (ApiResponse, Controller, Service, Repository, Exceptions, Middleware)
- ✅ Shared (Enums + HasUuid + Phone helper)
- ✅ Infrastructure (SMS gateways + provider)
- ✅ RBAC (Role/Permission/HasRoles) + Audit (model+logger) + migrations
- ✅ frontend/packages/shared (design tokens + i18n ar/en + types + utils + validators)
- ✅ frontend/packages/api-client (typed REST client + auth/profile/driver APIs + RafeeqApiError)
- ✅ frontend/student-app (Expo: RTL + Tajawal + monorepo metro + auth flow + home)
- ✅ frontend/driver-app (Expo Navy: auth + documents upload + vehicle + submit-for-review + status)
- ✅ **إعادة هيكلة:** الجذر صار frontend/ (workspace JS) + backend/ (Laravel)
- ✅ frontend/admin-dashboard (Next.js + Tailwind: دخول موظفين + مراجعة/اعتماد الكباتن + قائمة المستخدمين)
- ⏳ CI (GitHub Actions)

### Phase 1 — الهوية والأمان ✅ (Backend)
- ✅ Auth: migrations (framework/users/otp/tokens/rbac/audit), Models, OtpService, AuthService, Requests, Resource, Controller, Routes, Provider, throttling
- ✅ Command prune-otps + Seeders (RolesPermissions + Admin)
- ✅ **Users**: ProfileService (تحديث، كلمة مرور، تغيير هاتف بـ OTP، حذف حساب) + Controller/Routes/Provider
- ✅ **Students**: student_profiles + StudentService + Controller/Resource/Routes/Provider
- ✅ **Drivers**: driver_profiles + vehicles + driver_documents + (Driver/Vehicle/Document/Review) services + رفع وثائق على disk آمن + مراجعة واعتماد إدارة + Controllers/Routes/Provider
- ⏳ شاشات Frontend للمصادقة (مع تأسيس الـ frontend)
- ⏳ Face/Liveness verification (تكامل فعلي في Phase 5 — الأعمدة جاهزة)

### Phase 2 — النقل 🔄
- ✅ **Universities** (backend): migration + model + service + CRUD admin + public list + 7 جامعات أردنية مزروعة. شامل: shared type + api-client (catalog + admin CRUD) + صفحة الجامعات في لوحة الإدارة.
- ✅ **Areas** (backend): CRUD admin + قائمة عامة (name_ar/en, governorate, lat/lng).
- ✅ **PickupPoints** (backend): CRUD admin + قائمة عامة + فلترة بالمنطقة/الجامعة (FK لـ areas + universities).
- ✅ **Routes + RouteStops** (backend): مسار (جامعة + منطقة + سعر بالفلس + سعة + أيام + وقت) مع محطات مرتّبة (نقاط تجمّع) — CRUD admin (مع مزامنة المحطات في transaction) + قائمة/تفاصيل للطلاب.
- ✅ **Subscriptions** (backend): خطط (weekly/monthly/term + سعر + عدد رحلات/غير محدود + مدة) + اشتراك الطالب (pending→active→expired/cancelled) + تفعيل (بعد الدفع) + استهلاك رحلة. CRUD خطط للإدارة + اشتراكاتي للطالب + إدارة.
- ✅ **Trips** (backend - قلب النظام): جدولة رحلة (كابتن معتمد) + بدء/إنهاء/إلغاء + حجز الطالب (يتطلب اشتراك فعّال + فحص السعة) + **Trip OTP** (كود صعود لكل راكب) + تأكيد الصعود من الكابتن (يستهلك رحلة) + تتبّع الموقع (trip_tracking, polling الآن).
- ⏳ Reverb (بث لحظي) — لاحقاً (حالياً polling عبر `/trips/{id}/location`)
- ✅ **واجهة الطالب للنقل:** شاشة الاشتراكات (تصفّح الخطط + اشتراك + اشتراكاتي) + شاشة الرحلات (رحلاتي مع كود الصعود + رحلات متاحة + حجز + تتبّع الموقع) + ربط من الرئيسية.
- ✅ **واجهة الكابتن للنقل:** شاشة رحلاتي (جدولة باختيار مسار + وقت) + تفاصيل الرحلة (بدء/إنهاء/إلغاء + قائمة ركاب + تأكيد صعود بالكود Trip OTP).
- ✅ توسعة api-client: TransportApi + DriverTripsApi + catalog.listRoutes + الأنواع المشتركة.
- ⏳ صفحات الإدارة للنقل (Routes/Plans/Subscriptions/Trips) في لوحة Next.js
- ملاحظة: نستخدم lat/lng (decimal) بدل PostGIS حالياً ليبقى SQLite شغّال؛ PostGIS لاحقاً للاستعلامات المكانية المتقدّمة.

### Phase 3 — الدفع ✅ (backend)
- ✅ **Infrastructure/Gpt**: عميل OpenAI (chat + vision) عبر `GptClient` + `OpenAiGptClient` (HTTP) + `NullGptClient` (fallback آمن بدون مفتاح → مراجعة يدوية). مربوط في `InfrastructureServiceProvider`.
- ✅ **Payments** (backend كامل): `payment_requests` (رقم `RFQ-YYYY-#####` تسلسلي) + `payments` (إشعار التحويل + استخراج + درجة ثقة). تدفّق: إنشاء طلب → تعليمات CliQ → رفع إشعار التحويل → **تحقق GPT Vision** → اعتماد تلقائي عند تطابق واثق وإلا طابور مراجعة بشرية → **تفعيل تلقائي** (شحن المحفظة عبر `WalletService` / تفعيل الاشتراك عبر `SubscriptionService`). يعمل بالكامل بدون مفتاح AI عبر المراجعة اليدوية. صلاحيات `payments.view`/`payments.approve`.
- ⏳ واجهات الطالب/الإدارة للدفع (Frontend) + مركز الشفافية المالية (UI)

### Phase 6 (جزء) — الإشعارات + التقييم ✅ (backend)
- ✅ **Infrastructure/Push**: `PushGateway` + `FcmPushGateway` (Firebase HTTP v1 مع OAuth2/JWT من service-account) + `LogPushGateway` (fallback).
- ✅ **Notifications**: `rafeeq_notifications` + `notification_preferences` (تفضيلات لكل مستخدم؛ السلامة لا تُعطَّل) + `device_tokens`. `NotificationService.notify()`: **دائماً DB** + **FCM** عند التفعيل + **SMS fallback** للحرج (طوارئ/تجميد/إلغاء رحلة). لا يرمي استثناء أبداً (لا يكسر معاملة العمل).
- ✅ **Ratings**: `ratings` (تقييم ثنائي طالب↔كابتن، نجمة لكل رحلة/مقيّم/اتجاه) + تحديث `rating_avg`/`rating_count` للكابتن تلقائياً.
- ✅ **الربط**: الدفع (اعتماد/رفض/تفعيل) + الرحلة (اكتمال → دعوة تقييم، إلغاء → إشعار الركّاب) + الطوارئ (تأكيد للمستخدم + تنبيه فريق السلامة).

### Phase 4/5/7 المتبقّية ⏳
انظر `docs/ROADMAP.md` و`docs/EXECUTION_PLAN.md` (M3–M10).

### Phase 3..7 (سابقاً) ⏳
انظر `docs/ROADMAP.md`.

### ملحق A — Zone Pooling + مكافحة الاحتيال (مُعتمد، قيد التنفيذ) 🔄
- ✅ سيارات لا باصات: السعات أصبحت 4 (افتراضي) / 7 (أقصى) لكل من vehicles/routes/trips.
- ✅ **Zones** (backend): جدول + نموذج + أقرب-منطقة (Haversine) + CRUD + بذور 6 مناطق إربد.
- ✅ **RideRequests** (backend): طلب باب لباب (إحداثيات البيت → الجامعة) + تعيين الزون تلقائياً + علم express + APIs (طالب: إنشاء/طلباتي/إلغاء، إدارة: قائمة).
- ✅ توسعة `trip_passengers`: pickup_lat/lng + pickup_order + dropoff_code + dropoff_confirmed_at (OTP إنزال).
- ⏳ **محرّك التجميع (Pooling/Matching)** — التالي
- ✅ **محرّك التجميع (Matching)**: يجمّع الطلبات (زون+جامعة) برحلات بحجم السيارة (4) بحالة "بانتظار كابتن" + أمر مجدول `rafeeq:match-rides` (كل 5 دقائق) + زر تشغيل للإدارة + **عروض للكابتن (offers) وقبولها (accept)**. الرحلات صارت تدعم نوعين: scheduled / pooled (مسار وكابتن اختياري).
- ✅ **المحفظة مسبقة الدفع (Wallet)**: wallets + wallet_transactions (رصيد بالفلس، حركات موقّعة، قفل صفّي آمن) + رصيدي/حركاتي + تعليمات شحن CliQ + اعتماد شحن من الإدارة. (الكابتن يُدفع من المنصة لاحقاً عند ربط الدفع بالرحلات.)
- ⏳ المحفظة + احتساب العمولة عند إكمال الرحلة (ربط الدفع بالرحلات)
- ✅ **دورة المال**: عند تأكيد الصعود يُخصم من محفظة الطالب (إن لم يكن لديه اشتراك)، تُحجز عمولة المنصة (config: نسبة العمولة + الأجرة الافتراضية)، ويُحاسب الكابتن (يُضاف لمحفظته) — الأموال تمرّ عبر المنصة دائماً (RideBillingService).
- ✅ **التتبّع الحيّ (Reverb)**: أحداث بث `TripLocationUpdated` + `TripStatusChanged` على قناة `trip.{id}` (تُطلق عند بثّ الموقع/بدء/إنهاء/إلغاء). الافتراضي broadcast=log (آمن بدون سيرفر)؛ يُفعّل بـ reverb.
- ✅ **أساس مكافحة الاحتيال (Safety)**: جداول `risk_flags` + `cancellation_logs` + كشف بقواعد (كابتن يلغي رحلة فيها ركّاب، معدّل إلغاء عالٍ) → علامات خطورة، + واجهة إدارة (عرض/معالجة العلامات + سجل الإلغاءات). تسجيل الإلغاء مربوط بـ TripService.
- ⏳ التتبّع الحيّ (Reverb) عميل Echo + الخرائط (دليل لاحقاً) + Express dynamic pricing + min-fill
- ⏳ AI Fraud Monitor (تحليل ذكي فوق الأساس) + Risk Score مجمّع + مركز النزاعات
- ⏳ مزايا: نسائي، No-show، تقييم ثنائي، حوافز، مشاركة الرحلة، SMS fallback

---

## ملاحظات تقنية مهمة للاستئناف
- مفاتيح UUID عبر `HasUuid`. Sanctum يستخدم `PersonalAccessToken` بـ UUID (ignoreMigrations + usePersonalAccessTokenModel في AuthServiceProvider).
- كل موديول يُسجّل في `backend/bootstrap/providers.php` ويحمّل routes/migrations من مجلده.
- المسارات: `/api/v1/...`. مجموعات: auth (عام + throttle:auth)، profile/student/driver (auth:sanctum + role)، admin/drivers (permissions).
- `student_profiles.university_id` و`default_pickup_point_id` بدون FK حالياً — تُضاف في Phase 2.
- وثائق الكباتن تُخزّن على disk `secure` (S3/MinIO) وتُعرض عبر temporaryUrl.
- لم يُشغّل `composer install` (لا إنترنت في بيئة البناء) — كل ملفات PHP فُحصت بـ `php -l`.

## سجل الـ Commits
| RFQ | الوصف |
|-----|-------|
| 001 | infra: monorepo scaffolding + docker-compose + root configs |
| 002 | docs: business/architecture/database/security documentation |
| 003 | feat: Laravel 11 backend foundation (Core/Shared/Infrastructure + config) |
| 004 | feat: RBAC + audit logging + platform migrations |
| 005 | feat(auth): complete Auth module (OTP, register/login, password reset, seeders) |
| 006 | docs: detailed roadmap + progress tracker + steering + local-setup guide |
| 007 | feat(users): profile module (update, password, phone change via OTP, delete) |
| 008 | feat(students): student profile module |
| 009 | feat(drivers): driver profiles + vehicles + documents + admin review/approval |
| 010 | docs: update progress for Users/Students/Drivers modules |
| 011 | fix(auth): Sanctum 4 compatibility — remove removed ignoreMigrations() call |
| 012 | docs: Windows/PowerShell + SQLite no-Docker quick-start guide |
| 013 | feat(shared): design system + i18n (ar/en) + types + utils + constants |
| 014 | feat(api-client): typed REST client + auth API + error handling |
| 015 | feat(student-app): Expo scaffold (RTL/Tajawal/monorepo) + auth flow + home |
| 016 | docs: frontend setup guide + progress update |
| 017 | fix(cors+web): allow Expo dev origins (8081) + inline error banners (Alert fails on web) |
| 018 | docs: code map (navigation guide) for clearer structure |
| 019 | fix(db): sqlite database path fallback when DB_DATABASE is a Postgres name |
| 020 | feat(shared+api): modern validators + ProfileApi/DriverApi + driver i18n + payloads |
| 021 | feat(driver-app): Expo driver app (Navy) — auth + document upload + vehicle + review status |
| 022 | docs: driver app setup + progress update |
| 023 | refactor: restructure root into frontend/ (JS workspace) + backend/ (Laravel) |
| 024 | fix(storage): secure disk defaults to local (fixes flysystem S3 crash) + admin document download stream |
| 025 | change(drivers): require only national ID + driving license (dropped vehicle reg & insurance) |
| 026 | chore: remove empty scaffolding dirs (monitoring/deployment/storage) — declutter root |
| 027 | feat(backend): admin users listing endpoint (Users module) |
| 028 | feat(api-client): AdminApi (drivers review, users, secure document preview) |
| 029 | feat(admin-dashboard): Next.js admin — login + drivers review/approve + users list |
| 030 | docs: admin dashboard setup + progress update |
| 031 | fix(auth): disable stateful API mode (fixes "CSRF token mismatch" on admin login) |
| 032 | feat(universities): backend module — CRUD + public list + seed 7 Jordanian universities |
| 033 | feat(frontend): University type + api-client (catalog + admin CRUD) + admin universities page |
| 034 | docs: progress update — Phase 2 started (universities) |
| 035 | feat(areas): backend module — CRUD admin + public list |
| 036 | feat(pickup-points): backend module — CRUD + public list + area/university filters |
| 037 | docs: progress update — areas + pickup points |
| 038 | feat(routes): backend module — routes + ordered stops, CRUD admin + public list/show |
| 039 | docs: progress update — routes |
| 040 | feat(subscriptions): plans + student subscriptions (pending/active) + activate/consume ride |
| 041 | feat(trips): trips + passengers + Trip OTP boarding + live tracking (driver & student APIs) |
| 042 | docs: progress update — subscriptions + trips (Phase 2 backend complete) |
| 043 | feat(shared+api): transport types + TransportApi + DriverTripsApi + catalog routes |
| 044 | feat(student-app): subscriptions + trips screens (book, boarding code, live location) + home nav |
| 045 | feat(driver-app): trips list + scheduling + trip detail (start/end + Trip OTP boarding) |
| 046 | docs: progress update — transport UIs (student + driver) |
| 047 | feat(universities): seed Irbid universities (Yarmouk, JUST, INU, Jadara) |
| 048 | feat(brand): Rafeeq logo (SVG) + branded splash screens (student + driver) |
| 049 | docs: progress update — Irbid universities + branding |
| 050 | fix(frontend): distinct dev ports (student 8081, driver 8082) — fixes cache/origin collision |
| 051 | feat(splash): animated branded splash per app (student road, driver map, admin analytics) + admin splash |
| 052 | docs: ports + splash notes + progress update |
| 053 | docs: roadmap appendix — zone pooling, express, realtime, anti-fraud, wallet |
| 054 | chore(transport): car-sized capacities (default 4, max 7) for vehicles/routes/trips |
| 055 | feat(zones): zones module + nearest-zone matching (Haversine) + seed 6 Irbid zones |
| 056 | feat(ride-requests): door-to-door requests (auto zone + express) + passenger pickup coords + drop-off OTP |
| 057 | docs: progress update — Zone Pooling foundation (appendix A) |
| 058 | feat(matching): pooling engine (zone+university) + scheduled command + admin trigger + driver offers/accept |
| 059 | feat(wallet): prepaid wallet + transactions + CliQ top-up instructions + admin credit |
| 060 | docs: progress update — matching + wallet |
| 061 | feat(brand): premium world-class logo (mark + wordmark + admin favicon) |
| 062 | feat(shared): light/dark theme system (buildTheme) + settings i18n |
| 063 | feat(student-app): full light/dark + ar/en toggle + Settings screen |
| 064 | feat(driver-app): full light/dark + ar/en toggle + Settings screen |
| 065 | feat(admin): light/dark + ar/en toggle + Topbar + new logo/favicon |
| 066 | docs: progress update — branding + theming across all apps |
| 067 | feat(billing): ride payment + commission + captain earnings via wallet (money loop) |
| 068 | feat(realtime): Reverb broadcasting events (trip location + status) |
| 069 | feat(safety): anti-fraud foundation — risk flags + cancellation logs + detection + admin |
| 070 | docs: progress update — money loop + realtime + anti-fraud |
| 071 | feat(brand): brand-new circular emblem logo (ر lettermark + orbit ring) everywhere |
| 072 | feat(safety/sos): emergency SOS button + incidents + admin handling + critical flag |
| 073 | docs: full HANDOFF summary (done + remaining + integrations) for session continuity |
| 074 | docs: master EXECUTION_PLAN (M1–M10) + feat(infra/gpt): OpenAI chat+vision client + safe null fallback |
| 075 | feat(payments): payment_requests + payments migrations/enums/models (CliQ + RFQ-YYYY-##### numbering) |
| 076 | feat(payments): GPT-Vision proof verification + PaymentService (auto-approve / manual review / fulfil subscription+wallet) |
| 077 | feat(payments): controller + requests + resources + routes + provider (payer + admin review queue) |
| 078 | feat(notifications): FCM push infra + notifications/preferences/device-tokens + SMS fallback service & API |
| 079 | feat(ratings): two-way ratings + driver average + wire notifications into payment/trip/SOS flows |
| 080 | fix(frontend): isolate Metro cache per app (cacheVersion + EXPO_ROUTER_APP_ROOT) — student no longer opens driver app |
| 081 | fix(admin): dashboard routing — home at `/` + remove duplicate root page + correct redirects/links (fixes 404) |
| 082 | feat(brand): brand-new Jordan-inspired logo (uppercase R + رفيق + seven-pointed star + flag colors) across mark/wordmark/full/favicon |
| 083 | feat(splash): car driving along the road (student + driver + admin) replacing the moving dot |
| 084 | fix(i18n): wire hardcoded Arabic strings to dictionary (home/welcome/subscriptions/trips) + expand ar/en — fixes mixed-language UI |
| 085 | chore(security+deps): SECURITY.md review + align TypeScript ~5.3.3 + admin Accept-Language from prefs |

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
