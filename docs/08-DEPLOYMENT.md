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
- **النسخ الاحتياطي:** `pg_dump` يومي + تخزين خارج الموقع + **اختبار استعادة شهري**.
- **المراقبة:** وجّه موازِن الأحمال إلى `/api/v1/health`؛ نبّه على 5xx و`audit_logs` الحسّاسة وطول الطابور.
- **الأمان التشغيلي:** راجع **Deployment Security Runbook** في [07-SECURITY](./07-SECURITY.md) (TLS/HSTS · Secrets Manager · WAF).

## ✅ قائمة تدقيق الإصدار (Release checklist)

- [ ] CI أخضر: **PHPUnit + PHPStan + pint** (backend) و **typecheck** (الواجهات الأربعة).
- [ ] `APP_ENV=production` · `APP_DEBUG=false` · `APP_VERSION=<git-sha/tag>`.
- [ ] الأسرار من Secrets Manager · TLS/HSTS عند الموازِن.
- [ ] `migrate --force` نجح + PostGIS مفعّل + فهارس موجودة.
- [ ] `/api/v1/health` يرجع `healthy` بعد النشر.
- [ ] نسخة احتياطية قبل الهجرة + خطة تراجع جاهزة.
- [ ] السياسات القانونية منشورة (`docs/legal/*`).
