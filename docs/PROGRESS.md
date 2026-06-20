# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/HANDOFF.md` (ملخّص شامل) و`docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-252 |
| نسبة الإنجاز | ~99% (كود) · **Laravel 12 (أمان) + مساعد بـ function-calling + فواتير PDF + ترجمة backend واعية بالـ locale + حوكمة AI + مكافحة احتيال CliQ** · 135 اختبار |
| المرحلة الحالية | **منصّة مكتملة المزايا، 30 وحدة backend · 71 اختبار · ~194 مسار. ✅ تشغيل فعلي مُتحقَّق على PostgreSQL 16 (migrate+seed+E2E). المتبقّي: التكاملات الخارجية + تلميع + إطلاق** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
> **العمل الحالي:** خطة إصلاح شامل وتجهيز للإطلاق (11 مهمة) — **اكتملت كلها ✅** + تحسينات تصميم (RFQ-216). راجع `docs/LAUNCH_CHECKLIST.md` للمتبقّي التشغيلي.

### 📊 نسبة الإنجاز الحقيقية (صادقة، بلا تجميل)
| البُعد | النسبة | الحالة الفعلية |
|--------|--------|----------------|
| **الباك إند (منطق + APIs)** | **~95%** | حقيقي وشغّال فعلياً — 114 اختبار + يعمل على PostgreSQL 16 + E2E حيّ. ليس ديمو. |
| **الفرونت (كود + أنواع)** | **~90%** | كل الشاشات مكتوبة + `tsc` أخضر للحزم الخمس. **لكن غير مُجرّب على أجهزة حقيقية ولا EAS build.** |
| **التكاملات الخارجية (حقيقية)** | **~20%** | الكود جاهز ويعمل بـ fallback آمن، لكن **غير موصول بحسابات/مفاتيح حقيقية** (CliQ/FCM/WhatsApp/Maps/OpenAI). |
| **التشغيل والنشر (إنتاج)** | **~30%** | لا خادم إنتاج/Redis/دومين/SSL/متاجر بعد. |
| **الإجمالي كـ"نظام يعمل فعلياً"** | **~75%** | الجوهر (تسجيل/رحلات/دفع/محفظة/كوبونات/مكافآت/أمان) يعمل حقيقةً عبر API. |
| **الإجمالي كـ"منتج مُطلَق للمستخدمين"** | **~55%** | يلزم: مفاتيح حقيقية + بناء وتجربة على أجهزة + نشر بنية تحتية + Pilot. |

> **الخلاصة الصادقة:** المشروع **ليس ديمو** — الباك إند والمنطق حقيقيان ومُختبَران. الفجوة للإطلاق ليست في الكود بل في: (1) ربط مفاتيح المزوّدين الحقيقية، (2) بناء التطبيقات وتجربتها على هواتف فعلية، (3) نشر البنية التحتية. التفاصيل الكاملة في `docs/LAUNCH_CHECKLIST.md`.

**✅ تم (RFQ-244 → RFQ-250) — تلميع الهوية + OTP وهمي + بيانات تجريبية + إرسال إشعارات:**
- **هوية وخطوط (RFQ-244, 248):** favicon من اللوجو، خط أرقى (IBM Plex Sans Arabic + Plus Jakarta Sans) على الأدمن **والتطبيقين**، شريط تمرير عصري، إصلاح أيقونة البحث، تلميحات أنيقة + نص توضيحي على الأزرار (مثل زر التجميع).
- **OTP وهمي (RFQ-245):** التطبيقان يعبّئان الكود التجريبي تلقائياً (فريد كل مرة) — تسجيل دخول بضغطة لحين توفّر مفتاح WhatsApp Cloud.
- **بيانات تجريبية (RFQ-246):** `DemoSeeder` — 15 طالب + 6 كباتن + مركبات/محافظ/اشتراكات/كوبونات/شكاوى/إشعارات/رحلات. التشغيل: `php artisan db:seed --class=Database\\Seeders\\DemoSeeder`.
- **إرسال إشعارات من الأدمن (RFQ-247):** صفحة `/notifications` — استهداف (الكل/طلاب/كباتن) + إرفاق كوبون، عبر `/admin/notifications/send` (صلاحية users.manage). صندوق الإشعارات + "قراءة الكل" موجودان أصلاً.
- **Splash + ترحيب (RFQ-249, 250):** إزالة السيارة المتحركة → شعار نابض + مؤشّر نقاط أنيق على خلفية الخريطة (التطبيقان)؛ شاشة الترحيب بعبارات تحفيزية متحركة («أنت وشطارتك توصل لهدفك») ودخول متحرّك.
- **ملاحظة:** خلفية شاشة دخول الأدمن = خريطة عمّان (واضحة)، وخلفية الـ splash = صورة الماب — الصورتان مضغوطتان.
- **تدفّق الكوبون بتطبيق الطالب (RFQ-252):** زر **تفعيل الكوبون** داخل الإشعار (يتحقّق ويُظهر "منتهٍ/غير صالح" من الـ backend ويحفظه)، وحقل كوبون بشاشة طلب الرحلة يُعبّأ تلقائياً من المُفعّل مع زر **تطبيق** يُظهر قيمة الخصم.


- **مساعد بـ function-calling (RFQ-231):** المساعد ينفّذ أدوات فعلية (يفتح تذكرة دعم، يجلب تعليمات الشحن) عبر OpenAI tool-calling بحلقة آمنة + fallback.
- **فواتير PDF + شاشة الكابتن (RFQ-232):** حفظ/مشاركة الفاتورة PDF على الجهاز (طالب + كابتن) عبر expo-print/sharing؛ شاشة فواتير/شحن مستقلّة للكابتن.
- **ترقية Laravel 12 (RFQ-233):** أزالت كل ثغرات إطار v11 السبع (composer audit نظيف).
- **ترجمة ثنائية اللغة كاملة (RFQ-234, 236, 238-242):** **كل الـ 25 enum** ثنائية اللغة و`*_label` تتبع `Accept-Language`، **وكل صفحات لوحة الأدمن مترجمة** (نصوص ثابتة عبر `useT()`). + لوجو عصري جديد، خلفية خريطة عمّان واضحة بشاشة دخول الأدمن، وخلفية ماب واضحة بـ splash تطبيقي الطالب والكابتن.



> **سياق:** فحص شامل (شغّل 114 اختبار، رُكّب Larastan لتحليل ساكن على كل الكود، قُرئت 59 migration وخدمات الـ AI والتكامل) + إصلاح المشاكل المُبلّغة من التجربة الحيّة + ذكاء اصطناعي موسّع + تحسينات UX. **النتيجة: 132 اختبار أخضر.**

- **🛡️ تحقّق CliQ مضاد للاحتيال (RFQ-223):** مطابقة اسم المُرسِل + المستفيد + رقم العملية البنكي (يُستخدم مرّة) + بصمة الصورة (SHA-256) + كشف التعديل → اعتماد تلقائي فقط لو كل الفحوصات نظيفة، وإلا مراجعة بشرية. يضمن عدم شحن الحساب الخطأ.
- **🤖 ذكاء اصطناعي موسّع:** تحقّق الفواتير بالاسم (RFQ-220)، فرز الدعم بالمشاعر + رد مقترح (RFQ-226)، فرز الشكاوى كشبكة أمان تصعّد الحالات الخطرة المُصنّفة غلط (RFQ-227)، وحوكمة تكلفة (سقف tokens شهري لكل مستخدم + كاش) (RFQ-229).
- **🔴 أخطاء حقيقية أُصلحت:** علاقات `Trip` الناقصة (انهيار عروض الكابتن) (RFQ-217)، وفقدان pagination meta بكل المسارات المرقّمة (RFQ-224).
- **لوحة الأدمن:** اتجاه/i18n + سايدبار، ملف شخصي، إدارة فريق الأدمن، شحن المحفظة، بحث/إشعارات (RFQ-217/218)، قسم CliQ + تغيير alias (RFQ-219).
- **UX (RFQ-228):** تلميحات عند المرور، بحث عام (command palette)، إعادة تصميم شاشة الدخول بخلفية خريطة عمّان، صفحات بعرض كامل.
- **متبقٍّ:** مساعد بـ function-calling · فواتير PDF + شاشة كابتن · ترجمة كامل الصفحات · ترقية إطار Laravel (3 ثغرات).

**✅ تم (RFQ-216) — تحسينات التصميم (خريطة + سبلاش):**
- **خلفية خريطة طرق أردنية متجهة (`MapBackdrop` SVG)** على سبلاش الطالب والكابتن (شبكة طرق + عُقد مدن + مسار مميّز) — بديل أنيق وخفيف عن صورة (الصورة المرفوعة لم تكن موجودة في الريبو فعلياً). أُضيف `react-native-svg`.
- **إعادة تصميم `LiveMap` بالكامل**: دبابيس teardrop عصرية بظل ناعم + قلب أبيض، شارة سيارة دائرية للكابتن مع نبضة، وخط مسار بـ casing أبيض (مظهر تطبيقات الخرائط) — لكل من Google JS API و Leaflet/OSM.
- التحقق: tsc أخضر لكل حزم الفرونت.



**✅ تم (RFQ-215) — المهمة 11: اختبارات E2E شاملة + تجربة حقيقية:**
- **`EndToEndFlowTest`** (4 سيناريوهات HTTP): تسجيل→OTP→token→مسار محمي + رفض غير المصادق، أدمن ينشئ كوبون→طالب يتحقق، endpoint الرؤى، RBAC يمنع الطالب من مسارات الأدمن.
- **تشغيل E2E حيّ على PostgreSQL 16** (14 فحص): health/config، تسجيل/توكن، profile/rewards، دخول أدمن + 6 مسارات إدارة، RBAC 403، كوبون خصم، رؤوس أمان — **كلها خضراء**.
- **إصلاح بَق مكتشَف**: `reward_accounts` لمستخدم جديد كان `tier=null` → `/rewards` 500. أُضيفت قيم افتراضية للنموذج + اختبار انحدار.
- تقوية: `LogSmsGateway`/`LogPushGateway` صارا لا يرميان أبداً (يحميان مسار OTP الحرج).
- **النتيجة النهائية: 114 اختبار باك أخضر + tsc أخضر لكل حزم الفرونت الخمس + E2E حيّ ناجح.**

---

## لوحة التقدّم

**✅ تم (RFQ-204) — المهمة 1: تدقيق قاعدة البيانات + التوثيق:**
- تشغيل فعلي مُتحقَّق على **PostgreSQL 16** (migrate:fresh + seed + تدفّق E2E: register→verify-otp→token→مسار محمي).
- توحيد كل ملفات التوثيق على مصدر واحد (30 وحدة · 71 اختبار · ~194 مسار · 3 تطبيقات).
- ملف **`docs/DATABASE_SCHEMA.md`** (موصوف بالمجالات) + **`docs/DATABASE_SCHEMA.generated.md`** (مُولَّد آلياً) + أمر **`php artisan db:schema-doc`**.
- تحسين تطبيعي: إزالة العمود المكرّر `student_profiles.reward_tier` (المصدر الوحيد الآن `reward_accounts.tier`، شكل الـ API بلا تغيير).

**التالي — المهمة 11:** اختبارات E2E شاملة + تجربة حقيقية بدون أخطاء.

**✅ تم (RFQ-214) — المهمة 10: تقوية الأمان:**
- **`SecurityHeaders` middleware** على كل استجابات API: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` صارم، + **HSTS عند HTTPS فقط** (لا يكسر التطوير المحلي).
- **Throttling عام**: `throttle:api` (120/دقيقة per-user/IP) على كل المسارات + `throttle:sensitive` (20/دقيقة) على التحقق من الكوبونات (معرّفة في CoreServiceProvider). `throttle:auth` كما هو.
- التحقق: 109 اختبار باك (2 جديدة SecurityHeadersTest) + الرؤوس مؤكّدة على استجابة حيّة.
- ملاحظات موثّقة في SECURITY.md (toكن الأدمن localStorage→httpOnly، HTTPS بالإنتاج، أسرار عبر Secrets Manager).

**✅ تم (RFQ-213) — المهمة 9: تحسينات الذكاء الاصطناعي:**
- **مساعد الطالب أصبح واعياً بالسياق**: `AssistantService` يحقن لقطة حيّة من حساب الطالب (رصيد المحفظة + النقاط + الاشتراك الفعّال + الرحلة القادمة) في prompt الـGPT → إجابات دقيقة عن "كم رصيدي/متى رحلتي". مغلّف بـSafely (لا يكسر المساعد أبداً) + fallback مُعلّب بلا مفتاح.
- **تحليل سردي للمخاطر (admin)**: `GET /admin/ai/risks/{userId}` صار يرجّع `assess()` الكامل (score + factors + patterns) + **narrative بـGPT** (توصية إجراء) مع fallback قاعدي واضح.
- التحقق: 107 اختبار باك (2 جديدة AssistantTest) + tsc أخضر.

**✅ تم (RFQ-212) — المهمة 8: نظام نقاط وحوافز للطالب والكابتن:**
- **`RewardService` موسّع**: ثوابت (POINTS_PER_RIDE=10, FIRST_RIDE_BONUS=50, REFERRAL_BONUS=100, POINTS_PER_JOD=100) + **`grantForRide`** (نقاط أساسية + حافز أول رحلة مرة واحدة) + **`redeemForWallet`** (استبدال النقاط برصيد محفظة، 100 نقطة = 1 د.أ، ذرّي) + **`redemptionOptions`** (كتالوج).
- `RideBillingService` يستخدم `grantForRide` (الطالب يكسب + بونص أول رحلة). الكابتن يكسب عند إكمال الرحلة (موجود).
- `WalletTxnType::RewardRedemption` جديد. مسارات `/rewards/options` + `/rewards/redeem-wallet`.
- فرونت: `RewardsApi.options/redeemToWallet` + نوع `RewardRedemptionOption` + شاشة المكافآت للطالب (أزرار استبدال بالرصيد + بانر) + i18n.
- التحقق: 105 اختبار باك (5 جديدة للمكافآت) + tsc أخضر لكل الفرونت.

**✅ تم (RFQ-211) — المهمة 7: نظام كوبونات وخصومات شامل وذكي:**
- موديول جديد **`Modules/Coupons`**: جدولا `coupons` + `coupon_redemptions`، نموذجان، enums `CouponType` (percentage/fixed) + `CouponScope` (any/subscription/wallet_topup/ride).
- **`CouponService`**: validate (يتحقق من الصلاحية + النطاق + الجامعة/الخطة + الحد الأدنى + حدود الاستخدام الكلي/لكل مستخدم + أول عملية) + computeDiscount (نسبة بسقف / مبلغ ثابت، لا يتجاوز المبلغ) + redeem (ذرّي بقفل صف) + CRUD.
- مسارات: `POST /coupons/validate` (معاينة) + `admin/coupons` CRUD (صلاحية `coupons.manage` مزروعة للأدمن والمشرف).
- **ربط بالدفع**: `payment_requests` + عمودا `coupon_id`/`discount_fils`؛ `createRequest` يقبل `coupon_code` (خصم على ما يُدفع)؛ شحن المحفظة يضيف المبلغ الأصلي (الكوبون = بونص)؛ الاستبدال عند الاعتماد (Safely). 
- صفحة admin `/coupons` (إنشاء + جدول + تفعيل/حذف) + مجموعة المالية. api-client AdminApi coupons + أنواع Coupon.
- التحقق: 100 اختبار باك (9 جديدة للكوبونات) + tsc أخضر + **E2E حقيقي** (أدمن أنشأ WELCOME20 → طالب تحقق: خصم 2000 على 10000 = 8000؛ نطاق خاطئ مرفوض).

**✅ تم (RFQ-209/210) — المهمة 6: لوحة إدارة كاملة + ذكية بـGPT:**
- **رؤى ذكية (GPT)**: `AdminInsightsService` يجمع مؤشرات المنصة + تحليل وتوصيات بالعربية عبر GPT (fallback قاعدي بلا مفتاح) → `GET /admin/ai/insights` + صفحة `/insights` (تحليل + توصيات + 12 بطاقة مؤشر).
- **إدارة النقل الكاملة**: صفحات `/routes` (CRUD) + `/plans` (CRUD) + `/subscriptions` (قائمة + تفعيل) + `/trips` (مراقبة) + endpoint `GET /admin/trips` جديد. مجموعة "النقل" في الـ Sidebar.
- api-client: طرق admin للنقل (routes/plans/subscriptions/trips) + AssistantApi.insights + أنواع AdminInsights + ENDPOINTS.
- التحقق: 91 اختبار باك أخضر + tsc أخضر لكل الفرونت + **E2E حقيقي** (دخول أدمن → insights + trips + routes + subscriptions كلها 200).

**✅ تم (RFQ-208) — المهمة 5: تجهيز خرائط جوجل بالكامل:**
- **الباك**: endpoint عام **`GET /api/v1/config`** (مفتاح الخرائط + المزود + المركز الافتراضي + flags) — مصدر واحد للمفتاح. **`MapsService`** (Geocoding + Distance Matrix بـ Google عند توفر المفتاح، fallback haversine دائم، لا يرمي أبداً).
- **الفرونت**: ترقية `LiveMap` لاستخدام **Google Maps JS API الرسمي** عند توفر المفتاح (بدل بلاطات mt1 غير الرسمية) + OSM fallback. المفتاح يُجلب من `/config` (lib/appConfig) مع fallback لـ app.json. أُضيفت الخريطة لتطبيق **الكابتن** (شاشة الرحلة → خريطة ملاحة بنقاط الالتقاط) + ConfigApi + نوع AppConfig + مزامنة نوع TripPassenger (pickup_lat/lng/student_name).
- التحقق: 89 اختبار باك أخضر (منها 6 للخرائط) + tsc أخضر لكل الحزم + `/config` E2E.
- ملاحظة: بمجرد وضع `GOOGLE_MAPS_KEY` في backend/.env يعمل كل شي تلقائياً (خرائط جوجل + geocoding + distance).

**✅ تم (RFQ-207) — المهمة 4: OTP عبر WhatsApp Cloud API الرسمي:**
- بوابة رسمية **`WhatsAppCloudSmsGateway`** (Meta Graph API): وضع **template** (قالب authentication + الرمز كمعامل body + زر copy-code) للـ OTP خارج نافذة 24س، ووضع **text** للنص الحرّ. يستخرج الرمز تلقائياً، يطبّع الرقم الأردني، يخفي الأرقام في اللوق، صلب (استثناء واضح عند غياب الإعداد/فشل Meta).
- مربوطة عبر `SMS_DRIVER=whatsapp_cloud` في `InfrastructureServiceProvider` (OpenWA لا يزال متاحاً كبديل). إعدادات `services.whatsapp_cloud` + `.env.example` (WHATSAPP_CLOUD_*).
- دليل **`docs/WHATSAPP_OTP.md`** (خطوات Meta + الطبقة المجانية + الصلابة).
- التحقق: 83 اختبار أخضر (منها 4 جديدة للبوابة الرسمية).

**✅ تم (RFQ-206) — المهمة 3: نظام الإشعارات الكامل + الصوت:**
- **الباك**: `NotificationType` صار يحدّد القناة + الأولوية + الصوت لكل نوع (rafeeq_rides/critical/trips/payments/default). `FcmPushGateway` يبني بلوكات android+apns مع **sound + channel_id + priority** (طلبات الكابتن MAX + صوت، تنبيهات حرجة عالية). عقد `PushGateway` وُسِّع بـ `$options` (متوافق رجعياً).
- **الفرونت**: كان **ناقصاً تماماً** — أُضيف `expo-notifications` + `expo-device` لتطبيقي الطالب والكابتن + `src/lib/push.ts` (تسجيل توكن FCM الأصلي، قنوات أندرويد بالصوت، معالج foreground يعرض ويشغّل الصوت، إلغاء التسجيل عند الخروج) مربوط في auth store. كله صلب (لا يكسر التطبيق على web/المحاكي/بلا Firebase).
- التحقق: 79 اختبار باك أخضر + **tsc أخضر لكل حزم الفرونت** (طالب/كابتن/shared/api-client).
- ملاحظة: القنوات تستخدم صوت `default` الآن؛ لإضافة نغمة مميزة لطلب الكابتن، أسقِط ملف صوت في إعداد plugin `expo-notifications` (`sounds`) وحدّث `sound` للقناة.

**✅ تم (RFQ-205) — المهمة 2: تنظيم البنية + الصلابة (Resilience):**
- أداة **`Core/Support/Safely`** لتشغيل الآثار الجانبية بأمان (تُسجّل وتُبتلع، لا تكسر المعاملة الأساسية) + 4 اختبارات.
- تقوية **`AuditLogger`** و**`NotificationService.notify()`** ليصبحا لا يرميان أبداً (مغلّفان).
- توثيق **`docs/RESILIENCE.md`** (سياسة الصلابة + مصفوفة fallback للتكاملات) + **`docs/MODULE_GUIDE.md`** (البنية + كيفية إضافة وحدة جديدة + best practices).
- التحقق: 75 اختبار أخضر + migrate:fresh + E2E على PostgreSQL.

> التكاملات اليدوية: `OPENAI_API_KEY`، `FIREBASE_*` (FCM)، `CLIQ_*`، `WHATSAPP_*` (OTP رسمي قادم). كلها اختيارية — النظام يعمل بأمان بدونها (fallback).

---

## لوحة التقدّم

### Phase 0 — الأساس (backend ✅ / frontend ⏳)
- ✅ Monorepo, docker-compose, .gitignore, README, editorconfig
- ✅ هيكل Laravel 11 (bootstrap/app.php, providers, public/index.php, artisan)
- ✅ config/* (app, auth, database, cache, queue, session, sanctum, services, cors, filesystems, logging, otp)
- ✅ Core (ApiResponse, Controller, Service, Repository, Exceptions, Middleware)
- ✅ Shared (Enums + HasUuid + Phone helper)
- ✅ Infrastructure (SMS gateways + provider)
- ✅ RBAC (Role/Permission/HasRoles) + Audit (model+logger) + migrations
- ✅ frontend/packages/shared (design tokens + i18n ar/en + types + utils + validators)
- ✅ frontend/packages/api-client (typed REST client + auth/profile/driver APIs + RafeeqApiError)
- ✅ frontend/student-app (Expo: RTL + Tajawal + monorepo metro + auth flow + home)
- ✅ frontend/driver-app (Expo Navy: auth + documents upload + vehicle + submit-for-review + status)
- ✅ **إعادة هيكلة:** الجذر صار frontend/ (workspace JS) + backend/ (Laravel)
- ✅ frontend/admin-dashboard (Next.js + Tailwind: دخول موظفين + مراجعة/اعتماد الكباتن + قائمة المستخدمين)
- ⏳ CI (GitHub Actions)

### Phase 1 — الهوية والأمان ✅ (Backend)
- ✅ Auth: migrations (framework/users/otp/tokens/rbac/audit), Models, OtpService, AuthService, Requests, Resource, Controller, Routes, Provider, throttling
- ✅ Command prune-otps + Seeders (RolesPermissions + Admin)
- ✅ **Users**: ProfileService (تحديث، كلمة مرور، تغيير هاتف بـ OTP، حذف حساب) + Controller/Routes/Provider
- ✅ **Students**: student_profiles + StudentService + Controller/Resource/Routes/Provider
- ✅ **Drivers**: driver_profiles + vehicles + driver_documents + (Driver/Vehicle/Document/Review) services + رفع وثائق على disk آمن + مراجعة واعتماد إدارة + Controllers/Routes/Provider
- ⏳ شاشات Frontend للمصادقة (مع تأسيس الـ frontend)
- ⏳ Face/Liveness verification (تكامل فعلي في Phase 5 — الأعمدة جاهزة)

### Phase 2 — النقل 🔄
- ✅ **Universities** (backend): migration + model + service + CRUD admin + public list + 7 جامعات أردنية مزروعة. شامل: shared type + api-client (catalog + admin CRUD) + صفحة الجامعات في لوحة الإدارة.
- ✅ **Areas** (backend): CRUD admin + قائمة عامة (name_ar/en, governorate, lat/lng).
- ✅ **PickupPoints** (backend): CRUD admin + قائمة عامة + فلترة بالمنطقة/الجامعة (FK لـ areas + universities).
- ✅ **Routes + RouteStops** (backend): مسار (جامعة + منطقة + سعر بالفلس + سعة + أيام + وقت) مع محطات مرتّبة (نقاط تجمّع) — CRUD admin (مع مزامنة المحطات في transaction) + قائمة/تفاصيل للطلاب.
- ✅ **Subscriptions** (backend): خطط (weekly/monthly/term + سعر + عدد رحلات/غير محدود + مدة) + اشتراك الطالب (pending→active→expired/cancelled) + تفعيل (بعد الدفع) + استهلاك رحلة. CRUD خطط للإدارة + اشتراكاتي للطالب + إدارة.
- ✅ **Trips** (backend - قلب النظام): جدولة رحلة (كابتن معتمد) + بدء/إنهاء/إلغاء + حجز الطالب (يتطلب اشتراك فعّال + فحص السعة) + **Trip OTP** (كود صعود لكل راكب) + تأكيد الصعود من الكابتن (يستهلك رحلة) + تتبّع الموقع (trip_tracking, polling الآن).
- ⏳ Reverb (بث لحظي) — لاحقاً (حالياً polling عبر `/trips/{id}/location`)
- ✅ **واجهة الطالب للنقل:** شاشة الاشتراكات (تصفّح الخطط + اشتراك + اشتراكاتي) + شاشة الرحلات (رحلاتي مع كود الصعود + رحلات متاحة + حجز + تتبّع الموقع) + ربط من الرئيسية.
- ✅ **واجهة الكابتن للنقل:** شاشة رحلاتي (جدولة باختيار مسار + وقت) + تفاصيل الرحلة (بدء/إنهاء/إلغاء + قائمة ركاب + تأكيد صعود بالكود Trip OTP).
- ✅ توسعة api-client: TransportApi + DriverTripsApi + catalog.listRoutes + الأنواع المشتركة.
- ⏳ صفحات الإدارة للنقل (Routes/Plans/Subscriptions/Trips) في لوحة Next.js
- ملاحظة: نستخدم lat/lng (decimal) بدل PostGIS حالياً ليبقى SQLite شغّال؛ PostGIS لاحقاً للاستعلامات المكانية المتقدّمة.

### Phase 3 — الدفع ✅ (backend)
- ✅ **Infrastructure/Gpt**: عميل OpenAI (chat + vision) عبر `GptClient` + `OpenAiGptClient` (HTTP) + `NullGptClient` (fallback آمن بدون مفتاح → مراجعة يدوية). مربوط في `InfrastructureServiceProvider`.
- ✅ **Payments** (backend كامل): `payment_requests` (رقم `RFQ-YYYY-#####` تسلسلي) + `payments` (إشعار التحويل + استخراج + درجة ثقة). تدفّق: إنشاء طلب → تعليمات CliQ → رفع إشعار التحويل → **تحقق GPT Vision** → اعتماد تلقائي عند تطابق واثق وإلا طابور مراجعة بشرية → **تفعيل تلقائي** (شحن المحفظة عبر `WalletService` / تفعيل الاشتراك عبر `SubscriptionService`). يعمل بالكامل بدون مفتاح AI عبر المراجعة اليدوية. صلاحيات `payments.view`/`payments.approve`.
- ⏳ واجهات الطالب/الإدارة للدفع (Frontend) + مركز الشفافية المالية (UI)

### Phase 6 (جزء) — الإشعارات + التقييم ✅ (backend)
- ✅ **Infrastructure/Push**: `PushGateway` + `FcmPushGateway` (Firebase HTTP v1 مع OAuth2/JWT من service-account) + `LogPushGateway` (fallback).
- ✅ **Notifications**: `rafeeq_notifications` + `notification_preferences` (تفضيلات لكل مستخدم؛ السلامة لا تُعطَّل) + `device_tokens`. `NotificationService.notify()`: **دائماً DB** + **FCM** عند التفعيل + **SMS fallback** للحرج (طوارئ/تجميد/إلغاء رحلة). لا يرمي استثناء أبداً (لا يكسر معاملة العمل).
- ✅ **Ratings**: `ratings` (تقييم ثنائي طالب↔كابتن، نجمة لكل رحلة/مقيّم/اتجاه) + تحديث `rating_avg`/`rating_count` للكابتن تلقائياً.
- ✅ **الربط**: الدفع (اعتماد/رفض/تفعيل) + الرحلة (اكتمال → دعوة تقييم، إلغاء → إشعار الركّاب) + الطوارئ (تأكيد للمستخدم + تنبيه فريق السلامة).

### Phase 4/5/7 المتبقّية ⏳
انظر `docs/ROADMAP.md` و`docs/EXECUTION_PLAN.md` (M3–M10).

### Phase 3..7 (سابقاً) ⏳
انظر `docs/ROADMAP.md`.

### ملحق A — Zone Pooling + مكافحة الاحتيال (مُعتمد، قيد التنفيذ) 🔄
- ✅ سيارات لا باصات: السعات أصبحت 4 (افتراضي) / 7 (أقصى) لكل من vehicles/routes/trips.
- ✅ **Zones** (backend): جدول + نموذج + أقرب-منطقة (Haversine) + CRUD + بذور 6 مناطق إربد.
- ✅ **RideRequests** (backend): طلب باب لباب (إحداثيات البيت → الجامعة) + تعيين الزون تلقائياً + علم express + APIs (طالب: إنشاء/طلباتي/إلغاء، إدارة: قائمة).
- ✅ توسعة `trip_passengers`: pickup_lat/lng + pickup_order + dropoff_code + dropoff_confirmed_at (OTP إنزال).
- ⏳ **محرّك التجميع (Pooling/Matching)** — التالي
- ✅ **محرّك التجميع (Matching)**: يجمّع الطلبات (زون+جامعة) برحلات بحجم السيارة (4) بحالة "بانتظار كابتن" + أمر مجدول `rafeeq:match-rides` (كل 5 دقائق) + زر تشغيل للإدارة + **عروض للكابتن (offers) وقبولها (accept)**. الرحلات صارت تدعم نوعين: scheduled / pooled (مسار وكابتن اختياري).
- ✅ **المحفظة مسبقة الدفع (Wallet)**: wallets + wallet_transactions (رصيد بالفلس، حركات موقّعة، قفل صفّي آمن) + رصيدي/حركاتي + تعليمات شحن CliQ + اعتماد شحن من الإدارة. (الكابتن يُدفع من المنصة لاحقاً عند ربط الدفع بالرحلات.)
- ⏳ المحفظة + احتساب العمولة عند إكمال الرحلة (ربط الدفع بالرحلات)
- ✅ **دورة المال**: عند تأكيد الصعود يُخصم من محفظة الطالب (إن لم يكن لديه اشتراك)، تُحجز عمولة المنصة (config: نسبة العمولة + الأجرة الافتراضية)، ويُحاسب الكابتن (يُضاف لمحفظته) — الأموال تمرّ عبر المنصة دائماً (RideBillingService).
- ✅ **التتبّع الحيّ (Reverb)**: أحداث بث `TripLocationUpdated` + `TripStatusChanged` على قناة `trip.{id}` (تُطلق عند بثّ الموقع/بدء/إنهاء/إلغاء). الافتراضي broadcast=log (آمن بدون سيرفر)؛ يُفعّل بـ reverb.
- ✅ **أساس مكافحة الاحتيال (Safety)**: جداول `risk_flags` + `cancellation_logs` + كشف بقواعد (كابتن يلغي رحلة فيها ركّاب، معدّل إلغاء عالٍ) → علامات خطورة، + واجهة إدارة (عرض/معالجة العلامات + سجل الإلغاءات). تسجيل الإلغاء مربوط بـ TripService.
- ✅ **الطوارئ + جهات اتصال موثوقة داخل تطبيق الطالب** (RFQ-198): بديل خفيف لتطبيق ولي الأمر المنفصل — الطالب يضيف جهات اتصال طوارئ (حتى 5، أساسي واحد، علم `notify_on_sos`) ويتصل بها مباشرة. عند تفعيل SOS من شاشة الطالب: التقاط الموقع (expo-location موبايل / geolocation ويب) → `SosService` يُنبّه فريق السلامة **+ يرسل SMS لجهات اتصال الطالب مع رابط موقعه الحيّ** (لا يفشل أبداً). موديول backend كامل: جدول `emergency_contacts` + `EmergencyContact` + `EmergencyContactService` (CRUD + تطبيع هاتف أردني + إدارة الأساسي) + `EmergencyContactController` + routes `/v1/emergency-contacts`. شاشة `emergency.tsx` (تسليح→تأكيد SOS + اتصال مباشر بولي الأمر + إدارة جهات الاتصال) + `EmergencyApi` + i18n (ar/en متناظر). ملاحظة: المستخدم يعتبر تطبيق ولي الأمر المنفصل غير ضروري — هذه الميزة هي البديل المعتمد.
- ✅ **OTP الإنزال (تأكيد الطرفين)**: عند تأكيد الصعود يُصدَر للطالب **كود إنزال** فريد داخل الرحلة؛ الكابتن يؤكّد النزول بإدخاله (`POST /driver/trips/{trip}/dropoff`) → الحالة `dropped` + `dropoff_confirmed_at`. إنهاء الرحلة بوجود ركّاب لم يُؤكَّد إنزالهم بالكود يرفع **علامة خطورة** (`trip_ended_without_dropoff_otp`) كدليل تسريب/رحلة وهمية. مربوط بالكامل في تطبيقي الكابتن (بطاقة إدخال) والطالب (عرض الكود). مغطّى باختبارات Feature (3 حالات: تأكيد ناجح، كود خاطئ مرفوض، إنهاء بلا تأكيد يرفع علامة).
- ✅ **محرك التسعير الحقيقي + Express** (RFQ-134): `PricingService` صار مربوطاً فعلياً بـ`MatchingService` و`RideBillingService` (انتهى السعر الثابت 1000). أعمدة تسعير على الرحلة (`is_express`, `base_fare_fils`, `express_fee_fils`, `surge_multiplier`). **Express مُفعّل**: تجميع منفصل بأولوية + سيارة خاصة لراكب واحد + رسوم مستعجل + surge ألطف (مع سقف عادل). توحيد حساب العمولة في `splitCommission()`. `TripResource` يعرض تفصيل السعر + **أرباح الكابتن المتوقعة** (preview). مغطّى باختبارات (Unit + Feature).
- ✅ **حجز الرصيد (Wallet Hold)** (RFQ-135): عمود `held_fils` + جدول `wallet_holds` (active/captured/released). `WalletService`: `hold/capture/release/availableBalance/findActiveHold` (مع قفل صفوف وذرّية). عند **بدء الرحلة** يُحجز السعر لكل راكب يدفع من المحفظة (المتاح = الرصيد − المحجوز)؛ عند الصعود يُلتقط الحجز (خصم فعلي + دفع الكابتن)؛ عند الإلغاء يُحرَّر. إشعار `WalletLowBalance` عند نقص الرصيد. مغطّى باختبارات (6 حالات).
- ✅ **كشف الاحتيال عبر GPS** (RFQ-136): جداول `driver_locations` + `ghost_trip_watches`. `GpsFraudService` (haversine): (1) **عدم تطابق الموقع عند الصعود** — تأكيد صعود والكابتن بعيد عن نقطة التقاط الراكب يرفع `boarding_location_mismatch`؛ (2) **الرحلة الوهمية** — إلغاء الكابتن لرحلة فيها ركّاب يفتح "مراقبة" زمنية لنقاط الالتقاط، وإذا اقترب الكابتن منها لاحقاً عبر نبضات موقعه يُرفع `ghost_trip_detected` (خطورة عالية). endpoint `POST /driver/location`. مغطّى باختبارات (5 حالات).
- ❌ **[أُزيلت بالكامل — RFQ-199]** بوابة ولي الأمر (Guardian Portal) (RFQ-137): وحدة جديدة `Modules/Guardians` + نوع مستخدم `guardian` + دور `guardian`. الطالب يدير أولياء أمره (إضافة برقم الهاتف/العلاقة + إلغاء) — الحساب يُنشأ تلقائياً ويُسجَّل دخوله بالهاتف+OTP. ولي الأمر يرى: **أبناءه المرتبطين**، **تتبع الرحلة الحيّ** (الكابتن/المركبة/آخر موقع GPS/نسبة الإنجاز)، **سجل الوصول الآمن** (انطلاق/وصول)، **اتصال مُقنّع بالكابتن**، و**زر طوارئ SOS بالنيابة** (يمرّ عبر `SosService`). تنبيهات **الانطلاق/الوصول** مربوطة بأمان داخل تدفق الرحلة (لا تُعطّل المعاملة أبداً). حماية صلاحيات: ولي الأمر لا يرى إلا طلابه المرتبطين (403 لغيرهم). مغطّى بـ **7 اختبارات Feature**. ملاحظة: عمود `users.type` خُفِّف من DB enum إلى string لإضافة الأنواع بأمان عبر PostgreSQL/SQLite.
- ❌ **[أُزيلت بالكامل — RFQ-199]** واجهة بوابة ولي الأمر (Frontend) (RFQ-138): **تطبيق Expo جديد `guardian-app`** (دخول بالهاتف+OTP بلا كلمة سر، ثيم Navy واقٍ): شاشة البوابة فيها مُحدِّد الطالب + بطاقة التتبع الحيّ مع خريطة OSM + شريط نسبة الإنجاز + بيانات الكابتن والمركبة + سجل الوصول الآمن (انطلاق/وصول) + **زر SOS بالضغط المطوّل 3 ثوانٍ** + اتصال بالكابتن. + شاشة **"إدارة أولياء الأمور"** في تطبيق الطالب (إضافة/قائمة/إلغاء). طبقة مشتركة: أنواع + endpoints + ثيم guardian + i18n (ar/en) + `GuardianApi`/`StudentGuardiansApi`. ⚠️ الفرونت غير مُتحقَّق بناءً هنا (node_modules غير منصّبة + baseline الـ tsc للحزمة المشتركة غير نظيف أصلاً) — يلزم تحقّق عبر CI/محلياً.
- ✅ **المحادثة داخل التطبيق (Chat) طالب↔كابتن** (RFQ-139/140): وحدة `Modules/Chat` — محادثة 1:1 مرتبطة بالرحلة بين الطالب وكابتن رحلته، مع تفويض صلاحيات لكل محادثة (الطرفان فقط، 403 لغيرهما)، رسائل + قراءة + بثّ `ChatMessageSent` (Reverb) + إشعار للطرف المستقبل (يحافظ على خصوصية رقم الهاتف). الفرونت: شاشة محادثة (فقاعات + polling كل 4ث + إرسال) في تطبيقي الطالب والكابتن، تُفتح من رحلات الطالب (محادثة الكابتن) ومن تفاصيل رحلة الكابتن لكل راكب (محادثة الطالب). مغطّى بـ **5 اختبارات Feature**.
- ✅ **سحب أرباح الكابتن (Payout) + رُتب الكابتن** (RFQ-141/142): وحدة `Modules/Payouts` — طلب السحب يخصم من محفظة الكابتن فوراً (حجز)، الأدمن يعتمد (paid) أو يرفض (يُعيد المبلغ). حدّ أدنى 5 د.أ. مسارات الكابتن `/driver/wallet/withdrawals` ومسارات الأدمن `/admin/withdrawals/*` (بصلاحية payments.*). **endpoint أداء الكابتن** `/driver/performance`: الرتبة (Bronze→Silver→Gold→Platinum من Rewards) + التقدّم للرتبة التالية + الأرباح المتاحة + التقييم + عدد الرحلات. **منح نقاط للكابتن عند إكمال الرحلة** (مربوط بأمان في `TripService.end`). الفرونت: شاشة أرباح الكابتن (بطاقة الرتبة + شريط تقدّم + زر "سحب الأرباح" + سجل السحوبات) + شاشة نموذج السحب + `PayoutApi` (تتضمن طابور الأدمن). مغطّى بـ **6 اختبارات Feature**. (واجهة طابور السحب في لوحة الإدارة Next.js مؤجَّلة — الـ API جاهز.)
- ✅ **العناوين المحفوظة (Saved Addresses)** (RFQ-143/144): وحدة `Modules/Addresses` — الطالب يحفظ مواقعه (منزل/جامعة/عمل/أخرى) بإحداثيات، مع عنوان افتراضي تلقائي وحماية ملكية (403 لغير المالك). CRUD على `/api/v1/student/addresses` + `/default`. الفرونت: شاشة عناوين الطالب (رقائق نوع + إضافة + تعيين افتراضي + حذف) + `AddressApi`. مغطّى بـ **4 اختبارات Feature**.
- ✅ **التقارير المالية للإدارة (Financial Reports)** (RFQ-145/146): وحدة `Modules/Reports` (للقراءة فقط، بلا migration) — `FinancialReportService.summary(from,to,zoneId)` يجمّع: عدد الرحلات المدفوعة + إجمالي الأجور + **عمولة المنصة (الإيراد)** + أرباح الكباتن من `trip_passengers`، + السحوبات المدفوعة من `payout_requests`، + شحن المحفظة وإيراد الاشتراكات من `payment_requests`، مع تفصيل **حسب الزون** (by_zone). مسار `GET /api/v1/admin/reports/financial` (بصلاحية `analytics.view`). الفرونت: `FinancialReportApi` + endpoints مشتركة جاهزة للربط. مغطّى بـ **3 اختبارات Feature**. (صفحة لوحة الإدارة Next.js مؤجَّلة — الـ API جاهز.)
- ✅ **المصادقة الثنائية للإدارة (MFA / TOTP)** (RFQ-147/149): تطبيق **TOTP (RFC 6238)** مكتفٍ ذاتياً بلا أي مكتبة خارجية (`TotpService`) + `MfaService` (تسجيل تدريجي begin/confirm + رموز استرداد لمرة واحدة + تحدّي دخول قصير العمر عبر cache + إيقاف). عند تفعيل MFA: تسجيل الدخول بكلمة المرور **لا يصدر توكن** بل يرجع `mfa_required` + `mfa_token`، ويُكمَل عبر `POST /auth/mfa/verify` برمز TOTP أو رمز استرداد. إدارة (مصادَق): `/auth/mfa/setup` (QR otpauth) + `/confirm` + `/disable` — **لحسابات الموظفين فقط**. أعمدة `users`: `mfa_secret` (مشفّر) + `mfa_enabled_at` + `mfa_recovery_codes` (مشفّر). الفرونت: `User.mfa_enabled` + أنواع MFA + `AuthApi.verifyMfa/mfaSetup/mfaConfirm/mfaDisable`. مغطّى بـ **7 اختبارات Feature + 5 Unit**.
- ✅ **حدود المناطق المضلّعة (Geofence / Polygon Zones)** (RFQ-148/149): عمود `zones.boundary` (مصفوفة JSON من رؤوس `[lat,lng]`) كحدّ جغرافي اختياري. `Zone::containsPoint()` خوارزمية ray-casting (نقطة داخل مضلّع) + `hasBoundary/withinRadius`. `ZoneService::nearest()` صار يحلّ بالترتيب: **احتواء المضلّع → دائرة النطاق → أقرب مركز** (متوافق رجعياً). `ZoneRequest` يتحقق من الحدود (3 رؤوس على الأقل + نطاقات صحيحة)؛ `ZoneResource` يعرض `boundary + has_boundary`. الفرونت: نوع `Zone` + `ZonesApi` (list/create/update/remove). مغطّى بـ **3 اختبارات Feature**.
- 🧹 **تنظيف وترتيب** (RFQ-150): حذف ملف التصاميم `stitch_*.zip` (13MB) من المستودع + إزالة 6 صور مكررة من جذر `docs/` (محفوظة منظّمة في `docs/img-stitch/`) + إضافة `*.zip` و`stitch_*/` إلى `.gitignore` + **دمج كل شغل المزايا (137→149) على فرع `foundation` مباشرة وإنهاء سلسلة الـ PRs المتداخلة**.
- ✅ **واجهات لوحة الإدارة (Next.js) للوحدات الجديدة** (RFQ-151→156): **دخول الموظفين بتحدّي MFA من خطوتين** + صفحة **`/withdrawals`** (طابور سحوبات الكباتن: اعتماد/رفض مع إعادة الرصيد) + صفحة **`/reports`** (تقارير مالية بنطاق تاريخ + تفصيل حسب المنطقة) + صفحة **`/zones`** (إدارة المناطق + **محرّر حدود المضلّع Geofence**) + صفحة **`/security`** (تفعيل/إيقاف MFA + رموز استرداد) + روابط Sidebar. (الفرونت غير مُتحقَّق بناءً؛ الملفات مُتحقَّقة صياغياً.)
- ✅ **مكافحة الاحتيال المتقدّمة + مركز النزاعات** (RFQ-157→160): **كشف تواطؤ** الكابتن↔الطالب عبر الإلغاءات المتكررة (`FraudMonitorService.detectCollusionFor` + `assess`) + **تجميد تلقائي** عند `score≥85` أو علامة حرجة + **وحدة `Modules/Disputes`** (ملف تحقيق يجمّع الأدلّة: علامات الخطر + الإلغاءات + مراقبات الرحلة الوهمية + درجة الخطر الحيّة؛ سير عمل فتح/إسناد/معالجة/رفض/تجميد) + **صفحة `/disputes`** في لوحة الإدارة + ربط `DisputesApi`. مغطّى بـ **11 اختبار** (المجموع 74 ناجح).
- ⏳ لوحة AI insights للنزاعات (تحليل سردي اختياري عبر GPT)
- ⏳ مزايا: نسائي، No-show، تقييم ثنائي، حوافز، مشاركة الرحلة، SMS fallback

---

## ملاحظات تقنية مهمة للاستئناف
- مفاتيح UUID عبر `HasUuid`. Sanctum يستخدم `PersonalAccessToken` بـ UUID (ignoreMigrations + usePersonalAccessTokenModel في AuthServiceProvider).
- كل موديول يُسجّل في `backend/bootstrap/providers.php` ويحمّل routes/migrations من مجلده.
- المسارات: `/api/v1/...`. مجموعات: auth (عام + throttle:auth)، profile/student/driver (auth:sanctum + role)، admin/drivers (permissions).
- `student_profiles.university_id` و`default_pickup_point_id` بدون FK حالياً — تُضاف في Phase 2.
- وثائق الكباتن تُخزّن على disk `secure` (S3/MinIO) وتُعرض عبر temporaryUrl.
- لم يُشغّل `composer install` (لا إنترنت في بيئة البناء) — كل ملفات PHP فُحصت بـ `php -l`.

## سجل الـ Commits
| RFQ | الوصف |
|-----|-------|
| 001 | infra: monorepo scaffolding + docker-compose + root configs |
| 002 | docs: business/architecture/database/security documentation |
| 003 | feat: Laravel 11 backend foundation (Core/Shared/Infrastructure + config) |
| 004 | feat: RBAC + audit logging + platform migrations |
| 005 | feat(auth): complete Auth module (OTP, register/login, password reset, seeders) |
| 006 | docs: detailed roadmap + progress tracker + steering + local-setup guide |
| 007 | feat(users): profile module (update, password, phone change via OTP, delete) |
| 008 | feat(students): student profile module |
| 009 | feat(drivers): driver profiles + vehicles + documents + admin review/approval |
| 010 | docs: update progress for Users/Students/Drivers modules |
| 011 | fix(auth): Sanctum 4 compatibility — remove removed ignoreMigrations() call |
| 012 | docs: Windows/PowerShell + SQLite no-Docker quick-start guide |
| 013 | feat(shared): design system + i18n (ar/en) + types + utils + constants |
| 014 | feat(api-client): typed REST client + auth API + error handling |
| 015 | feat(student-app): Expo scaffold (RTL/Tajawal/monorepo) + auth flow + home |
| 016 | docs: frontend setup guide + progress update |
| 017 | fix(cors+web): allow Expo dev origins (8081) + inline error banners (Alert fails on web) |
| 018 | docs: code map (navigation guide) for clearer structure |
| 019 | fix(db): sqlite database path fallback when DB_DATABASE is a Postgres name |
| 020 | feat(shared+api): modern validators + ProfileApi/DriverApi + driver i18n + payloads |
| 021 | feat(driver-app): Expo driver app (Navy) — auth + document upload + vehicle + review status |
| 022 | docs: driver app setup + progress update |
| 023 | refactor: restructure root into frontend/ (JS workspace) + backend/ (Laravel) |
| 024 | fix(storage): secure disk defaults to local (fixes flysystem S3 crash) + admin document download stream |
| 025 | change(drivers): require only national ID + driving license (dropped vehicle reg & insurance) |
| 026 | chore: remove empty scaffolding dirs (monitoring/deployment/storage) — declutter root |
| 027 | feat(backend): admin users listing endpoint (Users module) |
| 028 | feat(api-client): AdminApi (drivers review, users, secure document preview) |
| 029 | feat(admin-dashboard): Next.js admin — login + drivers review/approve + users list |
| 030 | docs: admin dashboard setup + progress update |
| 031 | fix(auth): disable stateful API mode (fixes "CSRF token mismatch" on admin login) |
| 032 | feat(universities): backend module — CRUD + public list + seed 7 Jordanian universities |
| 033 | feat(frontend): University type + api-client (catalog + admin CRUD) + admin universities page |
| 034 | docs: progress update — Phase 2 started (universities) |
| 035 | feat(areas): backend module — CRUD admin + public list |
| 036 | feat(pickup-points): backend module — CRUD + public list + area/university filters |
| 037 | docs: progress update — areas + pickup points |
| 038 | feat(routes): backend module — routes + ordered stops, CRUD admin + public list/show |
| 039 | docs: progress update — routes |
| 040 | feat(subscriptions): plans + student subscriptions (pending/active) + activate/consume ride |
| 041 | feat(trips): trips + passengers + Trip OTP boarding + live tracking (driver & student APIs) |
| 042 | docs: progress update — subscriptions + trips (Phase 2 backend complete) |
| 043 | feat(shared+api): transport types + TransportApi + DriverTripsApi + catalog routes |
| 044 | feat(student-app): subscriptions + trips screens (book, boarding code, live location) + home nav |
| 045 | feat(driver-app): trips list + scheduling + trip detail (start/end + Trip OTP boarding) |
| 046 | docs: progress update — transport UIs (student + driver) |
| 047 | feat(universities): seed Irbid universities (Yarmouk, JUST, INU, Jadara) |
| 048 | feat(brand): Rafeeq logo (SVG) + branded splash screens (student + driver) |
| 049 | docs: progress update — Irbid universities + branding |
| 050 | fix(frontend): distinct dev ports (student 8081, driver 8082) — fixes cache/origin collision |
| 051 | feat(splash): animated branded splash per app (student road, driver map, admin analytics) + admin splash |
| 052 | docs: ports + splash notes + progress update |
| 053 | docs: roadmap appendix — zone pooling, express, realtime, anti-fraud, wallet |
| 054 | chore(transport): car-sized capacities (default 4, max 7) for vehicles/routes/trips |
| 055 | feat(zones): zones module + nearest-zone matching (Haversine) + seed 6 Irbid zones |
| 056 | feat(ride-requests): door-to-door requests (auto zone + express) + passenger pickup coords + drop-off OTP |
| 057 | docs: progress update — Zone Pooling foundation (appendix A) |
| 058 | feat(matching): pooling engine (zone+university) + scheduled command + admin trigger + driver offers/accept |
| 059 | feat(wallet): prepaid wallet + transactions + CliQ top-up instructions + admin credit |
| 060 | docs: progress update — matching + wallet |
| 061 | feat(brand): premium world-class logo (mark + wordmark + admin favicon) |
| 062 | feat(shared): light/dark theme system (buildTheme) + settings i18n |
| 063 | feat(student-app): full light/dark + ar/en toggle + Settings screen |
| 064 | feat(driver-app): full light/dark + ar/en toggle + Settings screen |
| 065 | feat(admin): light/dark + ar/en toggle + Topbar + new logo/favicon |
| 066 | docs: progress update — branding + theming across all apps |
| 067 | feat(billing): ride payment + commission + captain earnings via wallet (money loop) |
| 068 | feat(realtime): Reverb broadcasting events (trip location + status) |
| 069 | feat(safety): anti-fraud foundation — risk flags + cancellation logs + detection + admin |
| 070 | docs: progress update — money loop + realtime + anti-fraud |
| 071 | feat(brand): brand-new circular emblem logo (ر lettermark + orbit ring) everywhere |
| 072 | feat(safety/sos): emergency SOS button + incidents + admin handling + critical flag |
| 073 | docs: full HANDOFF summary (done + remaining + integrations) for session continuity |
| 074 | docs: master EXECUTION_PLAN (M1–M10) + feat(infra/gpt): OpenAI chat+vision client + safe null fallback |
| 075 | feat(payments): payment_requests + payments migrations/enums/models (CliQ + RFQ-YYYY-##### numbering) |
| 076 | feat(payments): GPT-Vision proof verification + PaymentService (auto-approve / manual review / fulfil subscription+wallet) |
| 077 | feat(payments): controller + requests + resources + routes + provider (payer + admin review queue) |
| 078 | feat(notifications): FCM push infra + notifications/preferences/device-tokens + SMS fallback service & API |
| 079 | feat(ratings): two-way ratings + driver average + wire notifications into payment/trip/SOS flows |
| 080 | fix(frontend): isolate Metro cache per app (cacheVersion + EXPO_ROUTER_APP_ROOT) — student no longer opens driver app |
| 081 | fix(admin): dashboard routing — home at `/` + remove duplicate root page + correct redirects/links (fixes 404) |
| 082 | feat(brand): brand-new Jordan-inspired logo (uppercase R + رفيق + seven-pointed star + flag colors) across mark/wordmark/full/favicon |
| 083 | feat(splash): car driving along the road (student + driver + admin) replacing the moving dot |
| 084 | fix(i18n): wire hardcoded Arabic strings to dictionary (home/welcome/subscriptions/trips) + expand ar/en — fixes mixed-language UI |
| 085 | chore(security+deps): SECURITY.md review + align TypeScript ~5.3.3 + admin Accept-Language from prefs |
| 086 | feat(pricing): Express dynamic pricing + min-fill economics (PricingService) + fare estimate endpoint + config |
| 087 | feat(shared): types + ENDPOINTS for wallet/payments/notifications/ratings/ride-requests/driver-offers |
| 088 | feat(api-client): WalletApi + PaymentsApi + NotificationsApi + RatingsApi + RideRequestsApi + driver offers |
| 089 | feat(student-app): Wallet + Payments screens (CliQ top-up, proof upload, status) |
| 090 | feat(student-app): Notifications (+ preferences) + door-to-door Ride Request (with fare estimate) screens |
| 091 | feat(student-app): two-way rating on completed trips + home nav + i18n keys |
| 092 | feat(driver-app): Earnings (wallet) + Ride Offers (accept) screens + dashboard cards |
| 093 | feat(admin): Payments review queue (approve/reject/view proof) + Ride Requests monitor + matching trigger |
| 094 | docs: progress update — M3 pricing + payments/notifications/ratings UIs across all apps |
| 095 | feat(support): tickets module (L1–L4 escalation) — migrations/enums/models/service/controller/routes |
| 096 | feat(complaints): complaints module — severity triage + auto-freeze on critical + dispute escalation |
| 097 | feat(shared+api-client): support/complaints types + ENDPOINTS + SupportApi + ComplaintsApi |
| 098 | feat(admin): support tickets + complaints management pages + sidebar links |
| 099 | feat(student-app): support tickets screen (open + list) + i18n + home nav |
| 100 | feat(realtime): Laravel Echo (Reverb) client + live trip tracking on student trips screen |
| 101 | docs: progress update — support/complaints + live tracking client (M6 + M3 realtime) |
| 102 | feat(parcels): parcel delivery module — two-OTP chain of custody (pickup + delivery codes) + courier flow + events |
| 103 | feat(rewards): Rafeeq Rewards — points/tiers + earn on completed rides + redeem |
| 104 | feat(lostfound): lost & found board + keyword/category candidate matching |
| 105 | feat(exchange): campus exchange (books/notes/tools) + reserve flow + register all extra-service providers |
| 106 | feat(shared+api-client): types + ENDPOINTS + Parcels/Rewards/LostFound/Exchange API clients |
| 108 | feat(student-app): Rewards + Parcels screens + i18n |
| 109 | feat(student-app): Lost & Found + Exchange screens + home navigation |
| 110 | docs: progress update — extra services (M8) complete (backend + student UIs) |
| 111 | chore(ci+audit): GitHub Actions CI (backend boot smoke + frontend typecheck) + full static security audit report |
| 112 | feat(design): Design System v2 tokens — Jordan-inspired green+gold+red palette (light/dark) + primaryDark/primarySoft |
| 113 | feat(design): student component library — Icon (Feather) + Card/Header/Badge/EmptyState/ServiceTile/StatCard/ListRow + theme shadow |
| 114 | feat(student-app): bottom tab navigation + fully redesigned Home (hero CTA + balance + icon service grid) |
| 115 | docs: Design System v2 guide (docs/DESIGN.md) + progress update |
| 116 | feat(student-app): redesign Account/Settings (profile + quick links) + Notifications + Wallet with DS v2 components |
| 117 | feat(student-app): redesign Trips tab (cards + empty states + star ratings + live tracking) — all 5 tabs now DS v2 |
| 118 | feat(student-app): redesign Subscriptions + Ride Request screens (DS v2) + fix missing react-hooks import in Subscriptions |
| 119 | feat(student-app): redesign Support + Parcels + Lost&Found + Exchange + Payments (DS v2) — student app fully redesigned |
| 120 | chore(audit+brand): full 3-app static audit (clean) + unify admin & native splash to Jordan-green identity + ARCHITECTURE.md |
| 121 | feat(driver-app): DS v2 redesign — bottom tabs + Icon/ui components + dashboard/offers/trips/earnings/account + i18n wiring |
| 122 | feat(driver-app): redesign Documents + Vehicle screens (DS v2) + wire all hardcoded strings to i18n — driver app fully redesigned |
| 123 | fix(i18n): wire last hardcoded auth strings (OTP test code + captain badge) — zero hardcoded UI strings across both apps |
| 124 | feat(driver-app): redesign Trip Detail screen (DS v2) + wire all strings — 100% zero hardcoded Arabic across both mobile apps |
| 125 | chore(deploy): production Dockerfiles (API + admin) + prod compose + hardened .env.production + legal policies (ar) + DEPLOYMENT.md |
| 126 | test(backend): PHPUnit scaffolding (phpunit.xml + TestCase) + PricingService unit tests + auth-guard smoke tests |
| 128 | feat(ai): AI module — Rafeeq Assistant + Fraud Monitor (risk scoring) + Route Intelligence |
| 129 | feat(shared+api-client): AI types + ENDPOINTS + AssistantApi |
| 130 | feat(frontend): Rafeeq Assistant chat screen (student) + admin AI safety center |
| 132 | feat(maps): key-free LiveMap (Leaflet/OSM via WebView on native + live panel on web) — wired into trip tracking + ride-request |
| 133 | feat(trips): drop-off OTP (both-ends confirmation) — issue dropoff code on boarding + captain confirm endpoint + unconfirmed-dropoff risk flag + driver/student UI + feature tests |
| 134 | feat(pricing): wire PricingService into matching+billing (surge/min-fill/commission split) + activate Express (priority, private car, fee+surge) + fare breakdown & captain earnings preview |
| 135 | feat(wallet): pre-authorisation balance holds — held_fils + wallet_holds, hold/capture/release, hold fare on trip start, capture on boarding, release on cancel |
| 136 | feat(safety): GPS anti-fraud — ghost-trip detection (cancel watch + captain location ping) + boarding location-mismatch flag + driver location endpoint |
| 137 | feat(guardians): Guardian (parent) portal — guardian↔student links (student-managed) + live trip tracking (captain/vehicle/location/progress) + safe-arrival log + masked captain contact + SOS relay + boarding/drop-off guardian alerts wired into trip flow + 7 feature tests |
| 138 | feat(guardian-app+student): Guardian portal frontend — new Expo guardian-app (OTP login, portal: child selector, live tracking + map, safe-arrival log, hold-to-SOS, call captain) + student "Manage Guardians" screen + shared types/endpoints/theme/i18n + GuardianApi |
| 139 | feat(chat): in-app chat (student↔captain) backend — Modules/Chat (conversations + messages), trip-scoped 1:1 threads, per-conversation authorisation, ChatMessageSent broadcast + recipient notification, mark-read + 5 feature tests |
| 140 | feat(chat): in-app chat frontend — shared chat types/endpoints/i18n + ChatApi + chat screen (bubbles, poll, send) in student & driver apps, wired from student trips + driver trip-detail passenger list |
| 141 | feat(payouts): captain earnings withdrawal — Modules/Payouts (request debits wallet, admin approve/paid, reject credits back) + driver performance endpoint (tier ladder + progress + earnings) + award captain reward points on trip completion + 6 feature tests |
| 142 | feat(payouts): captain payout frontend — driver earnings screen (tier card + withdraw button + withdrawal history) + withdraw form screen + shared types/endpoints/i18n + PayoutApi (incl admin queue/approve/reject) |
| 143 | feat(addresses): student saved addresses backend — Modules/Addresses (CRUD + set-default, auto-default, ownership 403) + 4 feature tests |
| 144 | feat(addresses): saved addresses frontend — student addresses screen (label chips, add, set-default, delete) + settings entry + shared types/endpoints/i18n + AddressApi |
| 145 | feat(reports): admin financial reports aggregation module (rides/commission/captain earnings + payouts + topups/subscriptions, by-zone) + 3 feature tests |
| 146 | feat(reports): wire FinancialReportApi + shared types/endpoints + docs |
| 147 | feat(auth): two-factor authentication (TOTP RFC 6238) for staff/admin — TotpService + MfaService (enroll, login challenge, recovery codes, disable) + encrypted user columns + 7 feature + 5 unit tests |
| 148 | feat(zones): polygon geofence boundaries — zones.boundary + ray-casting containsPoint + nearest() polygon→radius→center + validation/resource + 3 feature tests |
| 149 | feat(frontend): wire MFA + zones APIs — shared types/endpoints + AuthApi MFA methods + ZonesApi |
| 150 | chore: consolidate all feature work (137→149) onto foundation + clean repo (drop 13MB design zip + dup docs images + .gitignore) |
| 151 | feat(admin): MFA-aware staff login flow (two-step credentials → TOTP/recovery) |
| 152 | feat(admin): captain withdrawals queue page (approve/reject + refund) |
| 153 | feat(admin): financial reports page (date range + per-zone breakdown) |
| 154 | feat(admin): zones management with polygon geofence vertex editor |
| 155 | feat(admin): MFA self-enrollment page (setup/confirm/recovery/disable) + sidebar nav |
| 156 | docs: mark admin dashboard UIs done in PROGRESS.md + FEATURES.md |
| 157 | feat(ai): collusion pattern detection + risk assessment (detectCollusionFor + assess) |
| 158 | feat(disputes): dispute/investigation center + auto-freeze (evidence + workflow) |
| 159 | feat(admin): dispute center frontend (DisputesApi + /disputes page + sidebar) |
| 160 | docs: advanced anti-fraud + dispute center in PROGRESS.md + FEATURES.md |
| 161 | feat(disputes): scheduled hourly fraud-sweep command (auto-freeze sweep) |
| 162 | fix(shared): @rafeeq/shared passes strict tsc (i18n widen + dedupe keys + theme type) |
| 163 | chore(frontend): dedupe @types/react so admin type-checks clean |
| 164 | fix(apps): type-check clean across student/driver/guardian (login union + Echo generic) |
| 165 | docs: frontend now fully type-checked (6 packages green) |
| 166 | chore(admin): patch Next.js security advisory (14.2.35) + enable ESLint (clean) |
| 167 | docs: CI parity verified locally + security posture note |
| 168 | ci: verify migrations+seed on PostgreSQL 16 + guardian typecheck + blocking admin lint |
| 169 | feat(admin): rebuild dashboard to Stitch enterprise design (Navy+Cyan Command Center, full-page, KPI home) |
| 170 | docs: admin dashboard redesign (Stitch enterprise) |
| 171 | feat(apps): re-theme student/captain to Stitch Navy+Cyan design system |
| 172 | feat(student): rebuild home to Stitch student layout (hero/subscription/trips) |
| 173 | feat(student): polish bottom tab bar (rounded + shadow) |
| 174 | docs: student app Stitch redesign progress |
| 175 | feat(student): navy hero welcome screen (Stitch) |
| 176 | feat(student): redesign subscriptions screen (premium cards) |
| 177 | docs: student auth + subscriptions Stitch redesign |
| 178 | fix(apps): configurable API base URL (EXPO_PUBLIC/NEXT_PUBLIC) + clear network-error message |
| 179 | docs: add docs/RUNNING.md (connect apps to backend + OpenAI key) |
| 180 | feat(student): premium wallet card (navy bank-card, cyan balance) |
| 181 | docs: student wallet Stitch redesign |
| 182 | feat(otp): WhatsApp OTP delivery via self-hosted OpenWA gateway (+3 tests) |
| 183 | docs: WhatsApp OTP setup |
| 184 | docs(running): OpenWA runs in a separate folder + API_MASTER_KEY |
| 185 | feat(theme): student app → Deep Navy #0B192C + Heritage Gold #FFBF00 (Stitch) |
| 186 | feat(apps): app-wide ErrorBoundary (student/driver/guardian) — a screen crash no longer kills the app |
| 187 | fix(apps): optimistic startup — never hang on the network at boot |
| 188 | feat(student): branded auth screens (navy+gold AuthHeader) |
| 189 | feat(student): circular gold-tinted service tiles (Stitch) |
| 190 | feat(admin): Next.js error + global-error boundaries (resilience) |
| 191 | docs: student navy+gold + resilience batch |
| 192 | feat(captain): fixed dark navy HUD theme (Stitch captain) |
| 193 | docs: captain HUD theme |
| 194 | feat(captain): HUD earnings hero on dashboard (live performance API) |
| 195 | feat(apps): unified navy hero welcome for captain + guardian |
| 196 | docs: captain HUD widgets + welcome screens |
| 198 | feat(safety): in-app emergency feature — guardian/emergency contacts (CRUD + SMS alerts on SOS with live location) + student Emergency screen (lightweight alternative to the standalone guardian app) |
| 199 | refactor(simplify): remove the standalone guardian app + Modules/Guardians portal entirely (Expo app, module, guardian user type/role, api-client, shared types/i18n/theme, student screen, test, TripService coupling) — replaced by the in-app emergency feature |
| 200 | feat(maps): richer LiveMap — route polyline, animated car marker, numbered ordered pickups, origin/destination, tap-to-pick location, legend + Google tiles when expo.extra.mapsKey is set (OSM fallback); ride-request tap-to-pick + pickup→university route; expo-location permission plugin |
| 201 | fix(security): restrict trip live-location to passengers of that trip (IDOR fix) + return 403 (not 200) on cancel-booking/cancel-subscription authorization failures |

> حدّث هذا الجدول وخانة "آخر Commit" مع كل push.
