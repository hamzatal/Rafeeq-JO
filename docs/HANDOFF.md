# 📦 ملف التسليم الشامل — رفيق (Rafeeq)

> **للمحادثة الجديدة: اقرأ هذا الملف + `docs/PROGRESS.md` + `docs/ROADMAP.md` + `.kiro/steering/` قبل أي عمل.**
> آخر commit: **RFQ-079**. الفرع: `foundation/phase-0-1`. نسبة الإنجاز التقديرية: **~58%** (الأساس والقلب التشغيلي ~90%).
> **محدّث (M1+M2):** اكتمل backend لموديولات **Payments (CliQ+GPT Vision)** و**Notifications (FCM+SMS fallback)** و**Ratings** + بنية **Gpt** و**Push**. راجع `docs/EXECUTION_PLAN.md` للخطة الكاملة M1–M10.
> القواعد: لا اختصار، لا حذف مزايا، لا ديمو داتا. commits مرقّمة `[RFQ-###]`. حدّث PROGRESS + README مع كل push.

---

## ✅ المُنجز بالكامل

### البنية (Foundation)
- Monorepo: `backend/` (Laravel 11 modular monolith) + `frontend/` (workspace JS: student-app, driver-app, admin-dashboard, packages/shared, packages/api-client) + `docs/` + `docker-compose.yml`.
- Core (ApiResponse موحّد، Base Controller/Service/Repository، Exceptions، Middleware: ForceJson/SetLocale/Role/Permission/Audit)، Shared (Enums + HasUuid + Phone + validators)، Infrastructure (SMS gateway: log/http).
- RBAC (roles/permissions/HasRoles) + Audit logging. مفاتيح UUID. أموال بالفلس.

### موديولات الـ Backend المكتملة
1. **Auth**: تسجيل + OTP (hashed/TTL/cooldown/throttle) + دخول كلمة مرور + دخول OTP + إعادة تعيين + logout + Sanctum tokens (UUID) + seeders (أدوار + أدمن).
2. **Users**: ملف شخصي (تعديل/كلمة مرور/تغيير هاتف بـ OTP/حذف حساب) + قائمة مستخدمين للإدارة.
3. **Students**: ملف الطالب + onboarding + reward_tier.
4. **Drivers**: ملف الكابتن + المركبات + الوثائق (رفع على disk آمن) + مراجعة/اعتماد/رفض/إيقاف من الإدارة + تنزيل الوثائق.
5. **Universities**: CRUD + قائمة عامة + بذور 4 جامعات إربد (اليرموك/JUST/إربد الأهلية/جدارا).
6. **Areas**: CRUD + قائمة عامة.
7. **PickupPoints**: CRUD + قائمة + فلترة (FK areas + universities).
8. **Routes + RouteStops**: CRUD + محطات مرتّبة + قائمة/تفاصيل.
9. **Subscriptions**: خطط (أسبوعي/شهري/فصلي) + اشتراك (pending→active→expired/cancelled) + تفعيل + استهلاك رحلة.
10. **Zones**: CRUD + "أقرب منطقة" (Haversine) + بذور 6 مناطق إربد.
11. **RideRequests**: طلب باب-لباب (إحداثيات البيت→الجامعة) + تعيين زون تلقائي + Express.
12. **Matching**: محرّك تجميع (زون+جامعة، حجم سيارة 4) + أمر `rafeeq:match-rides` (كل 5 دقائق) + تشغيل يدوي للإدارة + عروض الكابتن (offers) + قبول (accept).
13. **Trips**: جدولة/بدء/إنهاء/إلغاء + حجز الطالب + **Trip OTP** (كود صعود) + تأكيد الصعود + تتبّع (trip_tracking) + أحداث Reverb.
14. **RideBilling** (دورة المال): خصم من محفظة الطالب/استهلاك اشتراك + حجز عمولة المنصة + أرباح الكابتن (كلها عبر المنصة).
15. **Wallet**: رصيد + حركات (موقّعة، قفل صفّي) + تعليمات شحن CliQ + اعتماد شحن من الإدارة.
16. **Realtime (Reverb)**: أحداث `TripLocationUpdated` + `TripStatusChanged` (افتراضي broadcast=log).
17. **Safety**: Risk Flags + Cancellation Logs + كشف احتيال بقواعد (إلغاء مع ركّاب / معدّل إلغاء عالٍ) + **SOS** (طوارئ) + واجهة إدارة (علامات/إلغاءات/SOS).

### الـ Frontend المكتمل
- **packages/shared**: نظام ثيم Light/Dark (`buildTheme`) + i18n (ar/en + RTL) + كل الأنواع + validators + constants + **شعار جديد (دائري) SVG**.
- **packages/api-client**: عملاء نوعيون (Auth, Profile, Driver, Admin, Catalog, Transport, DriverTrips) + معالجة أخطاء موحّدة.
- **student-app (Expo)**: تفضيلات (ثيم/لغة) + ثيم ديناميكي + i18n + مكوّنات (Button/Input/Banner/Screen) + شاشات: ترحيب/تسجيل/OTP/دخول + الرئيسية + الاشتراكات + الرحلات (حجز + كود صعود + تتبّع نصي) + الإعدادات + Splash متحرّك. Light/Dark + ar/en (افتراضي عربي/فاتح).
- **driver-app (Expo)**: نفس البنية + لوحة الكابتن + الوثائق + المركبة + رحلاتي (جدولة) + تفاصيل الرحلة (بدء/إنهاء + تأكيد صعود) + الإعدادات + Splash. Light/Dark + ar/en (افتراضي داكن).
- **admin-dashboard (Next.js)**: دخول الموظفين + Layout (Sidebar + Topbar) + Light/Dark + ar/en + الرئيسية + الكباتن (قائمة + مراجعة/اعتماد/رفض/إيقاف + عرض الوثائق) + المستخدمون + الجامعات (CRUD) + اللوجو/Favicon الجديد.

### الهوية البصرية
- **لوجو جديد كلياً (دائري + حرف "ر" + حلقة مدارية)** طُبّق على كل السبلاش + الترحيب + الإدارة.
- Light/Dark + عربي/إنجليزي في كل التطبيقات الثلاثة.

---

## ⏳ المتبقّي (بالتفصيل الممل)

### Backend — موديولات لم تُبنَ بعد
- **Payments (CliQ + GPT Vision)**: إنشاء Payment Request برقم فريد (RFQ-YYYY-#####) + رفع إشعار التحويل + **تحقق بالـ GPT Vision** (مبلغ/وقت/رقم/مستفيد) + اعتماد تلقائي/شبه تلقائي + **تفعيل الاشتراك/شحن المحفظة تلقائياً** + مركز الشفافية المالية + ضمان رفيق (تذكرة تلقائية عند التأخير).
- **Ratings (تقييم ثنائي)**: جدول ratings + تقييم الطالب للكابتن والعكس + تحديث `driver_profiles.rating_avg/rating_count`.
- **Notifications**: جدول notifications (DB) + تفضيلات + قنوات (DB + **FCM push** + email) + إطلاق عند الأحداث (حجز/اعتماد/دفع/SOS...).
- **Complaints**: شكاوى بمستويات خطورة (منخفض/متوسط/مرتفع/حرج) + في الحرج: **تجميد الحساب فوراً + فتح تحقيق + إشعار الإدارة**.
- **Support**: تذاكر دعم بتصعيد (L1 Rafeeq AI → L2 موظف → L3 مشرف → L4 إدارة) + رسائل التذاكر.
- **Parcels**: إرسال أغراض (sender/receiver/from-to/category/fee) + parcel_events (chain of custody) + **OTP تسليم + OTP استلام** + سياسة ممنوعات + ربط بالرحلات.
- **LostFound**: مفقودات (lost/found) + **مطابقة ذكية GPT**.
- **Exchange**: التبادل الطلابي (كتب/ملازم/أدوات).
- **Rewards (Rafeeq Rewards)**: reward_accounts + reward_transactions + قواعد كسب النقاط + المستويات (Bronze/Silver/Gold/Platinum) + المكافآت.
- **Analytics + Reports**: تقارير ولوحات + تصدير + AI Analytics.
- **Settings**: إعدادات منصة DB-backed (أسعار/سياسات/نصوص/feature flags) بدل config الثابت.
- **AI Layer كامل**: RafeeqAssistant، SupportAssistant، ComplaintAnalyzer، **AI Fraud/Safety Monitor** (فوق الأساس القائم)، RouteIntelligence، LostFound Matching، Vision (PaymentVerification/DriverVerification/Parcel)، Moderation. (يتطلب `Infrastructure/Gpt` + OPENAI_API_KEY.)
- **Face/Liveness verification**: تكامل مزوّد KYC (نخزّن نتيجة فقط) لطبقات الأمان 4 و5.
- **Express dynamic pricing + min-fill** + **dispute center** + **تسوية أرباح الكباتن (cash-out/payout)** + **No-show penalties** + **خيار نسائي** + **referral** + **مشاركة الرحلة مع ولي الأمر** + **SMS fallback**.

### Frontend — متبقٍّ
- **student-app**: شاشة **طلب رحلة باب-لباب** (RideRequests API جاهز) + **خريطة تتبّع حيّة** (Google/Mapbox) + **المحفظة + الشحن (CliQ)** + الأغراض + المفقودات + النقاط + الدعم + **مساعد رفيق (AI)** + تعديل الملف + **اختيار الجامعة (onboarding)** + **زر SOS** + الإشعارات + استقبال Reverb.
- **driver-app**: شاشة **العروض (offers) وقبولها** (API جاهز) + **خريطة/ملاحة + بث الموقع (GPS خلفي)** + **المحفظة/الأرباح** + زر SOS + الإشعارات + استقبال Reverb.
- **admin-dashboard**: صفحات إدارة النقل (**المسارات/الخطط/المناطق/نقاط التجمّع/الرحلات (مراقبة حيّة)/طلبات الركوب/تشغيل التجميع**) + **مركز الأمان** (Risk Flags/SOS/Cancellations) + **مراجعة المدفوعات (CliQ)** + **شحن المحافظ** + الشكاوى + الدعم + التحليلات + الإعدادات + الإشعارات + عارض Audit + الصلاحيات + **خريطة حيّة لكل الرحلات**.
- **Realtime client**: Laravel Echo + pusher-js (بروتوكول reverb) في التطبيقات + الإدارة.

### الجودة والإطلاق
- اختبارات (unit/feature/e2e) + CI (GitHub Actions) + Dockerfiles للإنتاج + بيئات (staging/production) + نسخ احتياطي + مراقبة/لوقات + أصول المتاجر (أيقونات PNG من الـ SVG) + PWA + سياسات قانونية (خصوصية/شروط/ممنوعات الطرود/احتفاظ بيانات) + مراجعة أمان + تحويل lat/lng إلى PostGIS للاستعلامات المكانية المتقدّمة.

---

## 🔌 التكاملات اليدوية (طريقة الإضافة وجلب المفاتيح) — تُنفّذ قرب الإطلاق

| التكامل | كيف تجيب المفتاح | وين تحطه | كيف يشتغل |
|---------|------------------|----------|-----------|
| **OTP/SMS** | الآن: وضع `log` (الرمز يظهر في `otp_debug` وفي `storage/logs/laravel.log`). للإنتاج: زوّد SMS أردني (مثل Unifonic) | `backend/.env`: `SMS_DRIVER=http`, `SMS_API_KEY`, `SMS_BASE_URL`, `SMS_SENDER_ID` | عدّل `Infrastructure/Sms/HttpSmsGateway` لشكل طلب المزوّد |
| **الخرائط** | Google Maps Platform key أو Mapbox token | backend `services.maps.*`؛ التطبيقات عبر `app.json > extra` أو `EXPO_PUBLIC_*`؛ الإدارة `NEXT_PUBLIC_*` | `react-native-maps` (موبايل) + Google JS/Mapbox GL (ويب) لعرض التتبّع |
| **OpenAI (GPT + Vision)** | مفتاح من platform.openai.com | `backend/.env`: `OPENAI_API_KEY` (+ `OPENAI_CHAT_MODEL`/`OPENAI_VISION_MODEL`) | يُبنى `Infrastructure/Gpt` + موديول AI؛ Vision لتحقق الدفع |
| **Firebase FCM** | ملف خدمة Firebase + project id | `backend/.env`: `FIREBASE_CREDENTIALS`, `FIREBASE_PROJECT_ID`؛ التطبيقات: إعداد Expo notifications | تسجيل device token + إرسال إشعارات |
| **CliQ** | alias المستفيد + اسم البنك | `backend/.env`: `CLIQ_ALIAS`, `CLIQ_BANK_NAME`, `CLIQ_BENEFICIARY_NAME` | تعليمات التحويل + رفع الإشعار + تحقق Vision |
| **Reverb (تتبّع حيّ)** | `composer require laravel/reverb` ثم `php artisan reverb:start` | `backend/.env`: `BROADCAST_CONNECTION=reverb` + `REVERB_*` | التطبيقات تشترك بقناة `trip.{id}` عبر Echo |
| **PostgreSQL/PostGIS** | Docker (`postgis/postgis`) موجود في docker-compose | `backend/.env`: `DB_CONNECTION=pgsql` | للاستعلامات الجغرافية المتقدّمة (اختياري الآن) |

---

## ▶️ التشغيل الكامل
**Backend:**
```bash
cd backend && cp .env.example .env && composer install
php artisan key:generate
# تطوير سريع بدون Docker: عدّل .env إلى DB_CONNECTION=sqlite (واحذف DB_DATABASE) + CACHE_STORE=file + SESSION_DRIVER=file + QUEUE_CONNECTION=sync
php artisan migrate:fresh --seed && php artisan serve
```
حساب الأدمن المزروع: هاتف `0790000000` كلمة المرور `Rafeeq@2026`.

**Frontend:**
```bash
cd frontend && npm install
npm run student   # http://localhost:8081
npm run driver    # http://localhost:8082
npm run admin     # http://localhost:3000
```

## ⏭️ الخطوة التالية المقترحة (للمحادثة الجديدة)
**اكتمل (backend):** Payments (CliQ + GPT Vision)، Notifications (FCM + SMS fallback)، Ratings، وبنية Gpt + Push. التالي حسب `docs/EXECUTION_PLAN.md`:
**M3** — عميل **Echo/Reverb** + شاشات الخريطة الحيّة (طالب/كابتن/إدارة) + **Express** (تسعير ديناميكي + min-fill)، ثم **واجهات Frontend** للدفع/الإشعارات/التقييم، ثم **صفحات إدارة النقل**، ثم Support/Complaints، ثم باقي الخدمات (Parcels/LostFound/Rewards) ثم **طبقة AI**. آخر رقم commit مستخدم: **RFQ-079** (التالي RFQ-080).

رسالة الانتقال: "أكمل مشروع رفيق (hamzatal/Rafeeq-JO، فرع foundation/phase-0-1). اقرأ docs/HANDOFF.md و docs/EXECUTION_PLAN.md و docs/PROGRESS.md و docs/ROADMAP.md و .kiro/steering/ وكمّل من M3 — آخر commit RFQ-079، التالي RFQ-080. بدون اختصار أو حذف مزايا."
