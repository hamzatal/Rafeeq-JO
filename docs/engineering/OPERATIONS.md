# دليل النشر — رفيق (Rafeeq)

## المكوّنات
- **API** (Laravel): `backend/Dockerfile` (nginx + php-fpm، PostgreSQL/PostGIS + Redis + GD + intl).
- **Admin** (Next.js standalone): `frontend/admin-dashboard/Dockerfile`.
- **Reverb** (WebSockets): نفس صورة الـ API بأمر `reverb:start`.
- **PostgreSQL + PostGIS** و **Redis**.
- التطبيقات الجوّالة (Expo) تُبنى عبر EAS وتُنشر على المتاجر.

## الإطلاق السريع
```bash
cp backend/.env.production.example backend/.env.production   # املأ الأسرار
docker compose -f deployment/docker-compose.prod.yml up -d --build
docker compose -f deployment/docker-compose.prod.yml exec api php artisan key:generate
docker compose -f deployment/docker-compose.prod.yml exec api php artisan migrate --force
docker compose -f deployment/docker-compose.prod.yml exec api php artisan db:seed --force
docker compose -f deployment/docker-compose.prod.yml exec api php artisan config:cache route:cache
```

## قائمة تدقيق ما قبل الإطلاق
- [ ] `APP_DEBUG=false` و`APP_ENV=production` + HTTPS/HSTS أمام الـ API.
- [ ] أسرار قوية لـ DB/Redis/Reverb عبر Secrets Manager (لا `.env` على المستودع).
- [ ] تفعيل **PostGIS** (`CREATE EXTENSION postgis;`) + فهارس مكانية.
- [ ] تخزين خاص (S3/MinIO) لوثائق الكباتن وإشعارات الدفع والطرود.
- [ ] نسخ احتياطي يومي لقاعدة البيانات + اختبار الاستعادة.
- [ ] مراقبة (health-checks موجودة) + تنبيهات + تجميع السجلّات.
- [ ] تدوير المفاتيح (OpenAI/Firebase/CliQ/Maps) + حصص الاستخدام.
- [ ] سياسات قانونية منشورة (`docs/legal/*`).
- [ ] مراجعة `npm audit` بعد ترقية Expo/Next لأحدث ثابت.
- [ ] CI أخضر (tsc + إقلاع Laravel) قبل الدمج.

## ملاحظات التطبيقات الجوّالة
- عبّئ `extra.apiUrl` (و`extra.reverb*` للتتبّع الحيّ) في `app.json` لكل تطبيق.
- ابنِ عبر EAS: `eas build -p android|ios`.


---

## 🩺 فحوصات الجاهزية (Health probes)

| المسار | النوع | يفحص | الاستخدام |
|--------|------|------|-----------|
| `GET /api/v1/ping` | Liveness | أن العملية حيّة (بلا تبعيات) | إعادة تشغيل الحاوية عند التعليق |
| `GET /api/v1/health` | Readiness | **DB + Cache** + الإصدار؛ يرجع **503** عند التدهور | سحب النسخة من موازِن الأحمال حتى تتعافى |

`docker-compose.prod.yml` يستخدم `/api/v1/health` كـ healthcheck، فلا تُعلَّم الحاوية
`healthy` (ولا تبدأ التوابع المعتمدة عليها) إلا بعد أن تصبح قاعدة البيانات والكاش جاهزتين.

## 🚀 نشر بلا توقّف (Zero-downtime) + التراجع

```bash
# 1) اسحب الإصدار الجديد وابنِ الصور
git pull origin main
export APP_VERSION=$(git rev-parse --short HEAD)      # يظهر في /health
docker compose -f deployment/docker-compose.prod.yml build

# 2) هجرات متوافقة-للأمام أولاً (بلا كسر النسخة القديمة)
docker compose -f deployment/docker-compose.prod.yml run --rm api php artisan migrate --force

# 3) استبدال متدحرج + إعادة تحميل الكاش
docker compose -f deployment/docker-compose.prod.yml up -d --no-deps --build api admin reverb queue scheduler
docker compose -f deployment/docker-compose.prod.yml exec api php artisan config:cache route:cache event:cache

# التراجع (rollback): أعِد للوسم السابق ثم أعِد النشر
git checkout <previous-tag> && docker compose -f deployment/docker-compose.prod.yml up -d --build
```

> **قاعدة الهجرات:** اجعلها **متوافقة للأمام** (إضافة أعمدة/جداول قبل استخدامها؛ الحذف في إصدار لاحق) حتى يعمل الكودان القديم والجديد أثناء الاستبدال المتدحرج.

## 🧰 العمليات (Operations)

- **العمّال (queue):** خدمة `queue` تشغّل `queue:work` — راقب طول الطابور وأعِد التشغيل عند النشر.
- **المجدول (scheduler):** خدمة `scheduler` تشغّل `schedule:work` (تنظيف/تقارير دورية).
- **Reverb:** خدمة `reverb` للبثّ اللحظي (تتبّع الرحلة/الدردشة) — خلف WSS.
- **النسخ الاحتياطي:** `backend/scripts/backup.sh` مجدول يومياً 02:00 — **ويتحقّق بالاستعادة**: يستعيد النسخة إلى قاعدة مؤقّتة، يقارن عدد الصفوف، ويعيد التحقّق من القيود، ثم يخرج بقيمة غير صفرية إن فشل أيّها. dump لا يُستعاد ملفّ لا نسخة احتياطية.
- **الاحتفاظ:** `rafeeq:prune-retention` يومياً 03:30 · `rafeeq:retention-report` أسبوعياً. الأولى تنفّذ، والثانية **تُثبت** التنفيذ على أرقام حقيقية (`--fail-on-overdue` يجعلها فحص CI).
- **صحّة العامل والمجدول:** `rafeeq:worker-alive` يُثبت أنّ Redis **قابل للوصول** — لأنّ `queue:monitor` يقيس عمق الطابور، وعمق صفر يبدو متطابقاً بين طابور فارغ وطابور غير قابل للوصول. والمجدول يلمس `/tmp/scheduler-heartbeat` كل دقيقة لأنّ Docker لا يستطيع سؤال «هل ما زال `schedule:work` ينبض؟».
- **تنبيه الوظائف الفاشلة:** `rafeeq:worker-alive --alert-on-failures` كل ساعة، عتبته `RAFEEQ_FAILED_JOBS_ALERT_THRESHOLD` (10 في 24 ساعة). ليست صفراً: مهلة FCM عابرة واحدة ضجيج، وجرس يرنّ كل ليلة جرس يُسكَت.
- **المراقبة:** وجّه موازِن الأحمال إلى `/api/v1/health`؛ نبّه على 5xx و`audit_logs` الحسّاسة وطول الطابور.

### 🔑 دوران `APP_KEY` — إجراء لا خيار إعداد

`APP_KEY` يفكّ **كل بيانات التعريف** (الاسم، الهاتف، البريد، الرقم الوطني، العنوان، جهات
اتصال الطوارئ) **ويشتقّ كل بصمات البحث** (`phone_hash`, `email_hash`, `name_tokens`,
`national_id_hash`). فتغييره ليس تدويراً لسرّ، بل **إعادة تشفير قاعدة البيانات**.

تغييره بلا الإجراء أدناه يعني: **لا أحد يستطيع تسجيل الدخول** (البصمات لم تعد تُطابق)،
ولا يمكن قراءة أي اسم أو رقم. والأسوأ أنّ الفشل **صامت**: التطبيق يعمل، والاستعلامات تنجح،
وتُرجع صفر صفّاً.

```bash
# 1) أوقف الكتابة (وضع الصيانة) — بصمة تُحسب بمفتاح والصفّ يُكتب بآخر = صفّ مفقود
php artisan down

# 2) نسخة احتياطية مُتحقَّقة أولاً. هذه العملية لا تحتمل «ثم نرى»
./scripts/backup.sh

# 3) أضف المفتاح الجديد إلى APP_PREVIOUS_KEYS واحفظ القديم — Laravel يفكّ بالقديم ويشفّر بالجديد
#    APP_KEY=base64:<الجديد>
#    APP_PREVIOUS_KEYS=base64:<القديم>

# 4) أعِد تشفير الصفوف وأعِد حساب البصمات (هجرة 2026_08_28_000300 قابلة لإعادة التشغيل)
#    والأهمّ: تحقّق من العدد قبل رفع الصيانة
php artisan tinker --execute="dd(DB::table('users')->whereNull('phone_hash')->count());"   # يجب أن يكون 0

# 5) ارفع الصيانة
php artisan up
```

**قبل رفع الصيانة:** سجّل دخولاً بحساب حقيقي واحد. البصمة التي لا تُطابق لا تُصدر خطأً —
تُصدر «بيانات الدخول غير صحيحة».
- **الأمان التشغيلي:** TLS/HSTS · Secrets Manager · WAF. ⚠️ **غير مُنفَّذ اليوم** — لا reverse proxy ولا TLS في أي compose، والتفصيل في [AUDIT](../AUDIT.md) §2 (خ24) والتنفيذ في [ROADMAP](../ROADMAP.md) المرحلة 11.

## ✅ قائمة تدقيق الإصدار (Release checklist)

- [ ] CI أخضر: **PHPUnit + PHPStan + pint** (backend) و **typecheck** (الواجهات الأربعة).
- [ ] `APP_ENV=production` · `APP_DEBUG=false` · `APP_VERSION=<git-sha/tag>`.
- [ ] الأسرار من Secrets Manager · TLS/HSTS عند الموازِن.
- [ ] `migrate --force` نجح + PostGIS مفعّل + فهارس موجودة.
- [ ] `/api/v1/health` يرجع `healthy` بعد النشر.
- [ ] نسخة احتياطية قبل الهجرة + خطة تراجع جاهزة.
- [ ] السياسات القانونية منشورة (`docs/legal/*`).


---

# التهيئة المحلية

(مدموج من `local-setup.md`)

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


---

# تهيئة الواجهات

(مدموج من `frontend-setup.md`)

# تشغيل تطبيق الطالب (Expo) — Frontend

> التطبيق مبني بـ Expo (React Native + TypeScript) ويشتغل على **iOS + Android + Web** من نفس الكود.
> يعتمد على حزم مشتركة في `frontend/packages/` ضمن workspace الـ frontend (npm workspaces).

## المتطلبات
- Node.js 20+ و npm 10+.
- (اختياري للموبايل) تطبيق **Expo Go** على هاتفك، أو محاكي Android/iOS.

## 1) ثبّت الاعتمادات (من مجلد frontend)
```bash
cd frontend
npm install
```
> هذا يثبّت اعتمادات كل الـ workspaces (التطبيقات + الحزم المشتركة) دفعة واحدة.

## 2) تأكّد أن الـ Backend شغّال
لازم يكون الـ API شغّال على `http://localhost:8000` (انظر `local-setup.md`).
عنوان الـ API معرّف في `frontend/student-app/app.json` تحت `extra.apiUrl`.

> **مهم للموبايل الحقيقي:** `localhost` يشير للهاتف نفسه. لتجربة على جهاز فعلي، غيّر `apiUrl`
> إلى IP جهازك على الشبكة (مثل `http://192.168.1.20:8000`)، وشغّل الـ backend بـ
> `php artisan serve --host=0.0.0.0`.

## 3) شغّل التطبيق
```bash
# من مجلد frontend
cd frontend
npm run student
# أو من داخل مجلد التطبيق:
cd frontend/student-app && npm start
```
ثم اختر:
- `w` لفتح نسخة الويب في المتصفح (الأسرع للتجربة).
- `a` لمحاكي Android، `i` لمحاكي iOS.
- أو امسح الـ QR بتطبيق Expo Go.

## التدفّق الجاهز حالياً
شاشة ترحيب → إنشاء حساب (اسم + هاتف) → إدخال رمز OTP (يظهر رمز التجربة على الشاشة في وضع التطوير) →
الدخول للرئيسية. كذلك تسجيل الدخول بكلمة المرور (للأدمن/الموظفين).

## البنية
```
frontend/student-app/
├── app/                 شاشات (expo-router)
│   ├── _layout.tsx      تحميل الخطوط + providers + bootstrap
│   ├── index.tsx        بوابة التوجيه حسب حالة الدخول
│   ├── (auth)/          welcome / register / otp / login
│   └── (app)/           home (الخدمات)
└── src/
    ├── components/      Button / Input / Screen
    ├── lib/             api + secure token storage
    ├── store/           auth (zustand)
    ├── i18n.tsx         العربية/الإنجليزية + RTL
    └── theme.ts         ربط نظام تصميم رفيق
```

## ملاحظات
- نظام التصميم والأنواع وعميل الـ API في `frontend/packages/shared` و`frontend/packages/api-client` (مُعاد استخدامها في تطبيق الكابتن).
- التوكن يُحفظ بأمان (SecureStore على الموبايل، localStorage على الويب).
- اللغة الافتراضية عربية مع RTL.


---

## 🚗 تشغيل تطبيق الكابتن (driver-app)
نفس متطلبات تطبيق الطالب. من مجلد frontend:
```bash
cd frontend
npm install            # مرة واحدة (يثبّت كل التطبيقات)
npm run driver
# أو: cd frontend/driver-app && npm start
```
ثم `w` للويب أو امسح الـ QR.

### تدفّق الكابتن الجاهز
ترحيب → إنشاء حساب (يُسجّل كـ **كابتن**) → OTP → لوحة الكابتن:
- شريط حالة التوثيق (بانتظار / قيد المراجعة / معتمد / مرفوض / موقوف).
- **الوثائق:** رفع الهوية/الرخصة/دفتر المركبة/التأمين/صورة (صورة أو PDF) — تُخزّن على disk آمن في الـ backend.
- **المركبة:** إضافة مركبة مع فاليديشن.
- **إرسال للمراجعة:** يتحقق الـ backend من اكتمال الوثائق والمركبة قبل القبول.

### اعتماد الكابتن (للتجربة)
الاعتماد يتم من حساب إدارة عبر الـ API (لوحة الإدارة قيد الإنشاء):
`POST /api/v1/admin/drivers/{driver}/review` بالحقل `action=approve` (يتطلب صلاحية `drivers.approve`).


---

## 🛠️ تشغيل لوحة الإدارة (admin-dashboard — Next.js)
```bash
cd frontend
npm install              # مرة واحدة
cp admin-dashboard/.env.local.example admin-dashboard/.env.local   # عنوان الـ API
npm run admin            # على http://localhost:3000
```
سجّل الدخول بحساب الأدمن المزروع:
- الهاتف: `0790000000` · كلمة المرور: `Rafeeq@2026` (أو ما ضبطته في `SEED_ADMIN_PASSWORD`).

### المتوفّر في اللوحة
- **الرئيسية:** نظرة عامة.
- **الكباتن:** قائمة + فلترة بالحالة → صفحة مراجعة: عرض الوثائق (تنزيل آمن)، قبول/رفض كل وثيقة، واعتماد/رفض/إيقاف الكابتن.
- **المستخدمون:** قائمة + فلترة بالنوع + بحث.

> دورة التوثيق الكاملة صارت تعمل بصرياً: الكابتن يرفع وثائقه ويرسل للمراجعة → الأدمن يفتح اللوحة، يراجع، يقبل الوثائق، ويعتمد الكابتن → حالة الكابتن في تطبيقه تتحدّث إلى "معتمد".


---

## 🔌 منافذ التطبيقات (مهم — لتفادي تداخل الكاش)
كل تطبيق على بورت مختلف حتى لا يتشاركوا الكاش/الـ origin في المتصفّح:
| التطبيق | الأمر | البورت |
|---------|------|--------|
| الطالب | `npm run student` | http://localhost:8081 |
| الكابتن | `npm run driver` | http://localhost:8082 |
| الإدارة | `npm run admin` | http://localhost:3000 |

> إذا ظهر تطبيق مكان آخر (كاش قديم): أوقف الـ Metro وشغّل بكاش نظيف:
> `npm run student -- -c` (أو `cd frontend/student-app && npx expo start -c`)، واعمل Hard Refresh (Ctrl+Shift+R) أو نافذة خفيّة.

## ✨ شاشات البداية (Splash)
لكل قسم Splash متحرّك ومميّز:
- **الطالب:** أزرق + شعار نابض + "طريق" تحميل متحرّك.
- **الكابتن:** Navy داكن + خريطة/طريق مع علامة تتحرّك عليه.
- **الإدارة:** Navy + أعمدة تحليلات متحركة.


---

# بناء أندرويد

(مدموج من `android-build.md`)

# بناء تطبيقات الأندرويد (APK) عبر EAS

دليل عملي لبناء **APK** قابل للتثبيت على هاتفك لتجربة تطبيقات UniGo/رفيق (الطالب + الكابتن). لوحة الإدارة تُنشر كموقع (Vercel/سيرفر)، لا تحتاج APK.

## المتطلبات (مرة واحدة)
1. حساب Expo مجاني: <https://expo.dev>.
2. تثبيت الأدوات:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. الباك إند لازم يكون **واصلاً من الإنترنت** (سيرفر، أو نفق مؤقّت مثل `ngrok http 8000` / `cloudflared`).
4. **مفتاح Google Maps** مضبوط بالباك إند (`GOOGLE_MAPS_KEY`) لتظهر خريطة Google الحقيقية بدل OSM.

## ضبط عنوان الـ API
التطبيق يقرأ `apiUrl` من `app.json` → `expo.extra.apiUrl` (الافتراضي `http://localhost:8000` لا يعمل على جهاز حقيقي).
عدّلها لعنوان الباك إند الواصل قبل البناء، مثلاً:
```jsonc
// frontend/student-app/app.json  (و driver-app/app.json)
"extra": { "apiUrl": "https://api.example.com", "mapsKey": "" }
```

## أول مرة لكل تطبيق (ربط مشروع EAS)
```bash
cd frontend/student-app     # ثم كرّر لـ driver-app
eas init            # يربط المشروع + يضيف extra.eas.projectId في app.json
```

## بناء الـ APK (للتجربة)
```bash
cd frontend/student-app
eas build --platform android --profile preview
# انتظر البناء على سحابة Expo → بيطلع رابط APK بنهايته
```
- افتح الرابط على هاتف الأندرويد ونزّل الـAPK وثبّته (فعّل «تثبيت من مصادر غير معروفة»).
- كرّر لـ `frontend/driver-app`.

## بديل أسرع للمعاينة (بدون بناء)
```bash
cd frontend/student-app
npx expo start
```
امسح الـQR بتطبيق **Expo Go** — بس بعض الميزات الأصلية (الإشعارات/الخريطة) قد لا تعمل كاملة؛ للتجربة الكاملة استخدم بناء الـAPK أعلاه.

## بروفايلات البناء (`eas.json`)
| Profile | المخرج | الاستخدام |
|---------|--------|-----------|
| `development` | APK + dev client | تطوير مع hot reload |
| `preview` | **APK** | التجربة على جهازك (الأنسب لك الآن) |
| `production` | AAB (app-bundle) | الرفع على Google Play |

## للإطلاق على Google Play (لاحقاً)
```bash
eas build --platform android --profile production   # ينتج AAB
eas submit --platform android --profile production  # يرفع على Play (يتطلب حساب مطوّر)
```
> ملاحظة: لا تنشر على المتاجر قبل تثبيت الاسم النهائي قانونياً (راجع `business/BRAND_NAMING.md`) — لأن `package`/`bundleIdentifier` لا يتغيّران بعد النشر.


---

# واتساب OTP

(مدموج من `whatsapp-otp.md`)

# إعداد OTP عبر WhatsApp Cloud API الرسمي (Meta)

> القناة المعتمدة لإرسال رموز التحقق في رفيق. رسمية، موثوقة، وفيها طبقة مجانية كافية للتجربة الحقيقية.
> البديل التطويري: `SMS_DRIVER=log` (يكتب الرمز في اللوق) — التطبيق يعمل بدون أي مفاتيح.

---

## لماذا الرسمي؟
- لا حاجة لتشغيل سيرفر OpenWA على جهازك (تم استبعاده).
- موثوق ولا يُحظر الرقم. **محادثات الخدمة: 1000 مجانية/شهر** + رسائل الـ authentication بسعر زهيد للأردن.
- التبديل للمزوّد لاحقاً (زين الأردن مثلاً) يبقى تغيير سطر واحد بفضل واجهة `SmsGateway`.

## الخطوات (مرة واحدة)
1. أنشئ تطبيقاً على [Meta for Developers](https://developers.facebook.com/) ← أضف منتج **WhatsApp**.
2. احصل على:
   - **Phone Number ID** (معرّف رقم الواتساب) → `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
   - **Permanent Access Token** (توكن دائم عبر System User) → `WHATSAPP_CLOUD_ACCESS_TOKEN`
3. أنشئ قالب رسالة من فئة **Authentication** باسم `rafeeq_otp` (أو غيّر الاسم في الإعداد):
   - النوع: Authentication · يحتوي **معامل واحد** للرمز + زر **Copy code** (افتراضي).
   - اللغة: العربية (`ar`). انتظر اعتماد Meta للقالب.
4. عبّئ `backend/.env`:
   ```env
   SMS_DRIVER=whatsapp_cloud
   WHATSAPP_CLOUD_PHONE_NUMBER_ID=xxxxxxxxxxxxxxx
   WHATSAPP_CLOUD_ACCESS_TOKEN=EAA...
   WHATSAPP_CLOUD_TEMPLATE=rafeeq_otp
   WHATSAPP_CLOUD_TEMPLATE_LANG=ar
   WHATSAPP_CLOUD_TEMPLATE_BUTTON=true
   ```
5. شغّل `php artisan config:clear` ثم جرّب التسجيل من التطبيق — يصلك الرمز على واتساب.

## كيف يعمل داخلياً
- `Infrastructure/Sms/WhatsAppCloudSmsGateway` يرسل:
  `POST https://graph.facebook.com/{version}/{phone_number_id}/messages` بـ `Authorization: Bearer`.
- وضع **template** (افتراضي): قالب authentication + الرمز كمعامل body (والزر يكرّره) — يصل للمستخدم خارج نافذة 24 ساعة (مطلوب للـ OTP).
- وضع **text**: نص حرّ — فقط داخل نافذة محادثة مفتوحة.
- الرمز يُستخرج من رسالة الـ OTP تلقائياً (`\d{4,8}`).

## الصلابة (Resilience)
- إن لم تُضبط المفاتيح → استثناء واضح `WHATSAPP_CLOUD_NOT_CONFIGURED` (لا يُسقط الخادم).
- عند فشل Meta → يُسجَّل الخطأ ويُرجَع للمستخدم "تعذّر الإرسال، حاول لاحقاً".
- الرقم يُطبَّع تلقائياً (07/00962/+962 → 9627XXXXXXXX). الأرقام تُخفّى في اللوق.

## التوسّع المستقبلي
لتفعيل مزوّد SMS أردني (زين/أمنية/مجمّع محلي) لاسم مرسل "رفيق": فعّل `SMS_DRIVER=http` واضبط `SMS_BASE_URL`/`SMS_API_KEY` (`HttpSmsGateway`)، أو أضف بوابة جديدة وسطر ربط واحد في `InfrastructureServiceProvider`.

## الاختبارات
`tests/Feature/WhatsAppCloudOtpTest.php` (4): إرسال القالب باستخراج الرمز + Bearer، وضع النص، استثناء عند غياب الإعداد، استثناء عند خطأ Meta.
