# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| آخر تحديث | Phase 1 — جارٍ |
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-006 |
| المرحلة الحالية | **Phase 1 — الهوية والأمان** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
إكمال موديول **Auth**:
1. `AuthService` (register, verifyOtp, login, logout, me, forgot/reset password).
2. Requests + `UserResource` + `AuthController` + `Routes/api.php`.
3. `AuthServiceProvider` (تحميل routes/migrations، Sanctum ignoreMigrations + usePersonalAccessTokenModel، throttling).
4. Command `rafeeq:prune-otps` + Seeders (RolesPermissions + Admin).
5. تسجيل `AuthServiceProvider` في `bootstrap/providers.php` (مسجّل مسبقاً).
6. ثم: موديولات Users / Students / Drivers (Phase 1).

---

## لوحة التقدّم

### Phase 0 — الأساس ✅ (يكتمل مع تهيئة الـ frontend)
- ✅ Monorepo, docker-compose, .gitignore, README, editorconfig
- ✅ هيكل Laravel 11 (bootstrap/app.php, providers, public/index.php, artisan)
- ✅ config/* (app, auth, database, cache, queue, session, sanctum, services, cors, filesystems, logging, otp)
- ✅ Core (ApiResponse, Controller, Service, Repository, Exceptions, Middleware)
- ✅ Shared (Enums + HasUuid)
- ✅ Infrastructure (SMS gateways + provider)
- ✅ RBAC (Role/Permission/HasRoles) + Audit (model+logger) + migrations
- ⏳ packages/shared + packages/api-client (design tokens, i18n, types)
- ⏳ تهيئة Expo x2 + Next.js
- ⏳ CI (GitHub Actions)

### Phase 1 — الهوية والأمان 🔄
- ✅ migrations: framework, users, otp_codes, personal_access_tokens, rbac, audit
- ✅ Models: User, OtpCode, PersonalAccessToken
- ✅ OtpService
- 🔄 AuthService / Requests / Resource / Controller / Routes / Provider
- ⏳ Command prune-otps + Seeders
- ⏳ Module Users / Students / Drivers
- ⏳ شاشات Frontend للمصادقة

### Phase 2..7 ⏳
انظر `docs/ROADMAP.md` (لم تبدأ بعد).

---

## سجل الـ Commits
| RFQ | الوصف |
|-----|-------|
| 001 | infra: monorepo scaffolding + docker-compose + root configs |
| 002 | docs: business/architecture/database/security documentation |
| 003 | feat: Laravel 11 backend foundation (Core/Shared/Infrastructure + config) |
| 004 | feat: RBAC + audit logging + platform migrations |
| 005 | feat(auth): complete Auth module (OTP, register/login, password reset, seeders) |
| 006 | docs: detailed roadmap + progress tracker + steering + local-setup guide |

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
