# التدقيق الرابع — المال والوقت وقاعدة البيانات وأمن العميل

> جولة رابعة، فحصت **73 ملف هجرة · 57 موديلاً · 213 ملف TS/TSX** سطراً سطراً.
> لا تعيد نتائج الجولات الثلاث السابقة ([`00`](00-FULL-AUDIT.md) · [`01`](01-LAUNCH-BLOCKERS.md)).
> **ما تحققتُ منه بنفسي مُعلَّم ✓ — وما لم أتحقق منه مُعلَّم صريحاً.**

---

## الخلاصة

الجولات السابقة وجدت: أمان وامتثال (١)، خصوصية وبنية تحتية (٢)، منطق أعمال وسلسلة إصدار (٣).
هذه الجولة وجدت الأخطر على المدى الطويل:

> **المال يتبخّر بصمت، والأوقات مخزّنة بانزياح 3 ساعات، والتقارير المالية تحتسب إيراداً مرتين.**

هذه أخطاء **لا تظهر في أي اختبار ولا يشتكي منها مستخدم فوراً** — تتراكم بهدوء حتى تصبح دفتر الأستاذ غير قابل للتسوية.

| الفئة | قاتل | خطير | متوسط |
|---|---|---|---|
| الدقة المالية | 2 | 1 | 2 |
| الوقت والمنطقة الزمنية | 1 | 1 | — |
| مخطط قاعدة البيانات | — | 4 | 6 |
| أمن العميل والعقد | 3 | 7 | 8 |

---

# 🔴 قاتل

## ق1 — أوقات UTC تُخزَّن كأنها توقيت عمّان: انزياح 3 ساعات ✓

سلسلة كاملة تحققت منها:

**١. العميل يرسل UTC:**
- `frontend/driver-app/app/(app)/trips.tsx:46` → `scheduled_at: d.toISOString()` (ينتهي بـ `Z`)
- `frontend/student-app/app/(app)/ride-request.tsx:139` → `desired_time: new Date(...).toISOString()`

**٢. الباكند يمرّر النص كما هو:**
- `backend/Modules/Trips/Services/TripService.php:41-52` → `'scheduled_at' => $scheduledAt` (`string`)
- `backend/Modules/RideRequests/Services/RideRequestService.php:57` → `'desired_time' => $data['desired_time']`

**٣. الأعمدة بلا منطقة زمنية:** `trips.scheduled_at` و`ride_requests.desired_time` كلاهما `timestamp` — **ولا وجود لأي `timestampTz` في المشروع كله**. و`config/database.php` (اتصال pgsql) **بلا مفتاح `timezone`**.

**٤. السلوك:** `Carbon::parse('2026-05-01T18:00:00Z')` يُنتج كائناً بمنطقة UTC، والتنسيق يجري بمنطقة الكائن ⇒ يُكتب حرفياً `18:00:00`. وعند القراءة يُفسَّر بمنطقة التطبيق `Asia/Amman` (`config/app.php:14`) ⇒ **+3 ساعات**.

**٥. لا شيء يكتشفه:** `after:now` في `ScheduleTripRequest.php:18` يقارن **لحظات مطلقة** فيمرّ؛ الانزياح يحدث بعده عند الكتابة.

### الأثر المالي المباشر — التعريفة الليلية

`Modules/Matching/Services/PricingService.php:96-100`:
```php
$hour = $when ? (int) $when->format('G') : (int) now()->format('G');
if ($hour >= $this->nightStartHour()) { $fare = (int) round($fare * $this->nightMultiplier()); }
```

| الوقت الحقيقي | يُقرأ كـ | النتيجة |
|---|---|---|
| 21:30 عمّان | 18:30 | **تفقد مضاعف الليل 1.25 = خسارة 25% من الأجرة** |
| 00:30 عمّان | 21:30 | **تُشحن تعريفة ليلية بلا حق** |

وكذلك `StudentTripController.php:28` (`where('scheduled_at','>',now())`) يُظهر ويخفي رحلات خطأً لثلاث ساعات.

**الإصلاح:** تطبيع عند الإدخال (`Carbon::parse($v)->setTimezone(config('app.timezone'))`) أو تحويل الأعمدة إلى `timestampTz`. **والأول أرخص وأسرع.**

## ق2 — الطالب يُخصم منه والكابتن لا يُقيَّد له شيء: مال يتبخّر ✓

`backend/Modules/Trips/Services/RideBillingService.php:93-105`:
```php
$trip->loadMissing('driver');
$captainUser = $trip->driver ? User::find($trip->driver->user_id) : null;
if ($captainUser) { $this->wallets->credit(... $captainShare ...); }
```

**لا `else`. لا استثناء. لا تسجيل.** وبعدها يُكتب `paid_at = now()` (سطر 111) فتصبح العملية **idempotent** ولا تُعاد أبداً.

ومتى يكون `driver` فارغاً؟ `trips.driver_id` قابل للـ null ومُعرَّف `nullOnDelete` (`create_trips_table.php:15`)، ورحلات pooled تُنشأ في `MatchingService.php:100-115` **بلا كابتن**.

⇒ **الطالب يدفع كامل الأجرة، والكابتن يُقيَّد له صفر، والمبلغ لا يذهب لأي دفتر.** كسر صريح لمبدأ zero-sum، وغير قابل للاكتشاف لاحقاً.

## ق3 — التقارير المالية تحتسب إيراداً غير مقبوض، ومرّتين ✓

`RideBillingService.php:79-91` يضع خصم الطالب داخل `if (! $passenger->subscription_id)`، ثم **بغضّ النظر** يقيّد للكابتن ويكتب (106-113):
```php
'fare_fils' => $fare,
'commission_fils' => max(0, $commission - $discount),
'captain_share_fils' => $captainShare,
```

**رحلة باشتراك:** الطالب يُخصم **0** · الكابتن يُقيَّد `fare − commission` · والصف يسجّل `fare_fils` و`commission_fils` **كاملين**.
و`FinancialReportService.php:33-36` يجمعهما كـ `gross_fare_fils`/`commission_fils`، ثم يضيف في 50-53 `subscription_revenue_fils` من `payment_requests`
⇒ **احتساب مزدوج**: مرة كعمولة رحلة لم تُقبض، ومرة كإيراد اشتراك. وفي المحفظة: ائتمان للكابتن بلا خصم مقابل = **رصيد غير مغطّى في الدفتر**.

**رحلة بكوبون:** المخزَّن يكسر `fare = commission + captain_share` (مجموعه `fare − discount`)، بينما `gross_fare_fils` يجمع `fare_fils` الكامل، و`coupon_discount_fils` **غير مضمَّن في أي تجميع** ⇒ فرق غير مفسَّر في التقرير.

## ق4 — بثّ موقع الكابتن يستمرّ بعد تسجيل الخروج ✓

`frontend/driver-app/src/store/availability.ts:33-37` — المؤقّت في **متغيّر على مستوى الموديول**، خارج أي دورة حياة React:
```ts
let timer: ReturnType<typeof setInterval> | null = null;
function startPinging(get) { if (timer) clearInterval(timer); timer = setInterval(() => void get().pingNow(), PING_MS); }
```
و`logout()` في `auth.ts:116-125` **لا يلمسه ولا يستدعي `setOnline(false)`**.

**بعد الخروج:** `pingNow()` يستمرّ كل 15 ثانية → يقرأ GPS → يُرسل بلا توكن → 401 → `setUnauthorizedHandler` في حلقة لا نهائية.
**ثلاث مشاكل معاً: تتبّع موقع بعد الخروج (خرق خصوصية) · استهلاك بطارية · عاصفة 401.**

وأسوأ: العلم يُخزَّن في `AsyncStorage` (`:49`) ولا يُمسح، فـ`restore()` (62-75) يُعيد التشغيل تلقائياً عند الإقلاع التالي — **حتى لمستخدم مختلف على نفس الجهاز**.

## ق5 — توكن الأدمن كامل الصلاحية في `localStorage` ✓

`frontend/admin-dashboard/src/lib/api.ts:3-9`:
```ts
const TOKEN_KEY = 'rafeeq_admin_token';
export const tokenStore = { get: () => localStorage.getItem(TOKEN_KEY), ... }
```
مقروء من أي JavaScript في الصفحة ⇒ أي XSS أو حزمة npm مسمومة تسرّب توكن Sanctum **الأعلى صلاحية**: تجميد مستخدمين، اعتماد مدفوعات، سحوبات، أسعار. بلا `httpOnly` ولا `SameSite` ولا تقييد عمر.

> **تنبيه أمانة:** لم أفحص وجود مَصْرَف XSS فعلي (`dangerouslySetInnerHTML`)، فهذه **مساحة تعرّض** مؤكدة لا سلسلة استغلال مؤكدة.

## ق6 — «الرصيد المتاح» يعرض الرصيد الكلّي ✓

الباكند `WalletResource.php:15-24` يُرسل **7 حقول** منها `held_fils` و`available_fils` و`available_jod`.
الواجهة `packages/shared/src/types/models.ts:201-206` تعلن **4 فقط** — الثلاثة الخاصة بالتوفّر **غير معلَنة إطلاقاً**.

فـ `driver-app/app/(app)/earnings.tsx:68-70`:
```tsx
<Text>{t('driver.availableBalance')}</Text>            {/* "الرصيد المتاح" */}
<Text>{wallet.balance_jod.toFixed(2)} د.أ</Text>       {/* الرصيد الكلّي! */}
```
بينما `PayoutService.php:44-46` يرفض بناءً على **المتاح**.

⇒ كابتن لديه سحب معلّق يرى رصيداً يشمل مبلغاً محجوزاً، يطلب سحبه، ويُرفَض برسالة تبدو خاطئة. والمفتاح `payout.available` موجود في `ar.ts` لكنه **ميت**.
ومرافقة: `withdraw.tsx:24-31` لا يتحقق من الحدّ الأدنى (`MIN_PAYOUT_FILS = 5000`) رغم عرض `t('payout.minHint')`.

## ق7 — التطبيقان غير قابلين للاستخدام بقارئ الشاشة ✓

عبر **213 ملفاً**:

| السمة | العدد |
|---|---|
| `accessibilityRole` | **2** (كلاهما في `Button.tsx`) |
| `accessibilityLabel` | **0** |
| `aria-label` (الأدمن) | **0** |
| عناصر `Pressable`/`TouchableOpacity` | **156** |

⇒ **154 عنصراً تفاعلياً بلا أي تسمية أو دور.** الأزرار الأيقونية الصرفة غير قابلة للتمييز إطلاقاً في TalkBack/VoiceOver.
ومنها زر ميت فعلاً: `driver-app/app/(app)/earnings.tsx:56` — جرس **بلا `onPress`**.
والأدمن: **صفر `<th scope>`** في ~30 جدولاً.

---

# 🟠 خطير — مختصر

| # | المشكلة | الموقع |
|---|---|---|
| خ1 | **كل الجداول المالية `cascadeOnDelete` على `users`** — أي حذف صفّ مستخدم يمسح دفتر الأستاذ والمستندات المالية بلا أثر. يجب `restrictOnDelete` | `wallets:13` · `wallet_transactions:13` · `payment_requests:17` · `payout_requests:18` · `coupon_redemptions:20` · `trip_passengers:15` |
| خ2 | **لا مهمة لإنهاء الاشتراكات**، والانتهاء يُفحص في PHP فقط ⇒ صفوف `active` أبدية وكل تقرير يعتمد `status` خاطئ. و`ends_at` بلا فهرس. و`addDays()` ينتهي منتصف اليوم لا `endOfDay` | `Subscription.php:53-57` · `routes/console.php` · `SubscriptionService.php:55` |
| خ3 | **جداول تنمو بلا تقليم**: `audit_logs` (سجل لكل حركة محفظة) · `rafeeq_notifications` · `chat_messages` · `ai_messages` | `routes/console.php` يقلّم OTP والتتبّع فقط |
| خ4 | **استعلام المطابقة بلا حدّ** — يسحب كل الطلبات المعلّقة بلا `limit`/`chunk` ثم حلقات متداخلة ⇒ انفجار ذاكرة العامل كل 5 دقائق عند التراكم | `MatchingService.php:42-43` |
| خ5 | **`unsigned` ليست unsigned في Postgres** ولا `CHECK` ⇒ كل أعمدة المال تقبل قيماً سالبة على مستوى القاعدة؛ الحماية تطبيقية فقط | `trip_passengers:25-27` · `trips:21` · `payout_requests:19` |
| خ6 | **مفاتيح أجنبية «منطقية» بلا قيد فعلي** ⇒ مراجع يتيمة. أخطرها `trips.zone_id` لأن التقرير المالي يجمع الإيراد حسبه | `create_trips_table:18` · `student_profiles:16-17` · `coupons:20-21` |
| خ7 | **حالة حسّاسة تبقى بعد الخروج** — الكوبون المفعّل في AsyncStorage لا يُمسح ⇒ الطالب التالي على نفس الجهاز يرثه ويُطبَّق تلقائياً | `student-app/src/store/coupon.ts` |
| خ8 | **إقلاع تفاؤلي يترك `user: null` مع `status: 'authenticated'`** — عند انقطاع الشبكة يدخل التطبيق بلا مستخدم؛ كل شاشة تحمي نفسها بـ`?.` وأي شاشة تنساها تُعطب | كلا `auth.ts:46-63` / `60-78` |
| خ9 | **401 فقط مُعالَج مركزياً** — لا معالجة لـ403/422/500؛ ورسالة الخادم تُعرَض حرفياً للمستخدم النهائي | `packages/api-client/src/client.ts:51-68` |
| خ10 | **timeout 15s موحّد ولا retry** ⇒ رفع **إثبات تحويل CliQ** يُقطَع على 3G، فيرى الطالب خطأ شبكة ويبقى الطلب `pending` بلا إثبات | `client.ts:41` · `checkout.tsx:100` |
| خ11 | **انحراف العقد Resource↔TS** — `RideRequest.zone.name_en` معلَن وغير مُرسَل ⇒ يُعرض `undefined` بالإنجليزية؛ وحقول `Trip.type/direction/is_express` مُرسَلة وغير معلَنة | `models.ts:163-190, 321-345` |
| خ12 | **نصوص مكتوبة يدوياً** — ~40 موقعاً في التطبيقات، و**لوحة الأدمن عربي مثبّت بالكامل** تتجاهل مبدّل اللغة | `drivers/page.tsx:10-15` · `payments/page.tsx:9-20` · `push.ts` (أسماء قنوات أندرويد) · `invoice.ts` |

---

# 🟡 متوسط — مختصر

| # | المشكلة |
|---|---|
| م1 | **تسرّب تقريب لصالح الكابتن** — `intdiv($fare * $pct, 100)` يبتر دائماً للأسفل ⇒ المنصّة تخسر حتى 0.99 فلس/مقعد. عند 5,000 رحلة/يوم ≈ **2.5 دينار/يوم**. (المعادلة نفسها zero-sum صحيحة — الانحياز في اتجاه التقريب فقط) |
| م2 | **فهارس زائدة على أسخن جدول كتابةً** — `trip_tracking` فيه `index(recorded_at)` مفرد **لا يُستخدم** بجانب المركّب، ويكلّف كتابة على كل نبضة GPS |
| م3 | **فهرس مكرر بالبادئة** — `wallet_holds.index(reference)` مغطّى كلياً بـ`index([reference,status])` |
| م4 | **`unique` مفقود** على `coupon_redemptions(coupon_id,user_id,context_type,context_id)` — الحماية منطقية فقط |
| م5 | **`users.phone` unique غير جزئي مع softDeletes** ⇒ رقم مستخدم محذوف يبقى محتجزاً للأبد ويمنع إعادة التسجيل |
| م6 | **دقّة تحويل الفلس غير متسقة** — `toFixed(2)` **تبتر خانة الفلس الثالثة** في `plans` و`routes`؛ و`parseFloat` بلا تحقق في شاشة تعديل الرصيد يقبل `"1e3"` = 1000 دينار |
| م7 | **طلب مزدوج مضمون** — `earnings.tsx:65-66` فيه `useFocusEffect` **و** `useEffect` معاً ⇒ 6 طلبات على كل دخول |
| م8 | **`subscribe` + `payments.create` غير ذرّيين** بلا idempotency ⇒ فشل الثاني يترك اشتراكاً يتيماً، وإعادة المحاولة تُنشئ ثانياً |
| م9 | **سباق `refreshDriver()`** — يُستدعى من مسارين بلا تسلسل؛ الاستجابة الأبطأ تكتب فوق الأحدث |
| م10 | **`key={idx}` على رؤوس مضلّع قابلة للحذف** ⇒ حذف رأس وسطي يربط القيم بالرأس الخاطئ | `zones/page.tsx:242` |
| م11 | **30 نصاً أصغر من 12px** (حتى `fontSize: 9`) لا تحترم تكبير خط الجهاز |
| م12 | **194 مفتاح ترجمة ميت** (العدد الحقيقي أقل — بعضها أهداف مفاتيح ديناميكية) |
| م13 | **`rating_avg` افتراضي 0.00** ⇒ كابتن جديد يظهر أسوأ من الجميع لا «بلا تقييم». و`trips.capacity` افتراضي 4 لا يُشتق من المركبة |
| م14 | **`useCurrent()` كامن** في `wallet_transactions:20` و`audit_logs:20` — لا انزياح حالياً لأن كل الكتابات عبر Eloquent، لكن أي `DB::table()->insert()` أو seed مستقبلي سيُنتج صفوفاً بانزياح 3 ساعات **داخل الدفتر المالي** |

---

# ✅ محاور نظيفة — صراحةً

معرفة ما **لا** يحتاج عملاً توفّر وقتاً بقدر معرفة ما يحتاجه:

| المحور | الحالة |
|---|---|
| **تمثيل المال** | ✅ **لا يوجد أي `float`/`double`/`decimal` على مبلغ نقدي في كل الهجرات.** كل المال `*_fils` أعداد صحيحة. القسمة على 1000 تحدث **في طبقة العرض فقط** ولا تُخزَّن أبداً |
| **انقسام العمولة** | ✅ `PricingService::splitCommission` مصدر وحيد؛ `commission + captain_share = fare` رياضياً دائماً |
| **`sum()` على null** | ✅ `COALESCE(SUM(...),0)` صريح في التقارير، و`amount_fils` هو `NOT NULL` |
| **المنطقة الزمنية الأساسية** | ✅ `Asia/Amman` صحيحة، والأردن ثبّت UTC+3 وألغى التوقيت الصيفي منذ 2022 ⇒ **لا خطر DST**. وحدود التقارير متسقة، و`startOfWeek(SATURDAY)` صحيح أردنياً |
| **أقفال المحفظة والكوبونات** | ✅ `lockForUpdate` في كل عمليات المحفظة مع حرس `$newBalance < 0`، والكوبون يعيد التحقق من الحدود **تحت القفل** |
| **مفاتيح فريدة ذكية** | ✅ `unique_approved_bank_reference` (حوالة CliQ واحدة = دفعة معتمدة واحدة) · `trip_passengers.unique(trip_id,student_id)` · `wallets.unique(user_id)` |
| **تغطية الفهارس** | ✅ `add_hotpath_foreign_key_indexes` يغطي أعمدة FK الساخنة بشكل جيد؛ لا أعمدة استعلام ساخنة بلا فهرس خارج ما ذُكر |
| **تخزين توكن الجوال** | ✅ **`expo-secure-store`** (Keychain/Keystore) لا AsyncStorage. AsyncStorage لبيانات غير حسّاسة فقط |
| **التسجيل (logging)** | ✅ **صفر `console.log`**؛ أربع `console.warn` بلا توكنز ولا PII |
| **اتساق المال على السلك** | ✅ كل حقل مالي عدد صحيح `_fils` بلا استثناء؛ لا مال عشري يُرسَل من الفرونت |
| **تطابق أنواع الأعداد** | ✅ صفر حالة `number` مقابل نص — كل `decimal` cast مُصحَّح بـ`(float)` في الـResource |
| **تنظيف المؤقتات في الشاشات** | ✅ كل `setInterval`/`addEventListener`/`watchPosition` **داخل شاشة** له تنظيف صحيح، و`watchLocation()` يحمي من setState-بعد-unmount بعلم `cancelled`. الاستثناء الوحيد مؤقّت `availability` (ق4) |
| **لا API داخل render** | ✅ بلا استثناء |
| **حماية النقر المزدوج** | ✅ أزرار الدفع محمية فعلاً بـ`disabled`/`loading`؛ الخطر في عدم ذرّية التسلسل لا في النقر |
| **تغطية مفاتيح i18n** | ✅ `ar.ts` و`en.ts` **متناظران تماماً (640/640)**، وصفر مفتاح مستخدم ومفقود، والمُحلّل fail-soft |

---

## ما لم أتحقق منه — أمانةً

- **`RewardService.php:122`** — `intdiv($points, POINTS_PER_JOD)`: لم أقرأ الدالة كاملة للتأكد أن الباقي يُعاد إلى رصيد النقاط ولا يُبتر.
- **الفهارس الزائدة** مستنتجة من أنماط الاستعلام في الكود، **بلا `EXPLAIN` على قاعدة حقيقية**.
- **`APP_TIMEZONE` داخل حاويات العاملين/الجدولة** — لم أتحقق من `.env.production.example`.
- **مَصْرَف XSS فعلي في الأدمن** — لم أفحص `dangerouslySetInnerHTML`، فـق5 مساحة تعرّض لا سلسلة استغلال مؤكدة.
- **~20 من 194 مفتاح i18n «ميت»** قد تكون أهداف مفاتيح قوالب ديناميكية لم يربطها الفحص الساكن.
- **103 موقع `useEffect`** — ركّزت على أثرَي الاستقصاء والاشتراك والمتاجر، لا كل موقع على حدة.

---

## الترتيب المعدَّل

| الأولوية | العمل | لماذا |
|---|---|---|
| **0** | ق4 (بثّ الموقع بعد الخروج) · ق5 (توكن الأدمن) | خصوصية وأمان مباشران |
| **0** | ق2 (المال يتبخّر) · ق1 (انزياح 3 ساعات) | خسارة مالية جارية الآن |
| **1** | ق3 (الاحتساب المزدوج) · خ1 (cascade على المال) · خ5 (`CHECK >= 0`) | سلامة الدفتر |
| **1** | ق6 (الرصيد المتاح) + إكمال نوع `Wallet` | يُربك الكباتن يومياً |
| **3** | خ2 (إنهاء الاشتراكات) · خ3 (تقليم الجداول) · خ4 (حدّ المطابقة) | تشغيلي |
| **4** | م1 (تسرّب التقريب) · م6 (دقّة الفلس) | مالي تراكمي |
| **5** | ق7 (إمكانية الوصول) · خ12 (النصوص اليدوية) · خ9/خ10 (معالجة الأخطاء والرفع) | يُبنى داخل `packages/ui` |
| **9** | خ6 (المفاتيح الأجنبية) · م2/م3 (الفهارس) · م4/م5 (`unique`) | هجرات تصحيحية |

> الخطة الرسمية الكاملة: [`../plan/01-OFFICIAL-ROADMAP.md`](../plan/01-OFFICIAL-ROADMAP.md)
