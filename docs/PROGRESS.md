# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| آخر تحديث | تطبيق الطالب + تطبيق الكابتن جاهزين (مصادقة + توثيق الكابتن) |
| الفرع الحالي | `foundation/phase-0-1` |
| آخر تحديث | الواجهات الثلاث جاهزة (طالب + كابتن + إدارة) — مراجعة الكباتن تعمل |
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-052 |
| المرحلة الحالية | **Phase 2 + branding/splash + بورتات منفصلة ✅ → التالي: Seeder تجريبي + صفحات إدارة النقل** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
أُنجز: الواجهات الثلاث (طالب + كابتن + **لوحة إدارة Next.js**). لوحة الإدارة فيها: دخول الموظفين، الرئيسية، قائمة الكباتن + صفحة مراجعة (عرض الوثائق + قبول/رفض كل وثيقة + اعتماد/رفض/إيقاف الكابتن)، وقائمة المستخدمين. أُضيف endpoint قائمة المستخدمين بالـ backend و AdminApi في api-client.

**التالي: Phase 2 — النقل (في الـ backend):**
1. موديول Universities (CRUD + قائمة عامة) + إضافة FK لـ `student_profiles.university_id`.
2. Areas + PickupPoints (PostGIS — يتطلب PostgreSQL؛ ملاحظة: SQLite ما بيدعم PostGIS، فننتقل لـ Postgres عبر docker لهالمرحلة).
3. Routes + RouteStops.
4. Subscriptions (+ plans) → ربط بالدفع لاحقاً.
5. Trips + TripPassengers + Trip OTP + التتبّع (Reverb).
ثم واجهات النقل في التطبيقات.

> تشغيل لوحة الإدارة: `cd frontend` ثم `npm install` ثم `npm run admin` (على http://localhost:3000). دخول بحساب الأدمن المزروع.

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

### Phase 3..7 ⏳
انظر `docs/ROADMAP.md`.

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

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
