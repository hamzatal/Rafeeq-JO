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


---

## 🪟 تشغيل سريع على Windows (PowerShell) بدون Docker

> هذا أسرع طريق لتشغيل الـ Backend وتجربته. يستخدم SQLite بدل PostgreSQL (لا حاجة لـ Docker).
> ملاحظة: ميزات الخرائط الجغرافية (PostGIS) في Phase 2 ستحتاج PostgreSQL لاحقاً — لكن كل شيء في Phase 1 يعمل على SQLite.

### مهم: PowerShell لا يدعم `&&`
نفّذ كل أمر في سطر منفصل (لا تجمعها بـ `&&`).

### 1) ثبّت المتطلبات
- **PHP 8.2+**: حمّل من [php.net](https://windows.php.net/download/) وأضِفه للـ PATH. فعّل في `php.ini` الإضافات:
  `extension=pdo_sqlite`, `extension=sqlite3`, `extension=mbstring`, `extension=openssl`, `extension=fileinfo`, `extension=curl`.
- **Composer**: من [getcomposer.org](https://getcomposer.org/Composer-Setup.exe).

### 2) جهّز المشروع (داخل مجلد backend)
```powershell
cd backend
copy .env.example .env
composer install
```

### 3) عدّل ملف `.env` لاستخدام SQLite (افتحه بمحرر وغيّر هذه القيم)
```env
DB_CONNECTION=sqlite
# احذف أو علّق على: DB_HOST / DB_PORT / DB_DATABASE / DB_USERNAME / DB_PASSWORD
CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
```

### 4) أنشئ ملف قاعدة بيانات SQLite الفارغ
```powershell
New-Item -ItemType File -Path database\database.sqlite
```

### 5) المفتاح + المايقريشن + البذور + التشغيل (كل أمر بسطر)
```powershell
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
السيرفر يشتغل على http://localhost:8000

### 6) جرّب (PowerShell)
استخدم `curl.exe` (مش `curl` لأنها alias لـ Invoke-WebRequest):
```powershell
curl.exe -X POST http://localhost:8000/api/v1/auth/register -H "Content-Type: application/json" -d '{\"full_name\":\"طالب تجريبي\",\"phone\":\"0790001122\"}'
```
الرد رح يحتوي `otp_debug` (رمز التحقق). بعدها:
```powershell
curl.exe -X POST http://localhost:8000/api/v1/auth/verify-otp -H "Content-Type: application/json" -d '{\"phone\":\"0790001122\",\"code\":\"الرمز_هنا\",\"purpose\":\"register\"}'
```

> لاحقاً عند الانتقال لـ PostgreSQL: ثبّت Docker Desktop وشغّل `docker compose up -d` من جذر المشروع، ثم أعد `DB_CONNECTION=pgsql` في `.env`.
