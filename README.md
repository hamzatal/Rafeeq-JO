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
| `backend` | الـ API والمنطق | Laravel 11 (PHP 8.4) | — |
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

| الموضوع | الملف |
|---------|-------|
| نظرة عمل المشروع | [docs/business/overview.md](docs/business/overview.md) |
| المعمارية | [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md) |
| قاعدة البيانات | [docs/database/schema.md](docs/database/schema.md) |
| الأمان | [docs/security/security-model.md](docs/security/security-model.md) |
| خارطة الطريق | [docs/business/roadmap.md](docs/business/roadmap.md) |

## خطة التنفيذ (Phases)

- [x] **Phase 0** — الأساس (Monorepo + Backend foundation + Design system)
- [x] **Phase 1** — الهوية والأمان (Auth / OTP / RBAC / Users / Students / Drivers + 3 واجهات)
- [x] **Phase 2** — النقل (Universities / Areas / PickupPoints / Routes / Subscriptions / Trips / Zones / RideRequests / Matching / Wallet) — backend
- [x] **Phase 3** — الدفع (CliQ + GPT Vision) — backend (Payments + بنية Gpt) ✅ · واجهات ⏳
- [ ] **Phase 4** — الخدمات (Parcels / Lost & Found / Rewards)
- [ ] **Phase 5** — الذكاء الاصطناعي (Rafeeq AI / Support / Safety / Fraud Monitor)
- [~] **Phase 6** — لوحة الإدارة + التحليلات · **الإشعارات (FCM+SMS) ✅** · **التقييم الثنائي ✅** (backend)
- [~] **Phase 7** — الإطلاق · **SOS ✅** · Notifications ✅ · **OTP صعود + OTP إنزال (تأكيد الطرفين) ✅** · **محرك تسعير + Express ✅** · **حجز الرصيد ✅** · **كشف احتيال GPS ✅** · **بوابة ولي الأمر ✅ (backend)** · (Deployment/CI/اختبارات شاملة ⏳)

> الحالة الحيّة والتفصيلية: `docs/EXECUTION_PLAN.md` (M1–M10) + `docs/PROGRESS.md`. كتالوج المزايا الشامل: `docs/FEATURES.md`. آخر commit: **RFQ-161**.

---

© رفيق Rafeeq — جميع الحقوق محفوظة.
