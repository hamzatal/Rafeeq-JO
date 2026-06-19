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
