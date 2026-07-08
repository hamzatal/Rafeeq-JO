# رفيق | Rafeeq

> Smart University Mobility & Services Platform — منصة النقل والخدمات الطلابية الذكية

[![Status](https://img.shields.io/badge/status-in--development-orange)]()
[![License](https://img.shields.io/badge/license-Proprietary-blue)]()

رفيق منصة متكاملة للنقل الجامعي والخدمات الطلابية في الأردن، مدعومة بالذكاء الاصطناعي.
المنصة ليست مجرد تطبيق حجز — هي شبكة نقل + منصة خدمات + نظام أمان + مساعد ذكي.

---

## المنصة تتكوّن من

| التطبيق | الوصف | التقنية | المنصات |
|---------|--------|---------|----------|
| `frontend/student-app` | تطبيق الطالب | Expo (React Native + TS) | iOS · Android · Web |
| `frontend/driver-app` | تطبيق الكابتن | Expo (React Native + TS) | iOS · Android · Web |
| `frontend/admin-dashboard` | لوحة الإدارة | Next.js + TS + Tailwind | Web |
| `backend` | الـ API والمنطق | Laravel 12 (PHP 8.4) | — |
| `frontend/packages/shared` | نظام التصميم والأنواع المشتركة | TypeScript | — |

## البنية التقنية

```
Frontend (Expo / Next.js)
        │  REST + WebSockets
        ▼
Laravel 11 Modular Monolith  ──►  PostgreSQL + PostGIS
        │                          Redis (cache / queue / realtime)
        ├──► OpenAI GPT + Vision
        ├──► CliQ (المدفوعات)
        ├──► Firebase Cloud Messaging (الإشعارات)
        └──► Google Maps / Mapbox
```

> القرار المعماري: **Modular Monolith** — أسرع للإطلاق، أرخص تشغيلياً، وقابل للتقسيم إلى خدمات لاحقاً.

## التشغيل المحلي (Local Development)

> ملاحظة: يتطلب تثبيت الاعتمادات محلياً (`composer install` / `npm install`).

```bash
# 1) شغّل قواعد البيانات
docker compose up -d

# 2) الـ Backend
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve

# 3) الـ Frontend (كل التطبيقات — workspace واحد تحت frontend/)
cd frontend
npm install
npm run student   # تطبيق الطالب (ثم اختر iOS / Android / Web)
npm run driver    # تطبيق الكابتن
# npm run admin   # لوحة الإدارة (قادم)
```

## التوثيق

كل التوثيق أُعيدت هيكلته في [`docs/`](docs/README.md) بترقيم نظيف:

| # | الملف | الوصف |
|---|------|-------|
| 00 | [الرؤية](docs/00-VISION.md) | فكرة المشروع ومزاياه (غير تقني). |
| 01 | [الخطة الرئيسية](docs/01-MASTER-PLAN.md) | **مصدر التخطيط والحالة الوحيد.** |
| 02 | [التسعير والمناطق](docs/02-PRICING-ZONES.md) | محرّك التسعير بالمسافة + العمولة. |
| 03 | [نظام التصميم (Stitch)](docs/03-DESIGN-SYSTEM.md) | **الهوية الوحيدة المعتمدة.** |
| 04 | [المزايا](docs/04-FEATURES.md) | كتالوج المزايا + الإعلانات + AI. |
| 05 | [المعمارية](docs/05-ARCHITECTURE.md) | البنية التقنية. |
| 06–09 | [قاعدة البيانات](docs/06-DATABASE.md) · [الأمان](docs/07-SECURITY.md) · [النشر](docs/08-DEPLOYMENT.md) · [العلامة](docs/09-BRAND-NAMING.md) | مراجع تقنية. |

## خطة التنفيذ (Phases)

المسار الكامل خطوة بخطوة في [docs/01-MASTER-PLAN.md](docs/01-MASTER-PLAN.md). ملخّص:

- [x] **المرحلة 0** — التأسيس والترتيب: حذف الهويات السابقة (7) + إعادة هيكلة الدوكس + اعتماد تصميم Stitch مرجعياً.
- [ ] **المرحلة 1** — أساس التصميم (توكنز Stitch + خط IBM Plex Sans Arabic + توحيد المكوّنات).
- [ ] **المرحلة 2** — إعادة بناء شاشات التطبيقات الثلاثة على Stitch.
- [ ] **المرحلة 3** — محرّك التسعير بالمسافة + العمولة + أرباح الكابتن + الزون.
- [ ] **المرحلة 4** — إغلاق كل الثغرات الأمنية والتحقّق الفعلي.
- [ ] **المرحلة 5** — فحص التكامل والصحّة (تشغيل الاختبارات فعلياً).
- [ ] **المرحلة 6** — AI عبر GPT + مزايا جديدة + لوحة إعلانات.
- [ ] **المرحلة 7** — صلابة الإطلاق (تكاملات/نشر/قانوني).

---

© رفيق Rafeeq — جميع الحقوق محفوظة.
