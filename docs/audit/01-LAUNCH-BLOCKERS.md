# موانع الإطلاق — الجولة الثالثة

> تدقيق ثالث مستقل، هدفه واحد: **ما يمكن أن يوقف التطبيق أو يفشله بالكامل.**
> لا يعيد نتائج الجولتين السابقتين ([`00-FULL-AUDIT.md`](00-FULL-AUDIT.md)).
> **كل بند تحققتُ منه بنفسي في الكود.** وحيث أخطأ التحليل الأولي، صحّحته وأبقيت التصحيح ظاهراً.

---

## الخلاصة

الجولتان الأولى والثانية وجدتا مشاكل **أمان وامتثال وخصوصية**. هذه الجولة وجدت شيئاً مختلفاً وأخطر:

> **أخطاء في منطق الأعمال تُفقد مالاً وتُنتج حالات لا مخرج منها — وسلسلة إصدار التطبيقات مسدودة عند المتاجر أصلاً.**

| الفئة | قاتل | خطير | متوسط |
|---|---|---|---|
| سلامة الأموال وآلة الحالة | 2 | 4 | — |
| سلسلة الإصدار (Expo/المتاجر) | 1 | — | 1 |
| قانوني (القاصرون) | — | 1 | — |
| التشغيل والمراقبة | — | 1 | 3 |

---

# 🔴 قاتل

## ق1 — إلغاء الحجز يُجمّد أموال الطالب للأبد

**الملف:** `backend/Modules/Trips/Controllers/StudentTripController.php:52-60`

```php
public function cancelBooking(Request $request, TripPassenger $passenger): JsonResponse
{
    if ($passenger->student_id !== $request->user()->id) {
        throw new AuthorizationException('غير مصرّح.');
    }
    $passenger->forceFill(['status' => TripPassengerStatus::Cancelled])->save();

    return $this->ok(null, 'تم إلغاء الحجز.');
}
```

**هذا كل الكود.** لا تحقق حالة، لا معاملة، لا خدمة، ولا فكّ للحجز المالي.

**سلسلة الضرر:**

1. `TripService::start()` يضع **hold** على محفظة كل راكب.
2. فكّ الـ hold يحدث في موضعين فقط: `end()` لمن حالته `Booked`، و`cancel()` لمن حالته `Booked|Onboard`.
3. بعد `cancelBooking` تصبح الحالة `Cancelled` ⇒ **لا مسار في المشروع كله يفكّ هذا الـ hold.**
4. `held_fils` يبقى مطروحاً من الرصيد المتاح **إلى الأبد**.

**وأثر ثانٍ:** `RideRequest` يبقى `Grouped/Assigned`، وعندك حرس `DUPLICATE_REQUEST` يمنع طلباً جديداً لنفس الجامعة ⇒ **الحساب يصبح مقفولاً وظيفياً**.

**وأثر ثالث:** يمكن إلغاء راكب حالته `Onboard` أو `Dropped` — أي **دفع فعلاً** — فيصبح لديك سجل مدفوع بحالة `Cancelled`، ويسقط من إحصاء `end()` ومن مكافأة الكابتن.

**الإصلاح:** انقل المنطق إلى `TripService::cancelBooking()` داخل `DB::transaction` مع `lockForUpdate` على صف الراكب: تحقق أن الحالة `Booked` فقط، افكّ الـ hold، أعِد `RideRequest` إلى `Pending`، وأعِد رصيد الاشتراك إن كان مستهلكاً.

---

## ق2 — إلغاء رحلة جارية: مال مقبوض بلا استرجاع

**الملف:** `backend/Modules/Trips/Services/TripService.php:224-288`

```php
if ($trip->status === TripStatus::Completed) {
    throw new BusinessRuleException('لا يمكن إلغاء رحلة مكتملة.', 'TRIP_COMPLETED');
}
```

الحرس الوحيد هو `Completed`. أي أن **الحالة `Started` قابلة للإلغاء**.

لكن الراكب الذي صعد فعلاً: `RideBillingService` نفّذ `capture` وأودع حصة الكابتن. والإلغاء يفكّ الحجوزات **النشطة** فقط (`findActiveHold`) — **ولا يعكس أي مبلغ مُلتقَط**.

⇒ **الطالب يخسر أجرته، والكابتن يقبض بلا رحلة.** ولا يوجد أي مسار `refund` في مسار الإلغاء إطلاقاً (`WalletService::reverseTransaction` أداة إدارية للشحن اليدوي، وغير مستدعاة هنا).

**وأثر ثانٍ:** الإلغاء **قابل للتكرار** (لا حرس غير `Completed`) ⇒ تكرار حدث `TripStatusChanged`، وتكرار `fraud->logCancellation`، وتكرار إشعارات «أُلغيت رحلتك»، وفتح `openGhostWatch` عدة مرات.

**الإصلاح:** امنع الإلغاء بعد أول `capture`، أو أضف مسار استرجاع صريحاً. واحرس ضد الإلغاء المتكرر (`if ($trip->status === TripStatus::Cancelled) return;`).

> ### ✍️ تصحيح
> التحليل الأولي ذكر أن رُكّاب `Onboard` **يبقون عالقين** لأن الاستعلام يحدّث `Booked` فقط. **هذا غير صحيح** — تحققت من السطرين 231 و236 وكلاهما يستخدم
> `whereIn('status', [Booked, Onboard])`. الرُّكاب **يُحدَّثون** فعلاً. المشكلة الحقيقية هي غياب الاسترجاع فقط.

---

## ق3 — سلسلة الإصدار مسدودة: لا يمكن نشر التطبيقين ولا تحديثهما

**الملفات:** `frontend/student-app/package.json:20,37` · `frontend/driver-app/package.json:20,35`

```json
"expo": "~51.0.0",
"react-native": "0.74.5",
```

**Expo SDK 51 ⇒ `targetSdkVersion 34`.** وGoogle Play تفرض **targetSdk 35** لأي رفع أو تحديث.

⇒ **لا يمكن نشر التطبيقين ولا تحديثهما على Google Play اليوم.** وSDK 51 خارج نافذة دعم Expo/EAS.

**ومعها ثلاث مشاكل بناء متسقة:**

| # | المشكلة | الملف |
|---|---|---|
| أ | `"newArchEnabled": true` — حقل جذري **غير مدعوم في SDK 51** (يحتاج `expo-build-properties`) ⇒ يُتجاهل بصمت (وهم بأن New Architecture مفعّلة) أو ينتج بناءً غير مستقر مع `react-native-webview` و`react-native-svg` | `student-app/app.json:9` |
| ب | `eas.json` يحدّد `"channel": "preview"` و`"production"` بينما **`expo-updates` غير مثبّت في أي تطبيق** (تحققت: صفر تطابق في كلا `package.json`) ⇒ القناة تُتجاهل، و**لا توجد آلية OTA لإصلاح عاجل بعد النشر** | `student-app/eas.json:14,18` |
| ج | `versionCode`/`buildNumber` غير موجودين مع `appVersionSource: local` + `autoIncrement: true` ⇒ سلوك غير محدَّد في أول بناء إنتاجي | كلا `app.json` |

**الإصلاح:** ترقية إلى **Expo SDK 54+** (targetSdk 35) قبل أي محاولة نشر. تثبيت `expo-updates` أو حذف `channel`. إضافة `versionCode`/`buildNumber` صريحين. نقل `newArchEnabled` إلى `expo-build-properties` أو حذفه.

> **هذه المرحلة تسبق كل شيء آخر.** أي عمل تصميمي أو أمني لا معنى له إن كان البناء نفسه مرفوضاً من المتجر.

---

# 🟠 خطير

## خ1 — Overbooking: تجاوز سعة الرحلة

**الملف:** `TripService.php:291-300`

```php
if ($trip->bookedCount() >= $trip->capacity) {
    throw new BusinessRuleException('اكتملت مقاعد الرحلة.', 'TRIP_FULL');
}
...
return $this->transaction(function () ...);   // ← الفحص خارج المعاملة وبلا قفل
```

`bookedCount()` عدّ بسيط بلا `lockForUpdate`، والفحص **خارج** المعاملة ⇒ طلبان متزامنان من طالبين مختلفين يمرّان كلاهما ⇒ **تجاوز السعة**.

> ### ✍️ تصحيح
> التحليل الأولي ذكر أيضاً **حجزاً مزدوجاً لنفس الطالب**. **هذا غير صحيح** — يوجد قيد فريد فعلاً:
> `2024_01_15_000001_create_trip_passengers_table.php:33` → `$table->unique(['trip_id', 'student_id']);`
> قاعدة البيانات تمنع ذلك. المشكلة الحقيقية هي **تجاوز السعة بين طلاب مختلفين** فقط.

**الإصلاح:** `Trip::whereKey($id)->lockForUpdate()->first()` داخل المعاملة، وإعادة فحص السعة تحت القفل.

## خ2 — سحب الأجرة مرتين عند الصعود

`TripService.php:326-345` يجد الراكب بـ `first()` **بلا قفل**. والحصانة الوحيدة في `RideBillingService.php:37`:

```php
if ($passenger->paid_at !== null) { return; }   // idempotent — لكن على صف غير مقفول
```

طلبان متزامنان بنفس كود الصعود: الأول ينفّذ `capture`؛ الثاني لا يجد hold نشطاً **فينزل إلى `debit()`** ⇒ **خصم مزدوج من الطالب + إيداع مزدوج للكابتن + `consumeRide` ينقص رصيد الاشتراك مرتين**.

> هذا **مسار مستقل** عن race الـ `PayoutService` المذكور في الجولة الأولى.

## خ3 — دفع الاشتراك مرتين

`backend/Modules/Subscriptions/Services/SubscriptionService.php:70-98` — الفحوص (`Active` / `Pending`) على نسخة **غير مقفولة وخارج المعاملة** ⇒ نقرتان متزامنتان = **خصمان بقيمة الخطة كاملة**.

لاحظ التناقض: `WalletService::adminTopup` يفعل هذا **بشكل صحيح** بمفتاح idempotency على `reference`. النمط موجود في المشروع لكنه غير مطبَّق هنا.

**وأثر تشغيلي:** **لا يوجد أي job لتجديد أو انتهاء الاشتراكات** — `backend/routes/console.php` فيه 4 مهام فقط (`prune-otps`, `match-rides`, `fraud-sweep`, `prune-tracking`). الاشتراك المنتهي يبقى `Active` في العمود ويعتمد على `isUsable()` وقت الاستخدام ⇒ التقارير والحالة مضلِّلة.

## خ4 — الاشتراك المنتهي يمنع تصعيد الراكب نهائياً

`SubscriptionService.php:110-117` يرمي `SUBSCRIPTION_NOT_USABLE`، و`MatchingService.php:120-135` ينسخ `subscription_id` إلى الراكب **بلا أي تحقق من صلاحيته**.

إن انتهى الاشتراك بين الطلب والرحلة، الاستثناء يُرمى **داخل معاملة `confirmBoarding`** ⇒ تُلفّ المعاملة كلها ⇒ **الكابتن لا يستطيع تصعيد هذا الراكب أبداً**، ولا يوجد مسار احتياطي للدفع من المحفظة (لأن `subscription_id` موجود فتتخطّى `chargeForBoarding` الخصم أصلاً).

**وأيضاً:** `decrement('remaining_rides')` بلا قفل وبلا `where remaining_rides > 0` ⇒ قيم سالبة تحت التزامن.

## خ5 — انتقالات الحالة بلا أي قفل

`assertStatus` تُستدعى **خارج** المعاملة في `start()` (`:64`) و`end()` (`:124`). تحققت: **صفر استخدام لـ `lockForUpdate` في موديول `Trips` بالكامل** — بينما هو مستخدم في `Coupons` و`Wallet` و`Payments` و`Rewards` و`Support` و`Parcels`.

⇒ طلبا `end` متزامنان: **مكافأة الكابتن تُمنح مرتين** وتتكرر الإشعارات.

## خ6 — كود 4 أرقام بلا throttle على الصعود والإنزال

`backend/Modules/Trips/Routes/api.php:8-21` — مجموعة الكابتن **بلا أي `throttle`**. والكود 4 أرقام (`TripService.php:452-460`) = فضاء 10,000 فقط.

⇒ **الكابتن يستطيع تأكيد إنزال راكب لم ينزل بالتخمين**، وهذا يهزم ضابط «التأكيد من الطرفين» الذي يعتمد عليه مركز النزاعات (`dropoff_confirmed_at` هو الدليل).

**الإصلاح:** 6 أرقام + `throttle` صريح + قفل بعد 5 محاولات خاطئة.

## خ7 — لا تحقق عمر ولا موافقة وليّ أمر

تحققت بنفسي:

- `backend/Modules/Auth/Requests/RegisterRequest.php:25-34` — الحقول: `full_name, phone, email, password, type`. **لا حقل عمر ولا تاريخ ميلاد.** وبحث شامل عن `birth|dob|age_` في `Modules/Auth` و`Modules/Students` و`shared/types` رجع **صفر نتائج ذات صلة**.
- `docs/legal/terms-ar.md` — **لا ذكر لسنّ أدنى، ولا «18»، ولا «قاصر»، ولا «ولي أمر»**.
- لا أثر لـ `guardian-portal`: كلمة `guardian` باقية فقط بمعنى **جهة اتصال طوارئ**.

**الخطر:** منصّة تنقل **طلاباً، بعضهم تحت 18**، في **سيارات خاصة**، مع **تتبّع موقع** و**محفظة مالية** — بلا سنّ أدنى وبلا موافقة وصائية.

**الإصلاح:** حقل تاريخ ميلاد إلزامي + سنّ أدنى معلن في الشروط + مسار موافقة وليّ أمر لمن هم تحت 18 (أو منعهم صراحةً). **هذا قرار عمل لا قرار تقني — يحتاج مراجعة قانونية أردنية.**

---

# 🟡 متوسط

| # | المشكلة | الدليل |
|---|---|---|
| م1 | **healthcheck العامل لا يفشل أبداً** — `queue:monitor … \|\| exit 0` ⇒ العامل يموت بصمت وأنت لا تعلم | `deployment/docker-compose.prod.yml:82-86` |
| م2 | **لا تنبيه على `failed_jobs`**. و`BroadcastNotificationJob`/`DeliverNotificationJob` بلا `failed()` ⇒ إشعار حرج يسقط بصمت (بينما `VerifyPaymentProofJob::failed()` مكتوب جيداً — النمط موجود وغير مطبَّق) | `Modules/*/Jobs/**` |
| م3 | **رسائل الأعمال عربية مضمّنة في الباكند** وتُعاد نصّاً للـ API، بينما `en.ts` فيه 704 سطر ترجمة ⇒ مستخدم `locale=en` يرى أخطاء عربية. أكواد الأخطاء موجودة (`TRIP_FULL`…) لكن العميل لا يترجمها | `TripService` · `CouponService` · `SubscriptionService` |
| م4 | **`KeyboardAvoidingView` ناقص** — موجود فقط في `chat` و`assistant`. شاشات `wallet` و`checkout` و`support` و`otp` و`login` و`register` بلا KAV ⇒ على iPhone SE الكيبورد يغطّي الحقل السفلي | `student-app/app/**` |
| م5 | **Next.js 14.2.35** — مرقّع، لكن الخط 14 في وضع صيانة فقط | `admin-dashboard/package.json` |

---

# ✅ محاور نظيفة — صراحةً

هذه فحصتها ولم أجد فيها مشكلة، وأقولها لأن معرفة ما **لا** يحتاج عملاً توفّر وقتاً بقدر معرفة ما يحتاجه:

| المحور | الحالة |
|---|---|
| **البثّ الحيّ والقنوات** | ✅ **نظيف تماماً.** `routes/channels.php` يعرّف `trip.{id}` و`chat.{id}` كقنوات **خاصة** فقط، والتصريح مفصول في `TripChannelPolicy` (كابتن الرحلة / راكب فيها فعلاً / موظف بصلاحية `trips.view`) و`ChatChannelPolicy` (المشاركان فقط)، **مع اختبار** `tests/Feature/BroadcastChannelAuthTest.php`. **لا يمكن لطالب الاستماع لقناة رحلة طالب آخر.** والحمولة لا تحمل أسراراً. |
| **الكوبونات** | ✅ `CouponService::redeem` يقفل صف الكوبون ويعيد فحص `limitReached` و`per_user_limit` و`first_order_only` **تحت القفل**. و`RideBillingService:72` فيه سقف zero-sum: `min($discount, $commission)` يمنع سكّ رصيد غير مغطّى. |
| **اعتماديات الباكند** | ✅ Laravel `^12`, PHP `^8.4`, Sanctum 4, Reverb 1, Predis 2.2. `composer.lock` مرفوع. لا حزمة مهجورة. |
| **بنية الطوابير** | ✅ `QUEUE_CONNECTION=redis` فعلاً، وخدمتا `queue` و`scheduler` موجودتان في compose الإنتاج، وكل الـ jobs لها `$tries`/`$timeout`. لا job حرج على `sync`. |
| **الأبعاد المتجاوبة** | ✅ **صفر استخدام لـ `Dimensions.get`** في التطبيقين، و`SafeAreaView`/`useSafeAreaInsets` في ~34 موضعاً. الارتفاعات الثابتة كلها زخرفية. الاستثناء الوحيد: `locateFab` عند `bottom:'46%'` في `home.tsx:217`. |
| **التدقيق (Audit)** | ✅ `AuditLogger` يغطّي كل تغييرات الحالة الحسّاسة فعلياً. يحتاج **عرضاً** لا بناءً. |

---

# الترتيب المعدَّل — ما تغيّر في الخطة

هذه الجولة تُدخل **مرحلة جديدة قبل كل شيء**، وتُضيف بنوداً إلى مراحل قائمة:

| الأولوية | العمل | لماذا الآن |
|---|---|---|
| **0.أ (جديد)** | **ترقية Expo SDK 51 ⟶ 54+** · تثبيت `expo-updates` · إصلاح `versionCode` و`newArchEnabled` | البناء الحالي **مرفوض من Google Play**. كل عمل آخر بلا قيمة قبل هذا. |
| **0.ب** | إصلاح `cancelBooking` (ق1) و`cancel` بعد `capture` (ق2) | أموال مجمّدة وخسائر مباشرة، **اليوم** |
| **0.ج** | `lockForUpdate` في كل موديول `Trips` (خ1 · خ2 · خ5) | خصم مزدوج وتجاوز سعة |
| **0.د** | قفل `SubscriptionService::payWithWallet` (خ3) + معالجة خ4 | خصم مزدوج + راكب لا يُصعَّد |
| **1** | كود 6 أرقام + `throttle` على الصعود/الإنزال (خ6) | يحمي مركز النزاعات |
| **1** | حقل العمر + سنّ أدنى في الشروط (خ7) | **يحتاج قراراً منك ومراجعة قانونية** |
| **9** | healthcheck حقيقي + تنبيه `failed_jobs` + `failed()` للـ jobs (م1 · م2) | فشل صامت |
| **9** | تدويل رسائل الأخطاء عبر الأكواد (م3) | الوضع الإنجليزي |
| **5** | `KeyboardAvoidingView` في كل شاشة بحقول (م4) | مُدرَج في مكتبة المكوّنات |

> الخطة الكاملة: [`../plan/00-MASTER-PLAN.md`](../plan/00-MASTER-PLAN.md)

---

## قرارات مطلوبة منك

1. **السنّ الأدنى.** هل تقبل من هم تحت 18؟ إن نعم فنحتاج موافقة وليّ أمر مبنية في المنتج. إن لا، فنمنعهم صراحةً في التسجيل والشروط. **هذا قرار عمل وقانون لا تقني.**
2. **الإلغاء بعد الصعود.** ما القاعدة؟ أقترح: بعد `capture` لا إلغاء — بل «مشكلة في الرحلة» تفتح نزاعاً يقرّره الأدمن.
3. **ترقية Expo.** ستلمس كل التطبيقين. أقترح دمجها مع المرحلة 4 (التوكنز) لأن كلتيهما تلمسان نفس الملفات.
