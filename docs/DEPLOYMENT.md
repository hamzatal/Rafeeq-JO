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

## التشغيل المحلي للـ Backend (Local Setup)

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

## تشغيل التطبيقات الأمامية (Frontend Setup)

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

## بناء تطبيقات الأندرويد عبر EAS (Android Build)

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

## تشغيل المنصّة وربط التطبيقات بالخادم (Running)

# تشغيل منصّة رفيق وربط التطبيقات بالخادم

> هذا الدليل يحلّ خطأ **"Network Error / تعذّر الاتصال بالخادم"** عند تسجيل الدخول.
> السبب أن التطبيقات كانت تتّصل بـ `http://localhost:8000` وهو غير قابل للوصول من جهاز/متصفّح آخر.

## 1) تشغيل الباك إند (Laravel API)

المتطلّبات (حسب ستاك المشروع): **PHP 8.2+** و**PostgreSQL 16** و**Redis** (الكاش/الطابور/الجلسات/البثّ).

```bash
cd backend
cp .env.example .env
php artisan key:generate
# عدّل .env: بيانات PostgreSQL + Redis + مفتاح OpenAI (انظر أدناه)
php artisan migrate --force
php artisan db:seed --force        # ينشئ الأدوار + حساب أدمن + جامعات + مناطق
php artisan serve --host=0.0.0.0 --port=8000
```

- حساب الأدمن المزروع: الهاتف `+962790000000`، وكلمة المرور من `SEED_ADMIN_PASSWORD` في `.env`.
- صحّة الـ API: `GET http://<HOST>:8000/api/v1/ping` يجب أن يرجع `pong`.
- شغّل عامل الجدولة في الإنتاج: `php artisan schedule:work` (أو cron).

## 2) ربط التطبيقات بعنوان الخادم الصحيح

استبدل `<HOST>` بعنوان IP للجهاز المضيف على الشبكة (وليس `localhost`)، أو دومين الإنتاج.

| التطبيق | المتغيّر | الملف |
|--------|----------|------|
| student-app / driver-app (Expo) | `EXPO_PUBLIC_API_URL` | `.env` في مجلد كل تطبيق |
| admin-dashboard (Next.js) | `NEXT_PUBLIC_API_URL` | `.env.local` |

```bash
# مثال لكل تطبيق Expo
echo "EXPO_PUBLIC_API_URL=http://192.168.1.50:8000" > frontend/student-app/.env

# لوحة الإدارة
echo "NEXT_PUBLIC_API_URL=http://192.168.1.50:8000" > frontend/admin-dashboard/.env.local
```

ملاحظات مهمّة:
- على **محاكي Android** استخدم `http://10.0.2.2:8000`.
- على **جهاز حقيقي** استخدم IP جهازك على نفس شبكة الواي‑فاي (مثل `http://192.168.x.x:8000`).
- على **الويب (متصفّح نفس الجهاز)** يكفي `http://localhost:8000`.
- بعد تعديل `.env` لتطبيقات Expo، أعد تشغيل الحزمة: `npx expo start -c`.

## 3) إرسال OTP عبر WhatsApp مجاناً (OpenWA) — للتجربة على رقم حقيقي

بدل رسائل SMS المدفوعة، يمكن إرسال رمز الـ OTP عبر **واتساب** باستخدام بوابة [OpenWA](https://github.com/rmyndharis/OpenWA) المجانية المفتوحة المصدر (تُستضاف ذاتياً). الدمج جاهز في الباك إند عبر تجريد `SmsGateway` — تشغّل OpenWA كخدمة منفصلة فقط.

**مهم:** OpenWA تطبيق مستقلّ — **انسخه في مجلد منفصل بجانب مشروع رفيق، وليس داخله** (حتى لا يلتبس مع git/docker الخاصّين برفيق).

```bash
# 1) من المجلد الأب (بجانب Rafeeq-JO وليس داخله):
cd ..                                   # تطلع خطوة لخارج مجلد المشروع
git clone https://github.com/rmyndharis/OpenWA
cd OpenWA
cp .env.example .env
#   عدّل .env:  API_MASTER_KEY=<مفتاح-عشوائي-قوي>   و   API_PORT=2785
docker compose up -d                    # يبني من المصدر أول مرة (دقائق) — يعمل على 2785
# اللوحة + Swagger: http://localhost:2785/api/docs

# التخطيط النهائي:
#   ~/rafeeq/Rafeeq-JO/   ← مشروعك
#   ~/rafeeq/OpenWA/      ← البوابة (منفصلة)

# 2) أنشئ جلسة وامسح QR برقم واتساب رفيق الرسمي (KEY = نفس API_MASTER_KEY)
curl -X POST http://localhost:2785/api/sessions       -H "X-API-Key: KEY" -H "Content-Type: application/json" -d '{"name":"rafeeq"}'
curl -X POST http://localhost:2785/api/sessions/rafeeq/start -H "X-API-Key: KEY"
curl http://localhost:2785/api/sessions/rafeeq/qr     -H "X-API-Key: KEY"   # امسح الـ QR
```

**3) فعّل واتساب في `backend/.env` تبع رفيق:**
```env
SMS_DRIVER=whatsapp
WHATSAPP_GATEWAY_URL=http://localhost:2785
WHATSAPP_API_KEY=نفس-قيمة-API_MASTER_KEY
WHATSAPP_SESSION=rafeeq
```
> إذا OpenWA على سيرفر آخر، بدّل `localhost` بعنوان ذلك السيرفر (مثل `http://10.0.0.5:2785`).

بعدها كل رمز OTP يُرسَل فعلياً عبر واتساب من الرقم اللي مسحت QR فيه، باسم رفيق. (الباك إند يحوّل الرقم تلقائياً لصيغة `9627XXXXXXXX@c.us`.)

> **ملاحظة أمانة:** OpenWA يؤتمت واتساب ويب (غير رسمي من واتساب) — ممتاز للتجربة/MVP لكن قد يُعرّض الرقم للحظر عند الاستخدام المكثّف. للإنتاج واسع النطاق يُفضّل **WhatsApp Business Cloud API** الرسمي؛ والتبديل سطر واحد في الـ binding بفضل تجريد `SmsGateway`.

## 4) مفتاح OpenAI (GPT) — جاهز عندك

ضعه في `backend/.env`:

```env
OPENAI_API_KEY=sk-...your-key...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o
```

- يُستخدم في: مساعد رفيق، وذكاء المسارات، و**التحقّق من إيصالات CliQ بالرؤية (Vision)**.
- بدون المفتاح يعمل النظام عبر `NullGptClient` (مراجعة يدوية للإيصالات) — لا يتعطّل.

## 5) رسالة الخطأ الواضحة
عند تعذّر الوصول للخادم تظهر الآن رسالة عربية واضحة بدل التعليق، مع مهلة 15 ثانية بدل 20.
تحقّق أولاً من: تشغيل الباك إند، صحّة `EXPO_PUBLIC_API_URL`/`NEXT_PUBLIC_API_URL`، ووصول الجهاز للشبكة نفسها.
