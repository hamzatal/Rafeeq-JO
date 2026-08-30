# صور الشاشات — الحالة الفعليّة للمشروع

هذا الملف يعرض **التطبيقات الثلاثة كما تعمل فعلاً** على هذا الـ commit: صور مأخوذة من
متصفّح حقيقي، مقابل قاعدة بيانات مُهيّأة بالبيانات التي تُنتجها الـ seeders — لا صور
تصميميّة، ولا موك‑أب، ولا بيانات مُختلقة.

كل صورة نتيجة تشغيل سكربت وليست ملفاً أُضيف باليد. الفرق مهم: الصورة المُضافة يدويّاً
صحيحة يوم إضافتها فقط، أمّا هذه فيمكن إعادة توليدها بعد أي تغيير — وأي صورة قديمة تظهر
فوراً في `git status`.

| التطبيق | عدد الشاشات | المقاس |
|---|---|---|
| لوحة الإدارة | 29 | 1440×960 |
| تطبيق الطالب | 20 | 390×844 |
| تطبيق الكابتن | 15 | 390×844 |
| **المجموع** | **64** | |

## كيف تُعاد التوليد

```bash
./scripts/screenshots.sh                  # الثلاثة
./scripts/screenshots.sh student          # واحد فقط (admin | student | driver)
```

السكربت يقوم بكل شيء ثمّ ينظّف بعده: يشغّل Postgres، يُنشئ قاعدة **منفصلة** باسم
`rafeeq_demo` ويهيّئها، يشغّل الـ API، يبني لوحة التحكّم، يُصدّر التطبيقين إلى الويب
ويخدمهما، يقود Chrome عبر DevTools Protocol، ثم يُغلق كل ما شغّله.

- لا يلمس `backend/.env` إطلاقاً — يُولّد `backend/.env.local` من `.env.example`
  (والملف مُستثنى في `.gitignore`، ويرفض السكربت الكتابة فوق ملف ليس من إنشائه).
- لا يلمس قاعدة الاختبار `rafeeq_test`.
- كلمات المرور المستخدمة للصور مُعرّفة داخل السكربت وليست أسراراً حقيقيّة.

السكربت يتحقّق من مخرجاته بنفسه: يُسجّل دخول اللوحة **من داخل الصفحة** ليخزّن المتصفّح
الكوكي بقواعده، ويتأكّد أن لا صفحة محميّة ارتدّت إلى `/login`، ويفشل إذا تطابقت صورتان
بايت ببايت.

---

# ١ · لوحة الإدارة

> ⚠️ **هذا هو التصميم القديم، وهو مقصود في هذه اللحظة.** التصميم المعتمد في
> `docs/design/v2/06-admin-1/2/3` هو **18 صفحة و4 مجموعات**، والحالي **28 صفحة و6
> مجموعات**. التحويل بينهما هو **المرحلة 10** في `docs/ROADMAP.md` ولم تُنفَّذ بعد.
> هذه الصور هي خطّ الأساس الذي ستُقاس عليه المرحلة 10.

| الشاشة | المسار |
|---|---|
| [تسجيل الدخول](#login) | `/login` |
| [لوحة القيادة](#dashboard) | `/` |
| [الطلبات الحيّة](#ride-requests) | `/ride-requests` |
| [الرحلات](#trips) | `/trips` |
| [الكباتن والتوثيق](#drivers) | `/drivers` |
| [المستخدمون](#users) | `/users` |
| [المدفوعات](#payments) | `/payments` |
| [السحوبات](#withdrawals) | `/withdrawals` |
| [التقارير المالية](#reports) | `/reports` |
| [التعرفة والتسعير](#pricing) | `/pricing` |
| [مصفوفة أسعار المناطق](#zone-prices) | `/zone-prices` |
| [الباقات](#plans) | `/plans` |
| [الاشتراكات](#subscriptions) | `/subscriptions` |
| [الكوبونات](#coupons) | `/coupons` |
| [المسارات](#routes) | `/routes` |
| [المناطق](#zones) | `/zones` |
| [الجامعات](#universities) | `/universities` |
| [السلامة و SOS](#safety) | `/safety` |
| [التنازعات](#disputes) | `/disputes` |
| [الشكاوى](#complaints) | `/complaints` |
| [الدعم](#support) | `/support` |
| [الإشعارات والبثّ](#notifications) | `/notifications` |
| [الإعلانات](#ads) | `/ads` |
| [إعداد CliQ](#cliq) | `/cliq` |
| [الأمن](#security) | `/security` |
| [سجلّ التدقيق](#audit) | `/audit` |
| [المدراء والأدوار](#admins) | `/admins` |
| [التحليلات](#insights) | `/insights` |
| [ملفّي](#profile) | `/profile` |

<a id="login"></a>
**تسجيل الدخول** — `/login`

![تسجيل الدخول](design/screenshots/admin/login.png)

<a id="dashboard"></a>
**لوحة القيادة** — `/`

![لوحة القيادة](design/screenshots/admin/dashboard.png)

<a id="ride-requests"></a>
**الطلبات الحيّة** — `/ride-requests`

![الطلبات الحيّة](design/screenshots/admin/ride-requests.png)

<a id="trips"></a>
**الرحلات** — `/trips`

![الرحلات](design/screenshots/admin/trips.png)

<a id="drivers"></a>
**الكباتن والتوثيق** — `/drivers`

![الكباتن والتوثيق](design/screenshots/admin/drivers.png)

<a id="users"></a>
**المستخدمون** — `/users`

![المستخدمون](design/screenshots/admin/users.png)

<a id="payments"></a>
**المدفوعات** — `/payments`

![المدفوعات](design/screenshots/admin/payments.png)

<a id="withdrawals"></a>
**السحوبات** — `/withdrawals`

![السحوبات](design/screenshots/admin/withdrawals.png)

<a id="reports"></a>
**التقارير المالية** — `/reports`

![التقارير المالية](design/screenshots/admin/reports.png)

<a id="pricing"></a>
**التعرفة والتسعير** — `/pricing`

![التعرفة والتسعير](design/screenshots/admin/pricing.png)

<a id="zone-prices"></a>
**مصفوفة أسعار المناطق** — `/zone-prices`

![مصفوفة أسعار المناطق](design/screenshots/admin/zone-prices.png)

<a id="plans"></a>
**الباقات** — `/plans`

![الباقات](design/screenshots/admin/plans.png)

<a id="subscriptions"></a>
**الاشتراكات** — `/subscriptions`

![الاشتراكات](design/screenshots/admin/subscriptions.png)

<a id="coupons"></a>
**الكوبونات** — `/coupons`

![الكوبونات](design/screenshots/admin/coupons.png)

<a id="routes"></a>
**المسارات** — `/routes`

![المسارات](design/screenshots/admin/routes.png)

<a id="zones"></a>
**المناطق** — `/zones`

![المناطق](design/screenshots/admin/zones.png)

<a id="universities"></a>
**الجامعات** — `/universities`

![الجامعات](design/screenshots/admin/universities.png)

<a id="safety"></a>
**السلامة و SOS** — `/safety`

![السلامة و SOS](design/screenshots/admin/safety.png)

<a id="disputes"></a>
**التنازعات** — `/disputes`

![التنازعات](design/screenshots/admin/disputes.png)

<a id="complaints"></a>
**الشكاوى** — `/complaints`

![الشكاوى](design/screenshots/admin/complaints.png)

<a id="support"></a>
**الدعم** — `/support`

![الدعم](design/screenshots/admin/support.png)

<a id="notifications"></a>
**الإشعارات والبثّ** — `/notifications`

![الإشعارات والبثّ](design/screenshots/admin/notifications.png)

<a id="ads"></a>
**الإعلانات** — `/ads`

![الإعلانات](design/screenshots/admin/ads.png)

<a id="cliq"></a>
**إعداد CliQ** — `/cliq`

![إعداد CliQ](design/screenshots/admin/cliq.png)

<a id="security"></a>
**الأمن** — `/security`

![الأمن](design/screenshots/admin/security.png)

<a id="audit"></a>
**سجلّ التدقيق** — `/audit`

![سجلّ التدقيق](design/screenshots/admin/audit.png)

<a id="admins"></a>
**المدراء والأدوار** — `/admins`

![المدراء والأدوار](design/screenshots/admin/admins.png)

<a id="insights"></a>
**التحليلات** — `/insights`

![التحليلات](design/screenshots/admin/insights.png)

<a id="profile"></a>
**ملفّي** — `/profile`

![ملفّي](design/screenshots/admin/profile.png)


---

# ٢ · تطبيق الطالب

| الشاشة | المسار |
|---|---|
| [الترحيب والتعريف](#01-intro) | `/intro` |
| [الأذونات](#02-permissions) | `/permissions` |
| [ابدأ](#03-welcome) | `/welcome` |
| [تسجيل الدخول](#04-login) | `/login` |
| [إنشاء حساب](#05-register) | `/register` |
| [رمز التحقق](#06-otp) | `/otp` |
| [استعادة كلمة المرور](#07-forgot-password) | `/forgot-password` |
| [الرئيسية](#10-home) | `/home` |
| [طلب رحلة](#11-ride-request) | `/ride-request` |
| [الدفع](#12-checkout) | `/checkout` |
| [رحلاتي](#13-trips) | `/trips` |
| [المحفظة](#14-wallet) | `/wallet` |
| [الاشتراكات](#15-subscriptions) | `/subscriptions` |
| [عنواني](#16-addresses) | `/addresses` |
| [الإشعارات](#17-notifications) | `/notifications` |
| [المحادثة](#18-chat) | `/chat` |
| [المساعد الذكي](#19-assistant) | `/assistant` |
| [الدعم](#20-support) | `/support` |
| [الطوارئ](#21-emergency) | `/emergency` |
| [الإعدادات](#22-settings) | `/settings` |

<a id="01-intro"></a>
**الترحيب والتعريف** — `/intro`

![الترحيب والتعريف](design/screenshots/student/01-intro.png)

<a id="02-permissions"></a>
**الأذونات** — `/permissions`

![الأذونات](design/screenshots/student/02-permissions.png)

<a id="03-welcome"></a>
**ابدأ** — `/welcome`

![ابدأ](design/screenshots/student/03-welcome.png)

<a id="04-login"></a>
**تسجيل الدخول** — `/login`

![تسجيل الدخول](design/screenshots/student/04-login.png)

<a id="05-register"></a>
**إنشاء حساب** — `/register`

![إنشاء حساب](design/screenshots/student/05-register.png)

<a id="06-otp"></a>
**رمز التحقق** — `/otp`

![رمز التحقق](design/screenshots/student/06-otp.png)

<a id="07-forgot-password"></a>
**استعادة كلمة المرور** — `/forgot-password`

![استعادة كلمة المرور](design/screenshots/student/07-forgot-password.png)

<a id="10-home"></a>
**الرئيسية** — `/home`

![الرئيسية](design/screenshots/student/10-home.png)

<a id="11-ride-request"></a>
**طلب رحلة** — `/ride-request`

![طلب رحلة](design/screenshots/student/11-ride-request.png)

<a id="12-checkout"></a>
**الدفع** — `/checkout`

![الدفع](design/screenshots/student/12-checkout.png)

<a id="13-trips"></a>
**رحلاتي** — `/trips`

![رحلاتي](design/screenshots/student/13-trips.png)

<a id="14-wallet"></a>
**المحفظة** — `/wallet`

![المحفظة](design/screenshots/student/14-wallet.png)

<a id="15-subscriptions"></a>
**الاشتراكات** — `/subscriptions`

![الاشتراكات](design/screenshots/student/15-subscriptions.png)

<a id="16-addresses"></a>
**عنواني** — `/addresses`

![عنواني](design/screenshots/student/16-addresses.png)

<a id="17-notifications"></a>
**الإشعارات** — `/notifications`

![الإشعارات](design/screenshots/student/17-notifications.png)

<a id="18-chat"></a>
**المحادثة** — `/chat`

![المحادثة](design/screenshots/student/18-chat.png)

<a id="19-assistant"></a>
**المساعد الذكي** — `/assistant`

![المساعد الذكي](design/screenshots/student/19-assistant.png)

<a id="20-support"></a>
**الدعم** — `/support`

![الدعم](design/screenshots/student/20-support.png)

<a id="21-emergency"></a>
**الطوارئ** — `/emergency`

![الطوارئ](design/screenshots/student/21-emergency.png)

<a id="22-settings"></a>
**الإعدادات** — `/settings`

![الإعدادات](design/screenshots/student/22-settings.png)


---

# ٣ · تطبيق الكابتن

| الشاشة | المسار |
|---|---|
| [الترحيب والتعريف](#01-intro) | `/intro` |
| [الأذونات](#02-permissions) | `/permissions` |
| [ابدأ](#03-welcome) | `/welcome` |
| [تسجيل الدخول](#04-login) | `/login` |
| [إنشاء حساب كابتن](#05-register) | `/register` |
| [رمز التحقق](#06-otp) | `/otp` |
| [استعادة كلمة المرور](#07-forgot-password) | `/forgot-password` |
| [لوحة الكابتن](#10-dashboard) | `/dashboard` |
| [العروض](#11-offers) | `/offers` |
| [رحلاتي](#12-trips) | `/trips` |
| [الأرباح](#13-earnings) | `/earnings` |
| [وثائق المركبة](#14-vehicle-docs) | `/vehicle-docs` |
| [الإشعارات](#15-notifications) | `/notifications` |
| [المحادثة](#16-chat) | `/chat` |
| [حسابي](#17-account) | `/account` |

<a id="01-intro"></a>
**الترحيب والتعريف** — `/intro`

![الترحيب والتعريف](design/screenshots/driver/01-intro.png)

<a id="02-permissions"></a>
**الأذونات** — `/permissions`

![الأذونات](design/screenshots/driver/02-permissions.png)

<a id="03-welcome"></a>
**ابدأ** — `/welcome`

![ابدأ](design/screenshots/driver/03-welcome.png)

<a id="04-login"></a>
**تسجيل الدخول** — `/login`

![تسجيل الدخول](design/screenshots/driver/04-login.png)

<a id="05-register"></a>
**إنشاء حساب كابتن** — `/register`

![إنشاء حساب كابتن](design/screenshots/driver/05-register.png)

<a id="06-otp"></a>
**رمز التحقق** — `/otp`

![رمز التحقق](design/screenshots/driver/06-otp.png)

<a id="07-forgot-password"></a>
**استعادة كلمة المرور** — `/forgot-password`

![استعادة كلمة المرور](design/screenshots/driver/07-forgot-password.png)

<a id="10-dashboard"></a>
**لوحة الكابتن** — `/dashboard`

![لوحة الكابتن](design/screenshots/driver/10-dashboard.png)

<a id="11-offers"></a>
**العروض** — `/offers`

![العروض](design/screenshots/driver/11-offers.png)

<a id="12-trips"></a>
**رحلاتي** — `/trips`

![رحلاتي](design/screenshots/driver/12-trips.png)

<a id="13-earnings"></a>
**الأرباح** — `/earnings`

![الأرباح](design/screenshots/driver/13-earnings.png)

<a id="14-vehicle-docs"></a>
**وثائق المركبة** — `/vehicle-docs`

![وثائق المركبة](design/screenshots/driver/14-vehicle-docs.png)

<a id="15-notifications"></a>
**الإشعارات** — `/notifications`

![الإشعارات](design/screenshots/driver/15-notifications.png)

<a id="16-chat"></a>
**المحادثة** — `/chat`

![المحادثة](design/screenshots/driver/16-chat.png)

<a id="17-account"></a>
**حسابي** — `/account`

![حسابي](design/screenshots/driver/17-account.png)


---

## ملاحظات صادقة عمّا تراه في الصور

كل بند منها شيء ستلاحظه بنفسك، ومن الأفضل أن تعرف سببه بدل أن تظنّه خللاً:

1. **مؤشّرات المالية في اللوحة أصفار، وبعض الجداول فارغة.** سلوك **صحيح** على بيانات
   الـ seeder لا خلل في اللوحة: `DemoSeeder` يُنشئ رحلات واشتراكات وكوبونات وشكاوى،
   لكنّه **لا يُنشئ** صفوفاً في `payments` ولا `wallet_transactions` ولا `routes`
   (تحقّقتُ: ٠ في كلٍّ منها). فمؤشّر «الرحلات المدفوعة» = ٠ لأنّه لا يوجد دفع مُسجَّل.
   الرحلات موجودة فعلاً: ٥ رحلات منها ٢ مكتملة.

2. **بيانات التطبيقين حقيقيّة ومختارة بعناية.** الطالب المصوَّر هو الفهرس ١ لا ٠، لأن
   `$i % 7 === 0` يجعل الطالب ٠ **موقوفاً** فيرفض الـ API دخوله؛ والفهرس ١ له اشتراك
   نشط ورصيد ٥٠٠٠ فلس — فتظهر المحفظة والاشتراكات بحالة حقيقيّة. والكابتن هو أوّل
   كابتن **معتمد** بتقييم 4.9 و340 رحلة و42 ألف فلس.

3. **مربّعات فارغة مكان بعض الرموز التعبيريّة.** المتصفّح داخل بيئة التوليد لا يحتوي خطّ
   emoji فتظهر المحارف كمربّعات (tofu). على جهازك ستظهر طبيعيّة — سمة بيئة التصوير لا المنتج.

4. **صور اللوحة بعرض النافذة وليست الصفحة كاملة.** الشريط الجانبي
   `fixed inset-y-0 h-screen` والعلوي `sticky top-0`، وفي التصوير الطويل يُرسم العنصر
   الثابت مرّة واحدة في الأعلى فيبقى تحته عمود فارغ — أي صورة لعلّة تخطيط غير موجودة.

5. **بقايا خاصّة بالويب في التطبيقين.** الخريطة في شاشة الطالب الرئيسيّة لا تملأ العرض
   بالكامل، وnص بديل داخل حقل مبلغ CliQ يتجاوز حدّ الحقل. الشاشتان تُبنيان على
   `react-native-web` وهو يُترجم إلى CSS لا إلى Yoga، فهذه فروق تخطيط ويب لا تمثّل
   بالضرورة ما يظهر على هاتف. التحقّق من التخطيط الأصلي هو مهمّة **11.9 (Maestro)**.
