# المعمارية (System Architecture)

## النمط المعماري
**Modular Monolith** على Laravel 11. كل مجال أعمال (domain) مغلّف في "Module" مستقل له
Controllers / Services / Models / Repositories / Requests / Resources / Events / Jobs / Policies،
ويُسجّل نفسه عبر `ServiceProvider` خاص. هذا يتيح لاحقاً استخراج أي module كخدمة مستقلة دون إعادة كتابة.

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                               │
│  student-app (Expo)   driver-app (Expo)   admin (Next.js)   │
└───────────────┬───────────────┬───────────────┬─────────────┘
                │ REST / JSON    │ WebSockets     │
                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Laravel)                     │
│  Sanctum Auth · RBAC · Rate Limiting · Validation · Audit    │
├─────────────────────────────────────────────────────────────┤
│  Core         │ Security · Middleware · Exceptions · Audit   │
│  Shared       │ DTOs · Enums · Traits · Contracts · Events   │
│  Infrastructure│ DB · Redis · Queue · Storage · GPT · CliQ   │
├─────────────────────────────────────────────────────────────┤
│  Modules: Auth · Users · Students · Drivers · Vehicles ·     │
│  Universities · Areas · PickupPoints · Routes · Subscriptions│
│  Trips · Payments · Wallet · Rewards · Parcels · LostFound · │
│  Notifications · Support · Complaints · Analytics · Reports  │
├─────────────────────────────────────────────────────────────┤
│  AI: Assistants · Prompts · Vision · Moderation · Safety     │
└──────┬───────────────┬──────────────┬───────────────┬───────┘
       ▼               ▼              ▼               ▼
  PostgreSQL       Redis         OpenAI GPT       CliQ / FCM
  + PostGIS    (cache/queue/    + Vision         / Maps
               broadcast)
```

## الطبقات
- **Core** — أساسيات النظام: الأمان، الـ middleware، معالجة الأخطاء، الـ audit، الصلاحيات، الـ base classes.
- **Shared** — عناصر مشتركة بين الـ modules: DTOs، Enums، Traits، Contracts، Events، Validators.
- **Infrastructure** — التكامل مع الخدمات الخارجية والبنية التحتية (DB, Redis, Queue, Storage, GPT, CliQ, SMS, Maps, Email).
- **Modules** — منطق الأعمال مقسوم حسب المجال.
- **AI** — طبقة الذكاء الاصطناعي (مساعدون، prompts، vision، moderation، classification، توصيات، أمان).

## تدفّق الطلب (Request Lifecycle)
1. الطلب يصل عبر `routes/api.php` (يجمّع مسارات كل module).
2. Middleware: `auth:sanctum` → RBAC (`permission:*`) → `rate-limit` → `audit`.
3. `FormRequest` يتحقق من المدخلات.
4. `Controller` رفيع — يفوّض للـ `Service`.
5. `Service` ينفّذ منطق الأعمال، يستخدم `Repository` للوصول للبيانات.
6. النتيجة تُرجّع عبر `Resource` (JSON موحّد).
7. الأحداث المهمة تُطلق `Events` → `Listeners`/`Jobs` (إشعارات، audit، AI).

## معايير الـ API
- إصدار: `/api/v1/...`
- استجابة موحّدة: `{ "data": ..., "meta": ..., "message": ... }`
- أخطاء موحّدة: `{ "message": ..., "errors": {...}, "code": ... }`
- المصادقة: Bearer token (Laravel Sanctum).
- التوطين: رأس `Accept-Language: ar|en`.

## القرارات (ADR ملخّص)
| القرار | السبب |
|--------|-------|
| Modular Monolith بدل Microservices | سرعة الإطلاق + تكلفة أقل + قابلية تقسيم لاحقة |
| PostgreSQL + PostGIS | الاستعلامات الجغرافية للمسارات ونقاط التجمع + JSONB لبيانات AI |
| Expo (RN) للتطبيقات | كود واحد لـ iOS + Android + Web |
| Sanctum للمصادقة | بسيط ومناسب لتطبيقات الموبايل (token-based) |
| Redis + Reverb | الكاش والطوابير والبث اللحظي للتتبّع |
