# صور الشاشات — الحالة الفعليّة للمشروع

هذا الملف يعرض **لوحة تحكّم الإدارة كما تعمل فعلاً** على هذا الـ commit: صور مأخوذة من
متصفّح حقيقي، مقابل قاعدة بيانات مُهيّأة بالبيانات التي تُنتجها الـ seeders — لا صور
تصميميّة، ولا موك‑أب، ولا بيانات مُختلقة.

كل صورة هنا نتيجة تشغيل سكربت، وليست ملفاً أُضيف باليد. الفرق مهم: الصورة المُضافة يدويّاً
صحيحة يوم إضافتها فقط، أمّا هذه فيمكن إعادة توليدها بعد أي تغيير — وأي صورة قديمة تظهر
فوراً في `git status`.

## كيف تُعاد التوليد

```bash
./scripts/screenshots.sh
```

السكربت يقوم بكل شيء ثمّ ينظّف بعده: يشغّل Postgres، يُنشئ قاعدة **منفصلة** باسم
`rafeeq_demo` ويهيّئها، يشغّل الـ API، يبني لوحة التحكّم ويخدمها، يقود Chrome عبر
DevTools Protocol، ثم يُغلق كل ما شغّله.

- لا يلمس `backend/.env` إطلاقاً — يُولّد `backend/.env.local` من `.env.example`
  (والملف مُستثنى في `.gitignore`، ويرفض السكربت الكتابة فوق ملف ليس من إنشائه).
- لا يلمس قاعدة الاختبار `rafeeq_test`.
- كلمة المرور المستخدمة للصور مُعرّفة داخل السكربت وليست سرّاً حقيقيّاً.

## لوحة تحكّم الإدارة — ٢٩ شاشة

### الدخول

| الشاشة | المسار |
| --- | --- |
| تسجيل الدخول | `/login` |

![تسجيل الدخول](design/screenshots/admin/login.png)

### العمليّات

| الشاشة | المسار |
| --- | --- |
| لوحة القيادة | `/` |
| الرؤى الذكيّة | `/insights` |
| الطلبات الحيّة | `/ride-requests` |
| مراقبة الرحلات | `/trips` |

![لوحة القيادة](design/screenshots/admin/dashboard.png)
![التحليلات](design/screenshots/admin/insights.png)
![الطلبات الحيّة](design/screenshots/admin/ride-requests.png)
![الرحلات](design/screenshots/admin/trips.png)

### النقل والتسعير

| الشاشة | المسار |
| --- | --- |
| المناطق | `/zones` |
| أسعار المناطق | `/zone-prices` |
| التعرفة والتسعير | `/pricing` |
| المسارات | `/routes` |
| الجامعات | `/universities` |

![المناطق](design/screenshots/admin/zones.png)
![مصفوفة أسعار المناطق](design/screenshots/admin/zone-prices.png)
![التعرفة والتسعير](design/screenshots/admin/pricing.png)
![المسارات](design/screenshots/admin/routes.png)
![الجامعات](design/screenshots/admin/universities.png)

### الشبكة — الكباتن والمستخدمون

| الشاشة | المسار |
| --- | --- |
| الكباتن والتوثيق | `/drivers` |
| المستخدمون | `/users` |

![الكباتن والتوثيق](design/screenshots/admin/drivers.png)
![المستخدمون](design/screenshots/admin/users.png)

### المالية

| الشاشة | المسار |
| --- | --- |
| المدفوعات | `/payments` |
| السحوبات | `/withdrawals` |
| التقارير المالية | `/reports` |
| إعداد CliQ | `/cliq` |
| الكوبونات | `/coupons` |

![المدفوعات](design/screenshots/admin/payments.png)
![السحوبات](design/screenshots/admin/withdrawals.png)
![التقارير المالية](design/screenshots/admin/reports.png)
![إعداد CliQ](design/screenshots/admin/cliq.png)
![الكوبونات](design/screenshots/admin/coupons.png)

### الاشتراكات والباقات

| الشاشة | المسار |
| --- | --- |
| الباقات | `/plans` |
| الاشتراكات | `/subscriptions` |

![الباقات](design/screenshots/admin/plans.png)
![الاشتراكات](design/screenshots/admin/subscriptions.png)

### السلامة والدعم

| الشاشة | المسار |
| --- | --- |
| السلامة و SOS | `/safety` |
| التنازعات | `/disputes` |
| الشكاوى | `/complaints` |
| الدعم | `/support` |
| الإشعارات والبثّ | `/notifications` |
| الإعلانات | `/ads` |

![السلامة و SOS](design/screenshots/admin/safety.png)
![التنازعات](design/screenshots/admin/disputes.png)
![الشكاوى](design/screenshots/admin/complaints.png)
![الدعم](design/screenshots/admin/support.png)
![الإشعارات والبثّ](design/screenshots/admin/notifications.png)
![الإعلانات](design/screenshots/admin/ads.png)

### النظام والأمن

| الشاشة | المسار |
| --- | --- |
| الأمن | `/security` |
| سجلّ التدقيق | `/audit` |
| المدراء والأدوار | `/admins` |
| ملفّي | `/profile` |

![الأمن](design/screenshots/admin/security.png)
![سجلّ التدقيق](design/screenshots/admin/audit.png)
![المدراء والأدوار](design/screenshots/admin/admins.png)
![ملفّي](design/screenshots/admin/profile.png)

## ملاحظات صادقة عمّا تراه في الصور

هذه ليست تحفّظات شكليّة — كل بند منها شيء ستلاحظه بنفسك في الصور، ومن الأفضل أن تعرف
سببه بدل أن تظنّه خللاً:

1. **مؤشّرات المالية أصفار، وبعض الجداول فارغة.** هذا سلوك **صحيح** على بيانات
   الـ seeder، لا خلل في اللوحة: `DemoSeeder` يُنشئ رحلات واشتراكات وكوبونات وشكاوى،
   لكنّه **لا يُنشئ** صفوفاً في `payments` ولا `wallet_transactions` ولا `routes`
   (تحقّقتُ: ٠ في كلٍّ منها). فمؤشّر «الرحلات المدفوعة» = ٠ لأنّه لا يوجد دفع مُسجَّل،
   لا لأنّ الحساب خطأ. الرحلات موجودة فعلاً (٥ رحلات، منها ٢ مكتملة).

2. **مربّعات فارغة مكان بعض الرموز التعبيريّة.** المتصفّح داخل بيئة التوليد لا يحتوي خطّ
   emoji، فتظهر المحارف كمربّعات (tofu). على جهازك ستظهر طبيعيّة — هذه سمة بيئة
   التصوير، لا سمة المنتج.

3. **الصور بعرض النافذة (1440×960) وليست الصفحة كاملة.** الشريط الجانبي
   `fixed inset-y-0 h-screen` والشريط العلوي `sticky top-0`، وفي التصوير الطويل
   (`captureBeyondViewport`) يُرسم العنصر الثابت مرّة واحدة في الأعلى فيبقى تحته عمود
   فارغ — أي صورة لعلّة تخطيط غير موجودة. إطار النافذة هو ما يراه المشغّل فعلاً.

## تطبيقا الطالب والكابتن — لماذا لا توجد صور حقيقيّة لهما هنا

لا أريد أن أضع لك صوراً تصميميّة وأسمّيها «الحالة الحاليّة». الصور الحقيقيّة للتطبيقين
غير ممكنة في هذا المستودع حاليّاً، والسبب تقني ومحدّد:

`expo export -p web` يتطلّب حزمتَي `react-native-web` و`react-dom`، **وأيّاً منهما غير
مُعلَن** في `frontend/student-app/package.json` ولا `frontend/driver-app/package.json`.
الموجود هو `react-native-webview` — وهي حزمة مختلفة تماماً يتشابه اسمها فقط. بدون
إضافة تبعيّتين جديدتين للتطبيقين لا يمكن بناء نسخة ويب تُصوَّر، وإضافة تبعيّات إلى شجرة
تطبيقٍ منتج من أجل مهمّة توثيق ليست مقايضة جيّدة.

إلى أن نقرّر ذلك، مراجع التصميم المعتمدة للتطبيقين هنا:

- الطالب: [`design/v2/02-student-auth.png`](design/v2/02-student-auth.png) ·
  [`design/v2/03-student-ride.png`](design/v2/03-student-ride.png) ·
  [`design/v2/04-student-money.png`](design/v2/04-student-money.png)
- الكابتن: [`design/v2/05-driver.png`](design/v2/05-driver.png)
- الحالات والاستجابة والكثافة: [`design/v2/07-states.png`](design/v2/07-states.png) ·
  [`design/v2/08-responsive.png`](design/v2/08-responsive.png) ·
  [`design/v2/09-density.png`](design/v2/09-density.png)

وللشاشات وصفٌ مكتوب شاشةً بشاشة في [`design/SCREENS.md`](design/SCREENS.md).
