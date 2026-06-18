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
