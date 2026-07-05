# المرجع المعماري الشامل — رفيق (Rafeeq)

> مرجع واحد لكل ما هو مهم في المشروع. يُقرأ مع `PROGRESS.md` (الحالة الحيّة) و`ROADMAP.md` و`DESIGN.md` و`SECURITY.md`.

## 1) نظرة عامة
منصّة نقل وخدمات طلابية في الأردن. النموذج الأساسي: **تجميع باب-لباب حسب المنطقة (Zone Pooling)** — الطالب يطلب من بيته إلى جامعته، ومحرّك المطابقة يجمّع طلاب نفس المنطقة + الجامعة في رحلة واحدة لكابتن (سيارة خاصة، سعة 4 افتراضي / 7 أقصى) + اشتراكات مجدولة + رحلات Express.

## 2) التقنيات
- **Backend**: Laravel 11 (PHP 8.2)، Modular Monolith، namespace `Rafeeq\`. مال بالفلس (int)، مفاتيح UUID، Sanctum، RBAC، Audit.
- **Frontend (monorepo npm)**: `student-app` + `driver-app` (Expo RN + expo-router) · `admin-dashboard` (Next.js 14 + Tailwind) · `packages/shared` (تصميم + i18n + أنواع) · `packages/api-client` (عميل REST نوعي).
- DB: PostgreSQL + PostGIS (لاحقاً)؛ حالياً lat/lng decimal. Redis (cache/queue/broadcast). بثّ: Reverb. دفع: CliQ. AI: OpenAI. Push: FCM.

## 3) طبقات الـ Backend
`Core` (ApiResponse/BaseService/Repository/Exceptions/Middleware/RBAC/Audit) · `Shared` (Enums + Traits) · `Infrastructure` (SMS · Push/FCM · Gpt/OpenAI) · `Modules` (المجال) · بثّ Events.

### الموديولات (30)
| الموديول | الوظيفة |
|---|---|
| Auth · Users · Students · Drivers | الهوية + الملفات + توثيق الكباتن |
| Universities · Areas · PickupPoints · Routes · Zones | الكتالوج الجغرافي |
| Subscriptions | الخطط + اشتراكات الطلاب |
| RideRequests · Matching | طلب باب-لباب + محرّك التجميع + **تسعير Express/min-fill** |
| Trips | الرحلات + Trip OTP + التتبّع + بث Reverb |
| Wallet · Payouts | محفظة مسبقة الدفع (فلس) + سحب أرباح الكباتن |
| Payments | CliQ + **GPT Vision** + اعتماد تلقائي/يدوي + تفعيل الاشتراك/الشحن |
| Notifications | DB + FCM + **SMS fallback للحرج** + تفضيلات |
| Ratings | تقييم ثنائي + متوسط الكابتن |
| Support · Complaints · Disputes | تذاكر L1–L4 + تصنيف خطورة + مركز النزاعات + **تجميد تلقائي** |
| Safety | Risk Flags + Cancellation Logs + كشف احتيال + **SOS + جهات اتصال الطوارئ** |
| Chat | محادثة طالب↔كابتن مرتبطة بالرحلة |
| Parcels | توصيل طرود + **OTP مزدوج (استلام/تسليم)** + سلسلة عهدة |
| Rewards | نقاط + مستويات + كسب تلقائي بالرحلات |
| LostFound · Exchange | المفقودات (مطابقة) + التبادل الطلابي |
| Addresses | العناوين المحفوظة للطالب |
| Reports | التقارير المالية للإدارة (للقراءة) |
| AI | مساعد رفيق + المحادثات (GPT) |

> **ملاحظة:** حُذف نهائياً (RFQ-199) موديول `Guardians` وتطبيق `guardian-app` — استُبدل بجهات اتصال الطوارئ في `Modules/Safety`.

## 4) دورة المال ومكافحة الاحتيال (أولوية قصوى)
- كل الدفع عبر **CliQ** → محفظة مسبقة الدفع. الكابتن يتقاضى **من المنصة** (لا كاش) + حجز العمولة (config: 15%).
- **OTP صعود + OTP إنزال/تسليم** على الطرفين. تسجيل الإلغاءات + Risk Flags + SOS. الشكوى الحرجة → تجميد فوري + تحقيق.
- التسعير: أجرة أساس + رسوم Express + مضاعف ذروة **ضمن سقف عادل** عند نقص الركّاب (min-fill) + معاينة أرباح الكابتن.

## 5) عميل الـ API (نطاقات `RafeeqApi`)
auth · profile · driver · admin · catalog · transport · driverTrips · wallet · payments · notifications · ratings · rideRequests · support · complaints · parcels · rewards · lostFound · exchange. كلها نوعية، استجابة موحّدة `{data,meta,message}`، Accept-Language تلقائي.

## 6) نظام التصميم (DS v2) — راجع `DESIGN.md`
هوية أردنية: أخضر `#0B7A43` + ذهبي `#E6B23E` + أحمر `#CE1126`، فاتح/داكن. مكوّنات موحّدة + أيقونات Feather + Bottom Tabs. **تطبيق الطالب أُعيد تصميمه بالكامل**؛ الكابتن/الإدارة يرثان الهوية (إعادة تصميم شاشاتهما الكاملة قيد العمل).

## 7) التكاملات اليدوية (مفاتيح env — كلها اختيارية ويعمل النظام بدونها)
| التكامل | env | بدونها |
|---|---|---|
| OpenAI (Vision/AI) | `OPENAI_API_KEY` | مراجعة دفع يدوية |
| Firebase FCM | `FIREBASE_*` | إشعار داخل التطبيق فقط (log) |
| CliQ | `CLIQ_*` | تعليمات تحويل عامة |
| SMS | `SMS_*` | log |
| Reverb | `REVERB_*` + `extra.reverb*` | polling |
| الخرائط | `GOOGLE_MAPS_KEY`/`MAPBOX_TOKEN` | إحداثيات نصية |

## 8) التشغيل محلياً
- Backend: `cd backend && composer install && php artisan migrate:fresh --seed && php artisan serve`
- Frontend: `cd frontend && npm install` ثم `npm run student` / `npm run driver` / `npm run admin`
- CI (GitHub Actions): يشغّل إقلاع Laravel + `tsc` للتطبيقات الثلاثة عند كل push.

## 9) الحالة (~82%)
- ✅ **مكتمل**: كل backend القلب التشغيلي + الخدمات الإضافية + الدفع + الإشعارات + التقييم + الدعم/الشكاوى + الأمان/SOS + عميل API كامل + **تطبيق الطالب (تصميم كامل)** + CI + تدقيق أمني.
- ⏳ **متبقٍّ**: إعادة تصميم كاملة لتطبيق الكابتن ولوحة الإدارة + شاشات Auth/Onboarding + **طبقة AI** (مساعد/Fraud Monitor/Route Intelligence) + **خرائط فعلية** + صفحات إدارة (تحليلات/إعدادات/Audit UI) + صلابة الإطلاق (اختبارات/Docker/PostGIS/سياسات قانونية).


---

## معمارية النظام التفصيلية (System Architecture)

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


---

## خريطة الكود (Code Map)

# 🗺️ خريطة الكود (Code Map) — وين ألاقي كل إشي

> هذا الملف "GPS" المشروع. إذا حسّيت إنه في "دهاليز"، ارجعله — بيوصّلك لأي إشي بسطر.

## نظرة عامة (مستوى أعلى)
```
Rafeeq-JO/
├── backend/        ← الـ API (Laravel). كل المنطق هنا.
├── frontend/       ← كل الواجهات + الكود المشترك (workspace واحد)
│   ├── student-app/      تطبيق الطالب (Expo)
│   ├── driver-app/       تطبيق الكابتن (Expo)
│   ├── admin-dashboard/  لوحة الإدارة (قادم)
│   └── packages/
│       ├── shared/       ألوان/خطوط/ترجمة/أنواع/فاليديشن
│       └── api-client/   عميل الاتصال بالـ API
└── docs/           ← كل التوثيق + الخطة + الحالة
```

## الـ Backend — القاعدة الذهبية للتنقّل
في الـ backend في **4 طبقات** فقط، احفظها وبتعرف وين تروح دايماً:

| المجلد | شو فيه | إمتى تفتحه |
|--------|--------|-----------|
| `backend/Core/` | أدوات النظام (استجابة API، أخطاء، صلاحيات، middleware) | نادراً — بس لو بدك تعدّل سلوك عام |
| `backend/Shared/` | ثوابت مشتركة: **Enums** (الحالات)، أدوات (Phone)، UUID | لمّا تضيف حالة/نوع جديد |
| `backend/Infrastructure/` | الاتصال بالخارج: SMS، (لاحقاً GPT/CliQ/Firebase) | لمّا تضيف خدمة خارجية |
| `backend/Modules/<الاسم>/` | **منطق الميزات** — هون 90% من شغلك | لأي ميزة (Auth, Drivers, Trips...) |

## داخل أي موديول (مثال: `Modules/Drivers/`)
كل موديول نفس الترتيب — بمجرد ما تحفظه، كل الموديولات بتفهمها فوراً:

| المجلد داخل الموديول | المسؤولية | "بدي أعدّل..." |
|----------------------|-----------|----------------|
| `Controllers/` | يستقبل الطلب ويرجّع الرد (رفيع، بدون منطق) | شكل الـ endpoint |
| `Services/` | **منطق الأعمال الحقيقي** | القواعد والمنطق |
| `Models/` | تمثيل جداول قاعدة البيانات | الحقول والعلاقات |
| `Requests/` | التحقق من المدخلات (validation) | قواعد التحقق |
| `Resources/` | شكل البيانات المُرجعة (JSON) | شو يرجع للتطبيق |
| `Routes/api.php` | تعريف المسارات | إضافة/تعديل مسار |
| `Database/Migrations/` | تعريف الجداول | بنية الجدول |
| `Providers/` | يربط الموديول بالنظام | نادراً |

## "بدي أضيف Endpoint جديد" — 5 خطوات ثابتة
1. أضف الدالة في `Services/` (المنطق).
2. أضف `Requests/` للتحقق (إذا في مدخلات).
3. أضف الدالة في `Controllers/` (تنادي الـ Service وترجّع `Resource`).
4. سجّل المسار في `Routes/api.php`.
5. (إذا جدول جديد) أضف `Database/Migrations/`.

## "بدي أضيف موديول جديد كامل"
انسخ بنية موديول موجود (مثلاً Students)، غيّر الأسماء، وسجّل الـ Provider في
`backend/bootstrap/providers.php`. خلص.

---

## الـ Frontend (مثال: تطبيق الطالب)
```
frontend/
├── package.json    ← جذر الـ workspace (هون بتعمل npm install)
├── packages/       ← مشترك (shared: تصميم/ترجمة/أنواع · api-client)
└── student-app/    (ومثلها driver-app / admin-dashboard)
    ├── app/            ← الشاشات (توجيه تلقائي حسب اسم الملف - expo-router)
    │   ├── (auth)/        شاشات قبل الدخول (welcome, register, otp, login)
    │   └── (app)/         شاشات بعد الدخول (home/dashboard, ...)
    └── src/
        ├── components/    عناصر واجهة (Button, Input, Banner, Screen)
        ├── lib/           api (الاتصال) + storage (حفظ التوكن)
        ├── store/         الحالة العامة (auth) — zustand
        ├── i18n.tsx       اللغة + RTL
        └── theme.ts       الألوان والخطوط
```
> ملاحظة: الأقواس `(auth)` و`(app)` مجرّد **تجميع** ولا تظهر في الرابط. هي ميزة expo-router لتنظيم الشاشات حسب الحالة.

### "بدي أضيف شاشة جديدة"
أنشئ ملف `.tsx` داخل `app/(app)/` (مثلاً `app/(app)/trips.tsx`) — بصير له مسار تلقائياً.

---

## ليش هالتقسيم؟ (الفلسفة)
- **فصل المسؤوليات:** كل ملف مسؤوليته واحدة → سهل تلاقي الخطأ وتعدّل بدون ما تكسر غيره.
- **قابلية التوسّع:** لمّا يصير عندنا 25 موديول، لو كل إشي بملف واحد كبير بتصير فوضى. الطبقات بتخلّي كل موديول معزول.
- **يطابق مخططك الأصلي** اللي حطيته بأول المشروع (Controllers/Services/Models/...).

## لو بتفضّل ترتيب أبسط؟
في خيار بديل: نخلّي ملفات الموديول الصغيرة بمستوى أقل تعشيشاً (مثلاً ملف الـ Provider والـ Console مباشرة بجذر الموديول بدل مجلدات لكل ملف). إذا بتحب هالاتجاه، قللي **"بسّط بنية الموديولات"** وأنا بعيد ترتيبها بشكل أوضح وأقل مجلدات — مع تحديث كل المسارات والـ namespaces بأمان.


---

## دليل الوحدات (Module Guide)

# دليل الوحدات — بنية المشروع وكيفية التوسّع (Module Guide)

> هدف هذا الملف: أن يفهم أي مطوّر جديد البنية بسرعة، ويضيف وحدة جديدة **بنمط موحّد، نظيف، وقابل للتوسّع** دون كسر شيء.

---

## 1. الطبقات (Layered Architecture)

```
backend/
├── Core/            # البنية التحتية للتطبيق (لا منطق أعمال)
│   ├── Http/        # Controller الأساس، Middleware (RBAC/Locale/Audit)، ApiResponse
│   ├── Services/    # BaseService
│   ├── Repositories/# BaseRepository + RepositoryInterface
│   ├── Exceptions/  # DomainException + ApiExceptionRenderer (JSON موحّد)
│   ├── Support/     # أدوات عامة (Safely — تشغيل آمن للآثار الجانبية)
│   ├── Audit/       # سجل التدقيق
│   ├── Permissions/ # RBAC (Role/Permission/HasRoles)
│   └── Console/     # أوامر عامة (db:schema-doc)
├── Shared/          # أنواع مشتركة بلا تبعيات (Enums, Traits/HasUuid, Support/Phone)
├── Infrastructure/  # تكاملات خارجية خلف عقود (Contracts): Sms, Push, Gpt
│   └── كل تكامل: Contract + تطبيق حقيقي + تطبيق Null/Log آمن
└── Modules/         # وحدات الأعمال (30 وحدة) — كلٌّ مستقلّ بذاته
```

**قاعدة التبعية:** `Modules → Core/Shared/Infrastructure`. لا تعتمد Core على Modules.

## 2. تشريح الوحدة (Anatomy of a Module)

```
Modules/<Name>/
├── Controllers/     # رفيعة: تتحقق + تفوّض للـ Service + تُرجع Resource
├── Services/        # منطق الأعمال (يمتد BaseService)
├── Models/          # Eloquent (يستخدم HasUuid)
├── Requests/        # FormRequest للتحقّق
├── Resources/       # JsonResource لتشكيل الاستجابة
├── Routes/          # api.php (داخل /api/v1، بحُرّاس مناسبة)
├── Database/
│   └── Migrations/  # هجرات الوحدة
├── Providers/       # <Name>ServiceProvider (يحمّل routes + migrations + يربط)
├── Console/         # (اختياري) أوامر artisan
└── Enums/           # (اختياري) أنواع خاصة بالوحدة
```

## 3. خطوات إضافة وحدة جديدة (Checklist)
1. أنشئ مجلد `Modules/<Name>/` بالأقسام أعلاه.
2. **Migration**: `Modules/<Name>/Database/Migrations/YYYY_MM_DD_create_xxx_table.php` — مفتاح UUID، المال بالفلس، فهارس على الأعمدة المُستعلَمة، `deleted_at` إن لزم الحذف الناعم.
3. **Model**: `use HasUuid;` + `$fillable` + `casts()` + العلاقات.
4. **Service**: يمتد `BaseService`، يحتوي منطق الأعمال. غلّف الآثار الجانبية بـ `Safely`.
5. **Request/Resource/Controller**: تحقّق ← خدمة ← Resource. الكنترولر رفيع.
6. **Routes**: تحت `/api/v1`، بحُرّاس (`auth:sanctum` + `role`/`permission`).
7. **Provider**: حمّل `loadRoutesFrom` + `loadMigrationsFrom` + اربط أي عقود + سجّل أوامر Console.
8. **سجّل الوحدة** في `backend/bootstrap/providers.php`.
9. **اختبارات**: أضف `tests/Feature/<Name>Test.php` تغطّي المسار السعيد + حالات الفشل + الصلاحيات.
10. **وثّق**: شغّل `php artisan db:schema-doc` لتحديث مرجع قاعدة البيانات، وحدّث `docs/PROGRESS.md`.

## 4. الاصطلاحات (Conventions)
- **المفاتيح**: UUID عبر `HasUuid`.
- **المال**: بالفلس (`*_fils`) كـ integer — لا أرقام عشرية.
- **الهاتف**: طبّعه عبر `Shared/Support/Phone` (E.164 أردني).
- **الأخطاء**: ارمِ `DomainException`/`BusinessRuleException` — تُعرض JSON موحّد تلقائياً.
- **الآثار الجانبية**: غلّفها بـ `Safely::run()`؛ نفّذها بعد نجاح الكتابة الأساسية.
- **المسارات**: `/api/v1/...`. التسمية kebab. الحُرّاس صريحة.
- **i18n**: لا نصوص مكتوبة بالواجهة — استخدم قاموس `@rafeeq/shared` (ar/en).

## 5. الفرونت (Frontend)
```
frontend/
├── packages/shared/      # أنواع + ثيم + i18n + validators (لا تبعية على تطبيق)
├── packages/api-client/  # عملاء REST نوعيون (واحد لكل مجال)
├── student-app/          # Expo (RN + TS)
├── driver-app/           # Expo (RN + TS)
└── admin-dashboard/      # Next.js + Tailwind
```
- أضف عميل API جديد في `packages/api-client` + الأنواع في `packages/shared`.
- كل شاشة جديدة تستهلك العميل النوعي ولا تنادي fetch مباشرة.

## 6. الجودة قبل الدمج (Definition of Done)
- `php -l` نظيف + **PHPUnit أخضر** (`./vendor/bin/phpunit`).
- `tsc --noEmit` أخضر لكل حِزم الفرونت + ESLint للـ admin بلا تحذيرات.
- `migrate:fresh --seed` ينجح على PostgreSQL.
- لا أسرار في الكود (كلها عبر `.env`).
- توثيق محدّث (`PROGRESS.md` + `DATABASE_SCHEMA` عبر الأمر).


---

## الصلابة والتحمّل (Resilience & Fault Tolerance)

# الصلابة والتحمّل — رفيق (Resilience & Fault Tolerance)

> **المبدأ الحاكم:** فشل أي جزء غير أساسي **يجب ألا يُسقط التطبيق** ولا يكسر معاملة أساسية.
> صُمِّمت المنصة بحيث تعمل حتى عند تعطّل الخدمات الخارجية (OTP، الدفع، الإشعارات، الخرائط، الذكاء الاصطناعي، البثّ الحيّ).

---

## 1. تصنيف العمليات

| النوع | أمثلة | سياسة الفشل |
|------|--------|--------------|
| **أساسية (Essential)** | إصدار/تحقّق OTP يحرس التسجيل، خصم المحفظة الذي يحرس الصعود، إنشاء الرحلة | تُظهر الخطأ للمستخدم برسالة واضحة (لا تُبتلع) — لكن لا تُسقط الخادم (تُعرض كـ JSON موحّد) |
| **أثر جانبي (Side-effect)** | إشعار push، SMS، بثّ Reverb، سجل التدقيق، تحليل GPT، النقاط | **تُغلَّف بـ `Safely`** — تُسجَّل وتُبتلع، ولا تكسر العملية الأساسية أبداً |

## 2. أداة `Safely` (Core/Support/Safely.php)
```php
use Rafeeq\Core\Support\Safely;

// تشغيل أثر جانبي بأمان (يرجع bool):
Safely::run(fn () => $this->notifications->notify(...), 'notify.trip_started');

// إنتاج قيمة مع بديل عند الفشل:
$score = Safely::value(fn () => $this->ai->assess($trip), default: 0, context: 'ai.assess');
```
> لا تستخدمها حول المنطق الأساسي (OTP/المحفظة) — تلك يجب أن تُظهر أخطاءها.

## 3. مصفوفة التكاملات الخارجية (Fallback Matrix)

| التكامل | عند غياب المفتاح | عند فشل وقت التشغيل | المرجع |
|---------|------------------|---------------------|--------|
| **OTP (WhatsApp/SMS)** | `LogSmsGateway` (يكتب في اللوق، التطبيق يعمل) | يُظهر "تعذّر الإرسال، حاول لاحقاً" (لا يُسقط) | `Infrastructure/Sms/*` |
| **Push (FCM)** | `LogPushGateway` | يُسجَّل، يرجع status string — **لا يرمي** | `Infrastructure/Push/FcmPushGateway` |
| **GPT (OpenAI)** | `NullGptClient` → مراجعة يدوية / ردّ بديل | try/catch → مراجعة يدوية (دفع) أو ردّ مُعلَّب (مساعد) | `Infrastructure/Gpt/*`, `Payments/AI`, `AI/AssistantService` |
| **CliQ (الدفع)** | تدفّق المراجعة اليدوية | المراجعة اليدوية تبقى تعمل | `Payments` |
| **البثّ (Reverb)** | `BROADCAST_CONNECTION=log` (افتراضي آمن) | polling عبر `/trips/{id}/location` بديل | `config/broadcasting` |
| **الخرائط (Google)** | بديل OSM/Leaflet | يعرض إحداثيات/قائمة | `services.maps` |
| **Redis** | `CACHE/SESSION=file`, `QUEUE=sync` يعملان بدون Redis | — | `.env` |

## 4. معالجة الأخطاء المركزية
- كل أخطاء الـ API تُعرض كـ JSON موحّد عبر `Core/Exceptions/ApiExceptionRenderer` — والحالة الافتراضية تُرجع **500 برسالة عامة آمنة** (لا تكشف تفاصيل في الإنتاج). لا يوجد مسار يُسقط الخادم بصفحة بيضاء.
- `NotificationService.notify()` و`AuditLogger.log()` **مغلَّفان ولا يرميان أبداً** (مُغطّى باختبارات).

## 5. توصيات للمعاملات الحرجة (Best Practice)
- في PostgreSQL، أي خطأ داخل `DB::transaction` يُفسد المعاملة كاملةً. لذلك:
  - نفّذ الكتابات الأساسية أولاً، ثم أطلق الآثار الجانبية (إشعار/بثّ) **بعد** نجاحها.
  - للمسارات الأكثر حساسية، استخدم `DB::afterCommit(fn () => ...)` كي تُطلق الإشعارات بعد الـ commit فقط.
- استخدم timeouts صريحة على كل طلبات HTTP الخارجية (مطبّقة: 15–60s).
- لا تعتمد على خدمة خارجية في مسار حرج بدون بديل.

## 6. ما يُنصح به قبل الإطلاق (تشغيلي)
- مراقبة (Sentry/Logtail) + تنبيهات على معدّل الأخطاء.
- Health checks دورية (DB/cache/queue) + إعادة تشغيل تلقائية.
- Rate limiting (مطبّق على auth) + حماية من إساءة الاستخدام.
- نسخ احتياطي يومي لقاعدة البيانات + خطة استرجاع.
