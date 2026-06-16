# التشغيل المحلي — Rafeeq Backend

> هذا الدليل يشرح كيف تشغّل الـ Backend على جهازك وتجرّب نظام المصادقة (Auth).

## المتطلبات
- PHP 8.2+ مع إضافات: `pdo_pgsql`, `redis` (أو predis مثبّت عبر composer), `mbstring`, `openssl`, `bcmath`.
- Composer 2.
- Docker + Docker Compose (لتشغيل Postgres/Redis محلياً).

## 1) شغّل البنية التحتية (Postgres + Redis + MinIO + Mailpit)
من جذر المشروع:
```bash
docker compose up -d
```
يشغّل:
- PostgreSQL (PostGIS) على `localhost:5432`
- Redis على `localhost:6379`
- MinIO (تخزين) على `localhost:9000` ولوحته `localhost:9001`
- Mailpit (بريد تجريبي) على `localhost:8025`

## 2) جهّز الـ Backend
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
```

## 3) فعّل PostGIS (مرّة واحدة)
```bash
docker exec -it rafeeq_postgres psql -U rafeeq -d rafeeq -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## 4) شغّل الـ migrations + seeders
```bash
php artisan migrate --seed
```
هذا ينشئ كل الجداول ويزرع: الأدوار/الصلاحيات + مستخدم أدمن.
- هاتف الأدمن الافتراضي: `+962790000000`
- كلمة المرور: `Rafeeq@2026` (غيّرها عبر `SEED_ADMIN_PASSWORD` في `.env`).

## 5) شغّل السيرفر
```bash
php artisan serve
# API على http://localhost:8000
```

## 6) جرّب الـ API
> ملاحظة: في وضع التطوير، رمز الـ OTP يظهر في حقل `otp_debug` بالاستجابة، وأيضاً في `backend/storage/logs/laravel.log`.

**فحص الحياة:**
```bash
curl http://localhost:8000/api/v1/ping
```

**تسجيل طالب جديد:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"طالب تجريبي","phone":"0790001122"}'
```
الاستجابة تحوي `otp_debug` (الرمز).

**التحقق من الرمز (يفعّل الحساب ويرجّع توكن):**
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"0790001122","code":"<الرمز>","purpose":"register"}'
```

**جلب بياناتي (بالتوكن):**
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <التوكن>"
```

**دخول الأدمن بكلمة المرور:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0790000000","password":"Rafeeq@2026"}'
```

## أوامر مفيدة
```bash
php artisan migrate:fresh --seed   # إعادة بناء قاعدة البيانات
php artisan rafeeq:prune-otps      # تنظيف رموز OTP القديمة
php artisan tinker                 # كونسول تفاعلي
```

## مسارات Auth المتاحة (v1)
| الطريقة | المسار | الوصف | يتطلب توكن |
|---------|--------|-------|------------|
| POST | `/api/v1/auth/register` | تسجيل + إرسال OTP | لا |
| POST | `/api/v1/auth/verify-otp` | تحقق OTP + توكن | لا |
| POST | `/api/v1/auth/request-otp` | طلب OTP دخول | لا |
| POST | `/api/v1/auth/resend-otp` | إعادة إرسال OTP | لا |
| POST | `/api/v1/auth/login` | دخول بكلمة مرور | لا |
| POST | `/api/v1/auth/forgot-password` | طلب إعادة تعيين | لا |
| POST | `/api/v1/auth/reset-password` | إعادة تعيين كلمة المرور | لا |
| GET | `/api/v1/auth/me` | بياناتي | نعم |
| POST | `/api/v1/auth/logout` | خروج (الجهاز الحالي) | نعم |
| POST | `/api/v1/auth/logout-all` | خروج من كل الأجهزة | نعم |
