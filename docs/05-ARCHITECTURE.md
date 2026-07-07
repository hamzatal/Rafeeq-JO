# 05 — المعمارية (Architecture)

> مرجع تقني موجز ومُصحّح. للحالة والخطة راجع [01-MASTER-PLAN](./01-MASTER-PLAN.md).

## 1) النمط
**Modular Monolith** على **Laravel 12 / PHP 8.4**، namespace `Rafeeq\`. كل مجال أعمال مغلّف في «Module» مستقل (Controllers / Services / Models / Repositories / Requests / Resources / Routes / Migrations / Providers) يسجّل نفسه عبر `ServiceProvider`. يتيح استخراج أي module كخدمة لاحقاً.

النموذج الأساسي: **تجميع باب-لباب حسب المنطقة (Zone Pooling)** — الطالب يطلب من بيته لجامعته، ومحرّك المطابقة يجمّع طلاب نفس المنطقة+الجامعة في رحلة كابتن واحد (سعة 4 افتراضي/7 أقصى) + اشتراكات مجدولة + رحلات Express.

## 2) المكوّنات
- **Backend:** Laravel 12، Sanctum (auth)، RBAC، Audit، مبالغ بالفلس (int)، مفاتيح UUID، Reverb (بثّ حيّ)، Redis (cache/queue/broadcast).
- **Frontend (monorepo npm):** `student-app` + `driver-app` (Expo RN + expo-router) · `admin-dashboard` (Next.js + Tailwind) · `packages/shared` (تصميم Stitch + i18n + أنواع) · `packages/api-client` (عميل REST نوعي).
- **قاعدة البيانات:** PostgreSQL 16 (lat/lng decimal؛ PostGIS لاحقاً).

## 3) الطبقات
`Core` (ApiResponse/BaseService/Repository/Exceptions/Middleware/RBAC/Audit) · `Shared` (Enums + Traits) · `Infrastructure` (SMS · Push/FCM · Gpt/OpenAI · Maps) · `Modules` (المجال) · بثّ Events عبر Reverb.

## 4) الموديولات (32)
Auth · Users · Students · Drivers · Universities · Areas · PickupPoints · Routes · Zones · Subscriptions · RideRequests · Matching · Trips · Wallet · Payouts · Payments · Notifications · Ratings · Support · Complaints · Disputes · Safety · Chat · Parcels · Rewards · LostFound · Exchange · Addresses · Reports · AI · Settings · Coupons.

> بنية كل موديول موحّدة — انسخ موديولاً موجوداً وسجّل الـ Provider في `backend/bootstrap/providers.php`.

## 5) معايير الـ API
- إصدار: `/api/v1/...`؛ استجابة موحّدة `{ data, meta, message }`؛ أخطاء `{ message, errors, code }`.
- مصادقة: Bearer (Sanctum)؛ توطين: `Accept-Language: ar|en`.
- دورة الطلب: Route → middleware (`auth:sanctum` → RBAC → rate-limit → audit) → FormRequest → Controller رفيع → Service → Repository → Resource → Events.

## 6) دورة المال ومكافحة الاحتيال
كل الدفع عبر **CliQ → محفظة مسبقة الدفع (فلس)**. الكابتن يتقاضى **من المنصة** (لا كاش) + حجز العمولة (config، افتراضي 15%). **OTP صعود + OTP إنزال/تسليم** على الطرفين. تسجيل الإلغاءات + Risk Flags + SOS. الشكوى الحرجة → تجميد + تحقيق. التسعير: راجع [02-PRICING-ZONES](./02-PRICING-ZONES.md).

## 7) عميل الـ API (نطاقات `RafeeqApi`)
auth · profile · driver · admin · catalog · transport · driverTrips · wallet · payments · notifications · ratings · rideRequests · support · complaints · disputes · parcels · rewards · lostFound · exchange · coupons · zones · emergency. استجابة موحّدة، Accept-Language تلقائي.

## 8) التكاملات (مفاتيح env — كلها اختيارية، fallback آمن)
| التكامل | env | بدونها |
|---|---|---|
| OpenAI (Vision/AI) | `OPENAI_API_KEY` | مراجعة يدوية / NullGptClient |
| Firebase FCM | `FIREBASE_*` | إشعار داخل التطبيق (log) |
| CliQ | `CLIQ_*` | تعليمات تحويل عامة |
| SMS / WhatsApp OTP | `SMS_*` / `WHATSAPP_*` | log |
| Reverb (بثّ حيّ) | `REVERB_*` | polling |
| الخرائط | `GOOGLE_MAPS_KEY` / `MAPBOX_TOKEN` | إحداثيات نصية |

## 9) التشغيل محلياً
- Backend: `cd backend && composer install && php artisan migrate:fresh --seed && php artisan serve`
- Frontend: `cd frontend && npm install` ثم `npm run student` / `npm run driver` / `npm run admin`
- CI (GitHub Actions): إقلاع Laravel + phpunit + migrate على PostgreSQL 16 + typecheck/lint للتطبيقات.

## 10) قرارات معمارية (ADR ملخّص)
| القرار | السبب |
|--------|-------|
| Modular Monolith بدل Microservices | سرعة إطلاق + كلفة أقل + قابلية تقسيم لاحقة |
| PostgreSQL (+PostGIS لاحقاً) | استعلامات جغرافية + JSONB لبيانات AI |
| Expo (RN) | كود واحد iOS + Android + Web |
| Sanctum | مصادقة token بسيطة للموبايل |
| Redis + Reverb | كاش/طوابير + بثّ حيّ للتتبّع |
