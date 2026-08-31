# صور الشاشات — الحالة الفعليّة للمشروع

هذا الملف يعرض **التطبيقات الثلاثة كما تعمل فعلاً** على هذا الـ commit: صور مأخوذة من
متصفّح حقيقي، مقابل قاعدة بيانات مُهيّأة بالبيانات التي تُنتجها الـ seeders — لا صور
تصميميّة، ولا موك‑أب، ولا بيانات مُختلقة.

كل صورة نتيجة تشغيل سكربت وليست ملفاً أُضيف باليد. الفرق مهم: الصورة المُضافة يدويّاً
صحيحة يوم إضافتها فقط، أمّا هذه فيمكن إعادة توليدها بعد أي تغيير — وأي صورة قديمة تظهر
فوراً في `git status`.

| التطبيق | عدد الصور | المقاس |
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

# ١ · لوحة الإدارة — مطابقة لصفائح V2

**١٦ وجهة في ٤ مجموعات**، والمقاسات مأخوذة **حرفيّاً** من `docs/design/src/06-admin-1.html`
لا بالتقدير: سايدبار **216px**، شريط علوي **52px**، حشو المحتوى **18/20px**، عنصر ملاحة
`500 12px` بحشو `7/10px` ونصف قطر `9px`، تسمية مجموعة `700 9px` بتتبّع `.12em`، رأس جدول
`700 10px` بتتبّع `.04em` وحشو `9/14px`، وصفوف `12px` بتظليل `neutral-25` للزوجيّ.

هذا هو الفرق الذي كان يجعل اللوحة المبنيّة تبدو **منتجاً آخر**: صفيحة `09-density.html`
تسجّل أن السطح كُثِّف «استجابةً لملاحظة العناصر كبيرة»، وما كان مبنيّاً هو المقياس **قبل**
التكثيف — كل صفّ أطول بنحو ٤٠٪ ممّا رُسم.

| المجموعة | الوجهات |
|---|---|
| العمليات | لوحة القيادة · الطلبات الحيّة · الرحلات · الرؤى والتحليلات |
| الشبكة | الكباتن · المستخدمون · الجغرافيا والمسارات *(٤ تبويبات)* |
| المالية | المدفوعات · السحوبات · التسعير والخطط *(٤ تبويبات)* · التقارير |
| الثقة والنظام | السلامة و SOS · الدعم والشكاوى *(٢)* · النزاعات · الأمان والتدقيق *(٢)* · الإعدادات والموظفون *(٤)* |

| الشاشة | المسار |
|---|---|
| [تسجيل الدخول](#login) | `/login` |
| [لوحة القيادة](#01-dashboard) | `/` |
| [الطلبات الحيّة](#02-ride-requests) | `/ride-requests` |
| [الرحلات](#03-trips) | `/trips` |
| [الرؤى والتحليلات](#04-insights) | `/insights` |
| [الكباتن والتوثيق](#05-drivers) | `/drivers` |
| [المستخدمون](#06-users) | `/users` |
| [الجغرافيا — المناطق](#07-geography-zones) | `/geography?tab=zones` |
| [الجغرافيا — أسعار المناطق](#08-geography-prices) | `/geography?tab=prices` |
| [الجغرافيا — المسارات](#09-geography-routes) | `/geography?tab=routes` |
| [الجغرافيا — الجامعات](#10-geography-universities) | `/geography?tab=universities` |
| [المدفوعات](#11-payments) | `/payments` |
| [السحوبات](#12-withdrawals) | `/withdrawals` |
| [التسعير — التعرفة والعمولة](#13-pricing-tariff) | `/pricing?tab=tariff` |
| [التسعير — الباقات](#14-pricing-plans) | `/pricing?tab=plans` |
| [التسعير — الاشتراكات](#15-pricing-subscriptions) | `/pricing?tab=subscriptions` |
| [التسعير — الكوبونات](#16-pricing-coupons) | `/pricing?tab=coupons` |
| [التقارير المالية](#17-reports) | `/reports` |
| [السلامة و SOS](#18-safety) | `/safety` |
| [الدعم — التذاكر](#19-support-tickets) | `/support?tab=tickets` |
| [الدعم — الشكاوى](#20-support-complaints) | `/support?tab=complaints` |
| [التنازعات](#21-disputes) | `/disputes` |
| [الأمان — الجلسات والمصادقة](#22-security-sessions) | `/security?tab=sessions` |
| [الأمان — سجلّ التدقيق](#23-security-audit) | `/security?tab=audit` |
| [الإعدادات — الموظفون والأدوار](#24-settings-staff) | `/settings?tab=staff` |
| [الإعدادات — إعداد CliQ](#25-settings-cliq) | `/settings?tab=cliq` |
| [الإعدادات — الإشعارات والبثّ](#26-settings-broadcast) | `/settings?tab=broadcast` |
| [الإعدادات — الإعلانات](#27-settings-ads) | `/settings?tab=ads` |
| [ملفّي](#28-profile) | `/profile` |

<a id="login"></a>
**تسجيل الدخول** — `/login`

![تسجيل الدخول](design/screenshots/admin/login.png)

<a id="01-dashboard"></a>
**لوحة القيادة** — `/`

![لوحة القيادة](design/screenshots/admin/01-dashboard.png)

<a id="02-ride-requests"></a>
**الطلبات الحيّة** — `/ride-requests`

![الطلبات الحيّة](design/screenshots/admin/02-ride-requests.png)

<a id="03-trips"></a>
**الرحلات** — `/trips`

![الرحلات](design/screenshots/admin/03-trips.png)

<a id="04-insights"></a>
**الرؤى والتحليلات** — `/insights`

![الرؤى والتحليلات](design/screenshots/admin/04-insights.png)

<a id="05-drivers"></a>
**الكباتن والتوثيق** — `/drivers`

![الكباتن والتوثيق](design/screenshots/admin/05-drivers.png)

<a id="06-users"></a>
**المستخدمون** — `/users`

![المستخدمون](design/screenshots/admin/06-users.png)

<a id="07-geography-zones"></a>
**الجغرافيا — المناطق** — `/geography?tab=zones`

![الجغرافيا — المناطق](design/screenshots/admin/07-geography-zones.png)

<a id="08-geography-prices"></a>
**الجغرافيا — أسعار المناطق** — `/geography?tab=prices`

![الجغرافيا — أسعار المناطق](design/screenshots/admin/08-geography-prices.png)

<a id="09-geography-routes"></a>
**الجغرافيا — المسارات** — `/geography?tab=routes`

![الجغرافيا — المسارات](design/screenshots/admin/09-geography-routes.png)

<a id="10-geography-universities"></a>
**الجغرافيا — الجامعات** — `/geography?tab=universities`

![الجغرافيا — الجامعات](design/screenshots/admin/10-geography-universities.png)

<a id="11-payments"></a>
**المدفوعات** — `/payments`

![المدفوعات](design/screenshots/admin/11-payments.png)

<a id="12-withdrawals"></a>
**السحوبات** — `/withdrawals`

![السحوبات](design/screenshots/admin/12-withdrawals.png)

<a id="13-pricing-tariff"></a>
**التسعير — التعرفة والعمولة** — `/pricing?tab=tariff`

![التسعير — التعرفة والعمولة](design/screenshots/admin/13-pricing-tariff.png)

<a id="14-pricing-plans"></a>
**التسعير — الباقات** — `/pricing?tab=plans`

![التسعير — الباقات](design/screenshots/admin/14-pricing-plans.png)

<a id="15-pricing-subscriptions"></a>
**التسعير — الاشتراكات** — `/pricing?tab=subscriptions`

![التسعير — الاشتراكات](design/screenshots/admin/15-pricing-subscriptions.png)

<a id="16-pricing-coupons"></a>
**التسعير — الكوبونات** — `/pricing?tab=coupons`

![التسعير — الكوبونات](design/screenshots/admin/16-pricing-coupons.png)

<a id="17-reports"></a>
**التقارير المالية** — `/reports`

![التقارير المالية](design/screenshots/admin/17-reports.png)

<a id="18-safety"></a>
**السلامة و SOS** — `/safety`

![السلامة و SOS](design/screenshots/admin/18-safety.png)

<a id="19-support-tickets"></a>
**الدعم — التذاكر** — `/support?tab=tickets`

![الدعم — التذاكر](design/screenshots/admin/19-support-tickets.png)

<a id="20-support-complaints"></a>
**الدعم — الشكاوى** — `/support?tab=complaints`

![الدعم — الشكاوى](design/screenshots/admin/20-support-complaints.png)

<a id="21-disputes"></a>
**التنازعات** — `/disputes`

![التنازعات](design/screenshots/admin/21-disputes.png)

<a id="22-security-sessions"></a>
**الأمان — الجلسات والمصادقة** — `/security?tab=sessions`

![الأمان — الجلسات والمصادقة](design/screenshots/admin/22-security-sessions.png)

<a id="23-security-audit"></a>
**الأمان — سجلّ التدقيق** — `/security?tab=audit`

![الأمان — سجلّ التدقيق](design/screenshots/admin/23-security-audit.png)

<a id="24-settings-staff"></a>
**الإعدادات — الموظفون والأدوار** — `/settings?tab=staff`

![الإعدادات — الموظفون والأدوار](design/screenshots/admin/24-settings-staff.png)

<a id="25-settings-cliq"></a>
**الإعدادات — إعداد CliQ** — `/settings?tab=cliq`

![الإعدادات — إعداد CliQ](design/screenshots/admin/25-settings-cliq.png)

<a id="26-settings-broadcast"></a>
**الإعدادات — الإشعارات والبثّ** — `/settings?tab=broadcast`

![الإعدادات — الإشعارات والبثّ](design/screenshots/admin/26-settings-broadcast.png)

<a id="27-settings-ads"></a>
**الإعدادات — الإعلانات** — `/settings?tab=ads`

![الإعدادات — الإعلانات](design/screenshots/admin/27-settings-ads.png)

<a id="28-profile"></a>
**ملفّي** — `/profile`

![ملفّي](design/screenshots/admin/28-profile.png)


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

1. **مؤشّرات المالية في اللوحة أصفار، وبعض الجداول فارغة.** سلوك **صحيح** على بيانات
   الـ seeder لا خلل في اللوحة: `DemoSeeder` يُنشئ رحلات واشتراكات وكوبونات وشكاوى،
   لكنّه **لا يُنشئ** صفوفاً في `payments` ولا `wallet_transactions` ولا `routes`
   (تحقّقتُ: ٠ في كلٍّ منها). الرحلات موجودة فعلاً: ٥ منها ٢ مكتملة.

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
   بالكامل، ونصّ بديل داخل حقل مبلغ CliQ يتجاوز حدّ الحقل. الشاشتان تُبنيان على
   `react-native-web` وهو يُترجم إلى CSS لا إلى Yoga، فهذه فروق تخطيط ويب لا تمثّل
   بالضرورة ما يظهر على هاتف. التحقّق من التخطيط الأصلي هو مهمّة **11.9 (Maestro)**.

6. **أشرطة المؤشّرات غائبة في الصور، وهذا هو السلوك الصحيح.** كل شريط في بطاقة مؤشّر
   يقسم رقمين أعادهما التقرير فعلاً، ويذكر المقام في التسمية («٣٨٪ بمقاعد اشتراك»،
   «١٧٪ من إجمالي الأجور»). وبما أن `DemoSeeder` لا يُنشئ مدفوعات، فالمقام صفر
   والشريط **يُحجَب** بدل أن يُعبَّأ برقم مُختلَق. تحقّقتُ من مسار الرسم بقيم مفروضة
   مؤقّتاً ثم أزلتها. (لو أردتَ رؤية الأشرطة في الصور، الخطوة هي أن يُنشئ الـseeder
   مدفوعات حقيقيّة — وهي فرصة قائمة لم أنفّذها بعد.)

7. **ما زال أمام لوحة الإدارة بقيّة المرحلة 10.** أُنجزت **10.1** (الشلّ والملاحة)
   و**10.2 جزئيّاً** (بطاقات المؤشّرات ومؤشّر سلامة النظام). أمّا لوحة «يحتاج إجراءً»
   و«أعلى المناطق طلباً» وحبوب التصفية بعدّاداتها في الطلبات الحيّة والمدفوعات،
   و**10.3** و**10.4** و**10.5** فلم تُنفَّذ بعد.
