# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| آخر تحديث | Phase 1 — مكتمل (Backend) |
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-010 |
| المرحلة الحالية | **Phase 1 منتهٍ (backend) → التالي: Frontend foundation ثم Phase 2** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
خياران (يُفضّل تنفيذهما بالترتيب):

**أ) تأسيس الـ Frontend (إكمال Phase 0 frontend):**
1. `packages/shared`: design tokens (ألوان الطالب/الكابتن، Tajawal، spacing) + i18n (ar/en) + أنواع TS.
2. `packages/api-client`: عميل REST نوعي + إدارة توكن Sanctum + أخطاء موحّدة.
3. تهيئة `apps/student-app` و`apps/driver-app` (Expo + RTL + Tajawal) + `apps/admin-dashboard` (Next.js).
4. شاشات المصادقة (تسجيل/OTP/دخول) للطالب والكابتن + دخول الأدمن.

**ب) أو ابدأ Phase 2 (النقل) في الـ backend:**
موديولات Universities → Areas → PickupPoints → Routes → Subscriptions → Trips (+ Reverb realtime).
أضف FKs لـ `student_profiles.university_id` و`default_pickup_point_id` عند إنشاء جداول Phase 2.

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
- ⏳ packages/shared + packages/api-client
- ⏳ تهيئة Expo x2 + Next.js
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

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
