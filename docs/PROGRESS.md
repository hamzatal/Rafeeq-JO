# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| آخر تحديث | Phase 1 backend مكتمل + Frontend foundation (student auth) |
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-019 |
| المرحلة الحالية | **Frontend foundation جارٍ → التالي: Driver app + Admin، ثم Phase 2** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
أُنجز: تطبيق الطالب (Expo) — نظام التصميم المشترك + عميل API + تدفّق المصادقة (welcome/register/OTP/login) + الرئيسية.

**التالي بالترتيب:**
1. **تطبيق الكابتن (driver-app)**: نفس بنية student-app + ثيم Navy الداكن + شاشات (تسجيل/OTP، رفع الوثائق، إضافة مركبة، شاشة "قيد المراجعة"، حالة التوثيق).
2. **لوحة الإدارة (admin-dashboard)**: Next.js + Tailwind + تسجيل دخول الموظفين + صفحات (المستخدمون، الكباتن + مراجعة الوثائق/الاعتماد).
3. شاشات الطالب الإضافية: الملف الشخصي + onboarding (اختيار الجامعة).
4. ثم **Phase 2 (النقل)** في الـ backend.

> ملاحظة تشغيل: من جذر المشروع `npm install` ثم `npm run student` (تفاصيل في docs/deployment/frontend-setup.md).

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
- ✅ packages/shared (design tokens + i18n ar/en + types + utils + constants)
- ✅ packages/api-client (typed REST client + auth API + RafeeqApiError)
- ✅ apps/student-app (Expo: RTL + Tajawal + monorepo metro + auth flow + home)
- ⏳ apps/driver-app + apps/admin-dashboard
- ⏳ CI (GitHub Actions)

### Phase 1 — الهوية والأمان ✅ (Backend)
- ✅ Auth: migrations (framework/users/otp/tokens/rbac/audit), Models, OtpService, AuthService, Requests, Resource, Controller, Routes, Provider, throttling
- ✅ Command prune-otps + Seeders (RolesPermissions + Admin)
- ✅ **Users**: ProfileService (تحديث، كلمة مرور، تغيير هاتف بـ OTP، حذف حساب) + Controller/Routes/Provider
- ✅ **Students**: student_profiles + StudentService + Controller/Resource/Routes/Provider
- ✅ **Drivers**: driver_profiles + vehicles + driver_documents + (Driver/Vehicle/Document/Review) services + رفع وثائق على disk آمن + مراجعة واعتماد إدارة + Controllers/Routes/Provider
- ⏳ شاشات Frontend للمصادقة (مع تأسيس الـ frontend)
- ⏳ Face/Liveness verification (تكامل فعلي في Phase 5 — الأعمدة جاهزة)

### Phase 2..7 ⏳
انظر `docs/ROADMAP.md` (لم تبدأ بعد).

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

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
