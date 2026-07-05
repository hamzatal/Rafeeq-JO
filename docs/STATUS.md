# حالة المشروع الموحّدة — رفيق (Rafeeq) · Project Status

> ملف موحّد يجمع: التقدّم (Progress)، التسليم (Handoff)، قائمة الإطلاق (Launch Checklist)، الدراسة المعيارية (Benchmarks)، والتدقيق (Audit).
> **المصدر الرسمي للحالة الحيّة هو قسم "التقدّم (Progress)" أدناه.**


---

# 1) التقدّم (Progress)

# حالة المشروع — رفيق (Rafeeq)

> **اقرأ هذا الملف أولاً في أي جلسة جديدة.** ثم `docs/HANDOFF.md` (ملخّص شامل) و`docs/ROADMAP.md` و`.kiro/steering/`.
> لا تطلب من المستخدم إعادة شرح المشروع — استأنف من قسم "الخطوة التالية".

| | |
|---|---|
| الفرع الحالي | `foundation/phase-0-1` |
| آخر Commit | RFQ-260 |
| نسبة الإنجاز | ~99% (كود) · **Laravel 12 (أمان) + مساعد بـ function-calling + فواتير PDF + ترجمة backend واعية بالـ locale + حوكمة AI + مكافحة احتيال CliQ** · 135 اختبار |
| المرحلة الحالية | **منصّة مكتملة المزايا، 30 وحدة backend · 71 اختبار · ~194 مسار. ✅ تشغيل فعلي مُتحقَّق على PostgreSQL 16 (migrate+seed+E2E). المتبقّي: التكاملات الخارجية + تلميع + إطلاق** |

---

## الخطوة التالية (ابدأ من هنا) ▶️
> **العمل الحالي:** **ري-ديزاين جذري شامل + إصلاح مشاكل تدفّق** (انظر القائمة). منجز: إصلاح تدفّق الدخول (OTP). التالي: نظام تصميم v4 (دارك حقيقي + هوية جديدة).

**✅ RFQ-285 — لمسة لوحة الكابتن (مفتاح «متصل» أخضر ليموني):**
- مفتاح Online/Offline صار أخضر ليموني عند التفعيل (حالة إيجابية بأسلوب inDrive) + حدّ البطاقة ليموني عند الاتصال.
- تأكيد تطابق مفاتيح الترجمة عربي/إنجليزي (521 مفتاح متطابق).


- **إزالة إدخال الإحداثيات اليدوي** (خط الطول/العرض) — استُبدل بـ **خريطة تضغط عليها لتحديد نقطة انطلاقك** + زر «موقعي الحالي» عائم.
- اختيار الجامعة عبر `Chip` المشترك، ونوع الرحلة عبر `SegmentedControl`، وسعر تقديري يُحسب تلقائياً، وكوبون اختياري قابل للطيّ، وزر «اطلب» ليموني — كله نظيف وبسيط.
- i18n: `rideRequest.type`.


- استبدال الـ Segment المحلي بمكوّن `SegmentedControl` المشترك (نفس مبدّل اللغة/الثيم بالطالب) + إزالة الستايلات الميتة — اتساق كامل بين التطبيقين.


- **`AuthShell` جديد** (للتطبيقين): خلفية غامقة أنيقة `#0E0F12` بتوهّج ليموني خفيف + **شعار موحّد** (مربّع ليموني + «ر») + عنوان كبير واضح + عبارة — يظهر الشعار الآن في الطالب أيضاً.
- **توحيد كل شاشات المصادقة** على نفس الشكل: ترحيب/دخول/تسجيل/OTP/استعادة كلمة المرور — للطالب والكابتن (أزرار ليمونية موحّدة + زر OTP ثانوي أنيق + روابط واضحة).
- **حقول إدخال بنمط غامق** (`onDark`): نص أبيض واضح على خلفية غامقة، حدود لطيفة.
- **عبارات أفضل:** عناوين وعبارات فرعية محسّنة ومميّزة للطالب والكابتن (`auth.studentSigninSub/Signup`, `captainSigninSub/Signup`).


- **نظام ألوان v5 (مستوحى من inDrive، ليس نسخة):** القماشة نظيفة محايدة، النصوص/الأيقونات/الحالات **سوداء (إنك)**، و**لون واحد مميّز = أخضر ليموني `#C1F11D`** مخصّص للزر الأساسي (أخضر + نص أسود) والإبرازات — نفس فكرة وبساطة inDrive.
- **الزر الأساسي** صار أخضر ليموني بنص أسود عبر التطبيقين (توقيع inDrive).
- **التاب بار:** مؤشّر العنصر النشط أخضر ليموني (نصوص/أيقونات سوداء مقروءة).
- **شاشة الترحيب:** مربّع لوقو أخضر ليموني بحرف أسود.
- البطاقات الداكنة (الاشتراك/المحفظة) صارت سوداء بإبرازات ليمونية = مظهر inDrive القوي. النصوص تبقى مقروءة (أسود على أبيض).


- **خريطة تملأ الشاشة بالكامل** (التطبيق = الخريطة)، مع أزرار عائمة علوية (الحساب + الإشعارات).
- **شيت سفلي** فيه ترحيب مختصر + **«إلى وين؟» مهيمن** (نمط Uber) → طلب الرحلة، + **وجهات محفوظة** (المنزل/الجامعة) + «أضف وجهة».
- **شريط خدمات أفقي** (اشتراك/طرود/مكافآت/مفقودات/دعم) + شريط مختصر للمحفظة والرحلات المتبقية.
- i18n: `home.label*`, `home.addPlace`, `home.services`, `common.now`.


- **المبدأ الجديد:** تقليل الألوان والدوائر الملوّنة والبطاقات الضخمة → حياد (أبيض/فحمي)، مساحات أوسع، خطوط دقيقة، أيقونات أحادية، **لون واحد (إندِيغو) للأكشن والحالة النشطة فقط**.
- **التوكنز:** حواف أصغر (xl 16، 2xl 20) وظلال أنعم بكثير.
- **التاب بار:** أُزيلت الحبّة الملوّنة الكبيرة → أيقونة + تسمية هادئة + مؤشّر علوي رفيع للنشط (طالب + كابتن).
- **شاشة الترحيب:** أُعيد بناؤها مينِمال (خلفية نظيفة، لوقو طِباعي، خط كبير، CTA واحد) بدل الصورة/الجلو/العبارات المتحرّكة.
- **الرئيسية:** خريطة بشريط بحث عائم أنيق، **قوائم مسطّحة مجمّعة بفواصل دقيقة** (اشتراك/محفظة/رحلات)، شبكة خدمات أحادية اللون — بدل البطاقات الملوّنة الضخمة والدوائر.


- **كل حساب الآن له كلمة مرور** تُعيَّن عند التسجيل (اسم + رقم + كلمة مرور + تأكيد) — للطالب والكابتن.
- **الدخول بكلمة المرور أساسي** (يعمل حتى لو الـ OTP/SMS متوقّف) + زر **«الدخول برمز OTP»** كاحتياطي + رابط **«نسيت كلمة المرور؟»**.
- **شاشة «إعادة تعيين كلمة المرور»** (رقم → رمز → كلمة مرور جديدة) للتطبيقين.
- api-client: `forgotPassword` + `resetPassword`. (الباك إند كان يدعم الباسورد أصلاً.)
- **اختبارات:** `PasswordAuthTest` (التسجيل يخزّن كلمة المرور، الدخول الصحيح يرجّع توكن، الخطأ يُرفض). **كامل السويت 144 ناجح ✅**.


- **الأدمن (Next/Tailwind):** تحديث `tailwind.config.ts` — primary إندِيغو `#4F46E5`، «navy» صار فحمياً محايداً للنص/الشريط الجانبي، accent سماوي `#22D3EE`، و**دارك حقيقي** (`dbg #0A0A0C` بدل الكحلي). تحديث `globals.css` (خلفية الجسم + شريط التمرير) و`global-error.tsx`.
- **الكابتن (RN):** متوائم تلقائياً عبر ثيم v4 المشترك (إندِيغو + زمرّدي + دارك حقيقي) + التاب بار الجديد — لا حاجة لتغيير إضافي.
- **بهذا اكتملت إعادة الهيكلة الجذرية للمنصة الثلاثية (طالب/كابتن/أدمن).**


- تدقيق الشاشات الثانوية (طرود/مفقودات/تبادل/مكافآت/دعم/مساعد/طوارئ/عناوين): **نظيفة i18n** وتتبنّى هوية v4 تلقائياً؛ أُصلح حرفا العملة «د.أ» في المكافآت → `subscriptions.currency`.
- **`ListSkeleton` جديد** في kit (صفوف بطاقات وهمية متلألئة) + استُخدم في **الإشعارات والاشتراكات** أثناء التحميل (بدل وميض الفراغ/نص «جارٍ التحميل»).


- **`StudentApi` جديد بالـ api-client** (`getProfile`/`updateProfile`) موصول بـ `PATCH /v1/student/profile`، ومُسجّل في `RafeeqApi` (`api.student`).
- **شاشة `(onboarding)/profile-setup.tsx`**: تحمّل الجامعات (`catalog.listUniversities`) كـ Chips + رقم جامعي اختياري → حفظ → الرئيسية (مع Skeleton للتحميل و«تخطّي»).
- **التوجيه:** بعد تسجيل ناجح (purpose=register) → إعداد الملف؛ الدخول → الرئيسية مباشرة. i18n `onboarding.setup*`.


- **الباك إند:** `POST /v1/subscriptions/{id}/pay-wallet` → خصم ذرّي من الرصيد (يرفض INSUFFICIENT_BALANCE) + تفعيل فوري للاشتراك. نوع محفظة جديد `subscription_payment` + هجرة محميّة لـ Postgres (no-op على sqlite).
- **الواجهة (checkout):** شاشة «اختر طريقة الدفع» — **ادفع من المحفظة** (يعرض الرصيد، تفعيل فوري) أو **حوّل عبر CliQ** (رفع إيصال → بانتظار التأكيد). حالة نجاح خضراء «تم التفعيل 🎉».
- **api-client:** `transport.paySubscriptionFromWallet(id)` + endpoint. + i18n `checkout.*`.
- **اختبارات:** `WalletSubscriptionPaymentTest` (كفاية الرصيد → فعّال؛ نقص → 422). **كامل السويت 141 ناجح ✅**.


- الشاشات (ترحيب/رئيسية/إعدادات) تتبنّى هوية v4 تلقائياً (إندِيغو + دارك حقيقي + زوايا أكبر + تاب بار جديد).
- الإعدادات: استبدال الـ Segment المحلي بمكوّن `SegmentedControl` المشترك (اتساق) + إزالة الستايلات الميتة.
- الرئيسية: رفع البطاقة العائمة «إلى أين؟» لظل `lg` (إحساس عائم premium).


- مكوّن `TabBar` مخصّص جديد لكل تطبيق يستبدل التاب بار الافتراضي القديم: العنصر النشط يتحوّل إلى **حبّة (pill) ملوّنة بالبراند مع أيقونة + تسمية inline**، وغير النشط أيقونة نظيفة فقط — مع حركة `LayoutAnimation` عند التبديل (روح/حركة).
- يحترم RTL + الثيم (لايت/دارك) + الـ safe area، ويصفّي الشاشات المخفية تلقائياً.


- **`docs/DESIGN_SYSTEM.md`** جديد: الهوية الكاملة (ألوان/خطوط/مسافات/مبادئ).
- **براند موحّد إندِيغو** `#4F46E5` عبر المنصة + تأكيد لكل دور (طالب كهرماني / كابتن زمرّدي / أدمن سماوي) — بدل الكحلي القديم.
- **دارك مود حقيقي**: لوحة فحمية قريبة من الأسود `#0A0A0C/#141417/#1B1B20` (لا تدرّج أزرق) بطبقات ارتفاع.
- الأساسي يبقى لون العلامة في الوضعين (أنظف وأحدث) + نص أبيض دائماً.
- **زوايا أكبر + ظلال أنعم + مستوى ظل `lg`** لإحساس عصري (`scheme.ts`, `spacing.ts`). كل المكوّنات تنعكس تلقائياً.


- كان الدخول يطلب **كلمة مرور** بينما التسجيل بالاسم+الهاتف فقط (OTP) — فالمستخدم لا يملك كلمة مرور ولا يستطيع الدخول!
- **تم توحيد الدخول على OTP** (طالب + كابتن): إدخال الرقم → `requestOtp` → شاشة الرمز (purpose=login) → دخول. لا كلمات مرور.
- i18n: `auth.loginHint` (عربي+إنجليزي).



**✅ RFQ-269 — Increment 7: تلميع نهائي (i18n الخريطة + اتساق):**
- **تنظيف نصوص `LiveMap` المكتوبة مباشرة** (للتطبيقين) → i18n: «فتح في الخريطة»، تلميح الضغط، وتسميات الـ legend (الكابتن/الالتقاط/الوجهة/الانطلاق) عبر `map.*`.
- **i18n:** قسم `map.{openInMap,pickHint,captain,pickup,destination,origin}` (عربي+إنجليزي).
- تأكيد: كل الشاشات المُعاد بناؤها (onboarding، خريطة-أولاً، checkout، المحفظة، timeline) تمرّ نصوصها عبر i18n وتتبع الثيم (لايت/دارك).



**✅ RFQ-268 — Increment 6: تتبّع الرحلة timeline + تكامل الطلب (طالب ↔ كابتن):**
- **مكوّن `TripTimeline` جديد (kit):** شريط حالة أفقي مطمئن (تم الحجز → بالرحلة → وصلت) بألوان دلالية + حالة «أُلغيت» — مضاف لكل بطاقة رحلة في `trips.tsx`.
- **تتبّع حيّ متكامل:** الكابتن يبثّ موقعه كل 12ث أثناء الرحلة (`driverTrips.pushLocation` في `trip/[id].tsx` عند `started`)، والطالب يراه عبر Reverb (realtime) **أو polling تلقائي كل 12ث** عند غياب Reverb (تدهور آمن) في `trips.tsx`.
- **حلقة الطلب مكتملة:** الكابتن يقبل العرض → يبدأ الرحلة → يبثّ الموقع؛ الطالب يرى الحالة والموقع وأكواد الصعود/النزول.
- **i18n:** `trips.{tlStatus,tlBooked,tlOnboard,tlArrived,tlCancelled,live}` (عربي+إنجليزي).



**✅ RFQ-267 — Increment 5: تدفّق اشتراك + دفع منطقي + محفظة موحّدة:**
- **شاشة `checkout.tsx` جديدة (الطالب):** تدفّق فعلي = «اشترك وادفع» → `transport.subscribe` ثم `payments.create({purpose:'subscription', subscription_id})` → عرض تعليمات CliQ → «رفع الإيصال» (`submitProof`) → حالة **«بانتظار التأكيد»** واضحة. لا مزيد من «اشتراك وهمي» بلا دفع.
- **`subscriptions.tsx`:** زر «اشترك» صار يفتح checkout (بملخّص الباقة) بدل إنشاء اشتراك صامت.
- **`wallet.tsx` = المركز المالي الموحّد:** الرصيد + الشحن + الحركات + **قسم «طلبات الدفع»** (`payments.mine`) بحالاتها (بانتظار/مقبول/مرفوض) + رفع إيصال لكل طلب.
- **`src/lib/proof.ts`** مساعد مشترك لاختيار إيصال CliQ (native/web، lazy، لا يرمي).
- **i18n:** قسم `checkout.*` + `wallet.{paymentRequests,noPaymentRequests,uploadProof}` (عربي+إنجليزي). checkout مسجّل كتاب مخفي.



**✅ RFQ-266 — Increment 4: حساب موحّد متعدد الأدوار (رقم واحد: طالب + كابتن):**
- **الباك إند:** endpoint جديد `POST /v1/auth/become-driver` (مصادَق) يضيف دور `driver` + يُنشئ `driver_profile` (idempotent) للحساب الحالي دون إنشاء حساب ثانٍ. الطالب يحتفظ بدوره وبياناته.
- **التطبيق (كابتن):** أي تسجيل دخول ناجح يستدعي `becomeDriver` تلقائياً (في `apply`)؛ وشاشة التسجيل ترجع تلقائياً لـ **OTP دخول** عند اكتشاف أن الرقم مسجّل مسبقاً (422) بدل رسالة «الرقم مسجّل» — فيدخل المستخدم ويُفعّل صفة الكابتن.
- **api-client:** `AuthApi.becomeDriver()` + `ENDPOINTS.auth.becomeDriver`.
- **اختبارات:** `tests/Feature/BecomeDriverTest.php` (طالب يصبح كابتن بنفس الحساب + idempotent). **كامل السويت 139 اختبار ناجح ✅** (أُضيف 2).



**✅ RFQ-265 — Increment 3: خريطة-أولاً (الطالب + الكابتن):**
- **رئيسية الطالب `home.tsx`** أُعيد بناؤها لتكون خريطة-أولاً: `LiveMap` بارزة تتمركز على موقع الطالب (عبر `getCurrentLocation` بتدهور آمن) + بطاقة «إلى أين؟» عائمة تفتح طلب الرحلة، ثم اشتراك مختصر + محفظة + صف خدمات أفقي + آخر الرحلات. كل النصوص i18n.
- **رئيسية الكابتن `dashboard.tsx`** أُعيد بناؤها لتكون خريطة-أولاً: خريطة بموقع الكابتن + **مفتاح Online/Offline حقيقي** (`Switch`) + أرباح اليوم + تقييم/رحلات + روابط. الاعتماد (pending/approved) محفوظ.
- **توفّر الكابتن فعلي:** `driver-app/src/store/availability.ts` — عند «متصل» يبثّ الموقع كل 15ث عبر `POST /driver/location` (endpoint موجود بالباك إند، أُضيف للـ api-client + constants).
- **api-client:** `DriverApi.pushLocation(lat,lng,speed?)` + `ENDPOINTS.driver.location`.
- **i18n:** `home.{whereTo,requestRideCta,nearby,activeSubscription,viewAll,noActiveSub,remainingRides,endsIn,recentTrips,moreServices,...}` + `driver.{online,offline,goOnline,goOffline,onlineHint,offlineHint,todayEarnings,locationNeeded}` (عربي+إنجليزي).



**✅ RFQ-264 — Increment 2: Onboarding + تمهيد الأذونات (الطالب + الكابتن):**
- **مكتبة أذونات آمنة** `src/lib/permissions.ts` (للتطبيقين): wrappers حول expo-location/expo-notifications، lazy + لا ترمي أبداً (web/simulator → unavailable).
- **مجموعة `(onboarding)` جديدة** لكل تطبيق: `intro.tsx` (3 شرائح معرّفة بالخدمة + تخطّي) + `permissions.tsx` (تمهيد الموقع والإشعارات في سياقها مع شرح القيمة + «لاحقاً»).
- **توجيه أول تشغيل:** `index.tsx` (للتطبيقين) يمرّ عبر onboarding أول مرة فقط (flag `introSeen` في prefs)، ولا يُجبر المستخدمين الحاليين عليه.
- **مفاتيح i18n** `onboarding.*` و`permissions.*` (عربي + إنجليزي) — شرائح مختلفة للطالب (s1-3) والكابتن (d1-3) ونصوص أذونات مخصّصة لكل دور.
- الديفولت عربي/لايت محفوظ؛ كل النصوص عبر i18n؛ لايت+دارك مدعومان.



**✅ RFQ-263 — Increment 1: نظام التصميم الموحّد v3 (tokens + primitives):**
- **`docs/EXECUTION_PLAN.md`** (جديد): خطة تنفيذ ملموسة بـ7 Increments قابلة للشحن، ملفات مستهدفة، ومعايير قبول لكل واحدة، مبنية على دراسة الكود الفعلي.
- **توسيع `packages/shared/src/theme/scheme.ts`** (إضافي وآمن): tokens دلالية جديدة على `ThemeColors` — `accentSoft`, `elevated`, `textInverse`, `hairline`, `scrim`, و`successSoft/warningSoft/dangerSoft/infoSoft` — مع قيم لايت/دارك. لا يكسر أي شاشة قائمة.
- **مكتبة primitives فاخرة جديدة `src/components/kit.tsx`** (للطالب والكابتن): `PressableScale`, `Sheet` (bottom sheet + scrim), `SegmentedControl`, `Stepper`, `Chip`, `Divider`, `Skeleton`, `KeyValue` — كلها theme-aware + RTL + بلا نصوص hardcoded.
- **تطوير `Button`** (الطالب والكابتن): variants `primary|outline|ghost|danger` + أحجام `md|lg` + أيقونة، مع إبقاء الواجهة القديمة متوافقة.



**✅ RFQ-262 — دراسة معيارية معمّقة لـ20 تطبيق (Benchmark):**
- **وثيقة جديدة `docs/BENCHMARK.md`**: دراسة تطبيق-تطبيق لـ20 تطبيق (10 عالمي: Uber/Lyft/Bolt/DiDi/inDrive/Grab/Gojek/Talabat/Deliveroo/DoorDash + 10 أردني/إقليمي: Jeeny/Careem/Uber JO/inDrive JO/Petra Ride/TaxiF/Tawseela/Careem Food/TolApp JO/فوم) — لكل تطبيق: ما هو + أنماط التصميم + الدرس المطبّق على رفيق، + جدول مقارنة + الدروس المُجمّعة للطالب والكابتن، + مصادر موثّقة بالروابط.
- أبرز الدروس: خريطة-أولاً، حساب واحد متعدد الأدوار (Uber One Identity)، تطبيقان بهوية موحّدة، بساطة الزر الواحد، اشتراك بقيمة واضحة + قواعد صريحة، تتبّع timeline مطمئن، دفع نقدي + محفظة موحّدة، WCAG 4.5:1.
- ربط الوثيقة بـ`REVAMP_PLAN.md §4`.

**✅ RFQ-261 — تشخيص شامل + إصلاحات UX فورية + خطة إعادة التصميم:**
- **وثيقة جديدة `docs/REVAMP_PLAN.md`**: تشخيص مُفصّل (بمراجع ملفات) لمشاكل تطبيق الطالب (تصميم/دارك/اشتراكات بلا دفع/تعقيد) وتطبيق الكابتن (رقم واحد لمنصتين، دارك مود لا يعمل، ازدحام لوني)، + بنش‑مارك (10 عالمي + 10 أردني + Jeeny)، + نظام تصميم v3، + خطة تنفيذ مراحل A→E.
- **إصلاحات طُبّقت فوراً:** (1) **إزالة السبلاش من لوحة الأدمن** (استبدال بمؤشّر تحميل بسيط + حذف `BrandSplash.tsx` + تنظيف CSS). (2) **تفعيل الدارك/لايت مود فعلياً لتطبيق الكابتن** (إزالة فرض الـ HUD الداكن في `theme/scheme.ts`؛ الكابتن الآن كحلي `#0B2C42` + سماوي يحترم اختيار المستخدم). (3) **ديفولت الكابتن = لايت** (مطابقة قاعدة عربي+لايت). (4) StatusBar الكابتن ديناميكي.
- المتبقّي حسب الخطة: Onboarding/أذونات، خريطة‑أولاً، رقم‑واحد‑دوران (طالب+كابتن)، تدفّق اشتراك+دفع منطقي، تبسيط التطبيقين.

> **العمل السابق:** خطة إصلاح شامل وتجهيز للإطلاق (11 مهمة) — **اكتملت كلها ✅** + تحسينات تصميم (RFQ-216). راجع `docs/LAUNCH_CHECKLIST.md` للمتبقّي التشغيلي.

**✅ RFQ-260 — عارض سجلّ التدقيق (Audit log) + تصدير CSV (ميزة جديدة بلوحة الأدمن):**
- باك إند: `AuditQueryService` (فلترة بالإجراء/المستخدم/النوع/التاريخ) + `AuditLogController` (`index` مُصفّح، `actions` للقائمة المنسدلة، `export` CSV مُتدفّق). مسارات `/api/v1/admin/audit-logs*` خلف صلاحية `audit.view` (كانت مُعرّفة بدون واجهة).
- مُساعد `Core/Support/Csv` يبث CSV بدون تحميل الكل بالذاكرة + BOM لِـ UTF-8 (عربي صحيح بالإكسل). أضفنا أيضاً تصدير CSV للتقرير المالي (`/reports/financial/export`).
- فرونت: صفحة `/audit` (جدول كامل العرض + فلاتر + زر تصدير) + زر "تصدير CSV" بصفحة التقارير. أضفنا الصفحة للسايد بار (admin-only) مع تلميح. مفاتيح ترجمة ar/en + مُساعد `downloadBlob`.
- ✅ 137 اختبار backend (3 جديدة: قائمة/فلترة/تصدير/صلاحية) + type-check أخضر (shared + api-client + admin).

**✅ RFQ-259 — خدمتا queue worker + scheduler في compose الإنتاجي (P0 تشغيلي):**
- أضفنا خدمة `queue` (`php artisan queue:work redis --tries=3 --timeout=600 --max-jobs=1000 --max-time=3600`) — بدونها لا يُنفّذ أي job مجدول (إشعارات جماعية، تحقّق إيصالات AI، fan-out للـ push).
- أضفنا خدمة `scheduler` (`php artisan schedule:work`) — تشغّل `rafeeq:prune-otps` (ساعةً) و`rafeeq:fraud-sweep` (ساعةً).
- كلاهما يعيد استخدام صورة `api` ويعتمد على postgres+redis. حدّثنا `docs/LAUNCH_CHECKLIST.md` (وصحّحنا سطر OTP لإزالة ذكر OpenWA).

**✅ RFQ-258 — الإشعارات الجماعية عبر Queue job (سدّ الفجوة P1 #2):**
- `BroadcastNotificationJob` (ShouldQueue, timeout=600, tries=3): يستقبل معايير الفئة (audience/user_ids/title/body/payload) ويعيد بناء الاستعلام ويوزّع على دفعات (chunkById 200). كل تسليم best-effort داخل `NotificationService` (لا يرمي استثناء).
- `AdminNotificationController.send` لم يعد يرسل بشكل متزامن: يحسب عدد الفئة (COUNT رخيص) ثم يطلق الـ job ويرجّع فوراً `{queued:true, estimated}` — إرسال لفئة كبيرة لا يحبس طلب الأدمن أبداً.
- الفرونت: نوع `sendNotification` أصبح `{queued, estimated}` + رسالة `notify.queuedFor` (ar/en) في لوحة الأدمن.
- ✅ 134 اختبار backend (حدّثنا `AdminBroadcastTest` ليتحقّق من `queued`+`estimated`؛ الطابور sync بالاختبارات فيعمل inline) + type-check أخضر.

**✅ RFQ-257 — ربط خصم الكوبون بأجرة الرحلة (سدّ الفجوة P1 #1):**
- مهاجرة `add_coupon_to_trips_billing`: عمود `coupon_code` على `ride_requests`، و`coupon_code`+`coupon_discount_fils` على `trip_passengers`.
- `RideRequestService.create` يخزّن `coupon_code` (بحروف كبيرة)، و`CreateRideRequestRequest` يتحقّق منه (nullable, max:40).
- `MatchingService` ينسخ الكود من الطلب إلى الراكب.
- `RideBillingService.chargeForBoarding` يطبّق الخصم وقت التحصيل: الطالب يدفع `fare - discount`، الكابتن يأخذ حصّته كاملة، والمنصّة تتحمّل الخصم من عمولتها (`commission = max(0, commission - discount)`). كوبون غير صالح/منتهٍ لا يوقف الرحلة أبداً (try/catch). يُستهلك الكوبون (`context='trip'`) عند نجاح التحصيل.
- الفرونت: `coupon_code?` في `CreateRideRequestInput` + تمريره من شاشة طلب الرحلة في تطبيق الطالب.
- ✅ 134 اختبار backend + type-check أخضر (api-client + student-app).

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


---

# 2) التسليم (Handoff)

# 📦 ملف التسليم الشامل — رفيق (Rafeeq)

> **للمحادثة الجديدة: اقرأ هذا الملف + `docs/PROGRESS.md` + `docs/ROADMAP.md` + `.kiro/steering/` قبل أي عمل.**
> ⚠️ **المصدر الرسمي للحالة الحيّة هو `docs/PROGRESS.md`** — عند أي اختلاف بالأرقام، اعتمد PROGRESS.
> آخر commit: **RFQ-203**. الفرع: `foundation/phase-0-1`. نسبة الإنجاز: **الكود ~99% / التشغيل الفعلي قيد التقدّم** (انظر `docs/LAUNCH_CHECKLIST.md`).
> **الإحصاءات الموحّدة:** 30 وحدة backend · ~62 migration · 71 اختبار (211 assertion) · ~194 مسار API · 3 تطبيقات (student-app · driver-app · admin-dashboard).
> **ملاحظة تاريخية:** الأقسام التفصيلية أدناه (قائمة "المتبقّي") كُتبت في مرحلة سابقة (RFQ-110) وقد تجاوزها التنفيذ — معظم ما يُذكر فيها كـ"لم يُبنَ" أصبح مبنيّاً بالكامل. اعتمد PROGRESS.md للحالة الفعلية.
> **حُذف نهائياً (RFQ-199):** تطبيق ولي الأمر `guardian-app` ووحدة `Modules/Guardians` — استُبدل بميزة جهات اتصال الطوارئ داخل تطبيق الطالب (`Modules/Safety`).
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
> **المصدر الرسمي للحالة والخطوة التالية: `docs/PROGRESS.md` + `docs/LAUNCH_CHECKLIST.md`.**

اكتملت كل موديولات الـ backend (30 وحدة) وتطبيقات الفرونت الثلاثة. ✅ **تم التحقق الفعلي على PostgreSQL 16** (migrate:fresh + seed + تدفّق E2E: register→verify-otp→token→مسار محمي). المتبقّي للإطلاق الرسمي (راجع `LAUNCH_CHECKLIST.md`):
1. **التكاملات الخارجية**: بوابة OTP فعلية (WhatsApp/SMS) + CliQ + FCM + OpenAI.
2. **النشر**: خادم إنتاج + Redis + HTTPS + عامل الطابور/الجدولة.
3. **الخرائط الفعلية** (Google Maps) بدل Leaflet/OSM.
4. **استكمال صفحات لوحة الإدارة** + توسيع الاختبارات + E2E على أجهزة حقيقية.

رسالة الانتقال: "أكمل مشروع رفيق (hamzatal/Rafeeq-JO، فرع foundation/phase-0-1). اقرأ docs/PROGRESS.md و docs/LAUNCH_CHECKLIST.md و docs/HANDOFF.md و .kiro/steering/. آخر commit RFQ-203. بدون اختصار أو حذف مزايا."


---

# 3) قائمة الإطلاق (Launch Checklist)

# تقرير: المتبقّي حتى الإطلاق الرسمي لمنصّة رفيق

> تقرير صادق ومفصّل بحالة كل بند. الرموز: ✅ منجز · ⏳ متبقٍّ · ⚠️ غير مُتحقَّق منه فعلياً.
> الأولويات: **P0** = حاجز إطلاق (لا إطلاق بدونه) · **P1** = مهم · **P2** = تحسين لاحق.

---

## ملخّص تنفيذي
- **الكود والمزايا والتصميم**: مكتمل ~95% بجودة إنتاجية (30 وحدة backend، ~194 مسار API، 71 اختبار، 3 تطبيقات، لوحة إدارة).
- **التشغيل الفعلي (operationalization)**: ~30% — هذا هو **العائق الأساسي للإطلاق**.
- **التقدير الإجمالي للوصول لإطلاق رسمي**: ~3–6 أسابيع عمل فعلي (حسب توفّر الحسابات/التكاملات والأجهزة).

---

## 1) البنية التحتية والنشر — **P0**
| البند | الحالة | المطلوب |
|------|--------|---------|
| سيرفر إنتاج (VPS/Cloud) | ⏳ | تجهيز خادم (Ubuntu/Docker) + دومين + SSL |
| PostgreSQL 16 + PostGIS | ✅/⚠️ | **مُتحقَّق محلياً على PostgreSQL 16** (migrate:fresh + seed + تدفّق E2E ناجح) — يتبقّى التشغيل الإنتاجي + النسخ الاحتياطي + تثبيت إضافة PostGIS فعلياً |
| Redis | ⏳ | مطلوب فعلياً (الكاش/الطابور/الجلسات/throttle الدخول) |
| نشر الباك إند (Laravel) | ⏳ | `docker-compose.prod.yml` موجود — يحتاج تشغيل + ضبط `.env` إنتاجي + `APP_KEY` |
| عامل الطابور + الجدولة | ✅/⏳ | خدمتا `queue` (`queue:work redis`) و`scheduler` (`schedule:work`) مُعرّفتان في `docker-compose.prod.yml` — يتبقّى تشغيلهما على الخادم الإنتاجي. الجدولة تشغّل `prune-otps` + `fraud-sweep` |
| التخزين (رفع الوثائق/الإيصالات) | ⏳ | S3 أو قرص + ضبط `filesystems` |
| مراقبة + لوقينغ | ⏳ | Sentry/Logtail + تنبيهات |

## 2) التكاملات الخارجية — **P0/P1**
| التكامل | الحالة الحالية | المطلوب للإطلاق |
|--------|----------------|------------------|
| **OpenAI (GPT/Vision)** | `NullGptClient` بديل آمن | **P1** — وضع `OPENAI_API_KEY` (عندك) لتفعيل مساعد رفيق + تحقّق إيصالات CliQ بالرؤية |
| **CliQ (الدفع)** | تدفّق المراجعة اليدوية جاهز | **P0** — حساب تاجر CliQ حقيقي + تجربة تحويل فعلية end-to-end + تأكيد الأرقام |
| **OTP (واتساب/SMS)** | `LogSmsGateway` + بوّابة **WhatsApp Cloud الرسمي (`whatsapp_cloud`)** | **P0** — ضبط `WHATSAPP_CLOUD_*` (توكن Meta + Phone ID + قالب authentication معتمد). دليل: `docs/WHATSAPP_OTP.md` |
| **الإشعارات (FCM)** | `LogPushGateway` بديل | **P1** — مشروع Firebase + `google-services` + مفاتيح FCM |
| **البثّ اللحظي (Reverb)** | حالياً polling (يعمل) | **P2** — تشغيل Reverb للتتبّع اللحظي الحقيقي بدل الـ polling |

## 3) بناء التطبيقات والنشر للمتاجر — **P0**
| البند | الحالة | المطلوب |
|------|--------|---------|
| تشغيل التطبيقات على جهاز | ⚠️ | **type-check فقط — لم تُشغَّل على موبايل حقيقي** → يلزم `expo start` وتجربة |
| بناء iOS/Android | ⏳ | إعداد EAS Build + أيقونات/Splash + أذونات (موقع/كاميرا/إشعارات) |
| حسابات المتاجر | ⏳ | Apple Developer ($99/سنة) + Google Play ($25) |
| مراجعة المتاجر | ⏳ | سياسة خصوصية + لقطات + وصف + الامتثال لقوانين المتاجر |
| لوحة الإدارة (نشر) | ⏳ | نشر Next.js (Vercel/سيرفر) + ربط `NEXT_PUBLIC_API_URL` |

## 4) الاختبار والجودة (QA) — **P0**
| البند | الحالة | المطلوب |
|------|--------|---------|
| اختبارات backend | ✅ 114 اختبار (SQLite) | **P1** — توسيع + تشغيلها على PostgreSQL في CI (مضاف) |
| تجربة end-to-end حيّة | ✅/⚠️ | **مُتحقَّق آلياً (HTTP + PostgreSQL 16)**: تسجيل→OTP→token→مسار محمي، دخول أدمن→insights/coupons/trips/users، RBAC، كوبون، مكافآت، رؤوس أمان (14 فحص E2E + 114 اختبار). يتبقّى التجربة اليدوية على **أجهزة حقيقية** |
| تجربة على أجهزة حقيقية | ⚠️ لم تتم | **P0** — iOS + Android متعدّد الأحجام + RTL + أداء |
| اختبار الحِمل/الضغط | ⏳ | **P1** — قبل الإطلاق الواسع |
| مراجعة بشرية للنصوص العربية | ⏳ | **P1** — لغوية + UX |

## 5) الأمان والامتثال — **P0/P1**
| البند | الحالة | المطلوب |
|------|--------|---------|
| MFA للإدارة | ✅ مبني | **P1** — تفعيل إلزامي لحسابات الإدارة |
| مكافحة الاحتيال (OTP طرفين، GPS، Risk Score، نزاعات) | ✅ مبني ومؤتمت | **P1** — معايرة العتبات ببيانات حقيقية |
| الأسرار/المفاتيح | ⏳ | **P0** — لا أسرار في الكود؛ كلها عبر `.env`/secrets manager |
| HTTPS + رؤوس أمان + CORS | ⏳ | **P0** — إلزامي بالإنتاج |
| `npm audit` (أدوات Expo) | ⚠️ | **P2** — تحذيرات أدوات بناء (مش إنتاج) — ترقية Expo SDK لاحقاً |
| فحص أمني/اختراق | ⏳ | **P1** — مراجعة قبل التعامل بأموال حقيقية |

## 6) مزايا/شاشات متبقّية — **P1/P2**
| البند | الحالة | الأولوية |
|------|--------|----------|
| صفحات إدارة النقل في لوحة Next.js (Routes/Plans/Subscriptions/Trips) | ⏳ (الـ API جاهز) | P1 |
| تلميع بكسلي 1:1 لكل شاشات Stitch (الهوية مطابقة، بعض الشاشات ليست بكسل-بَرفِكت) | ⏳ | P2 |
| Face/Liveness verification للكابتن (الأعمدة جاهزة) | ⏳ | P2 |
| لوحة AI insights للنزاعات (تحليل سردي GPT) | ⏳ | P2 |
| مزايا إضافية: رحلات نسائية، No-show، حوافز، SMS fallback | ⏳ | P2 |

## 7) قانوني وتشغيلي (أعمال) — **P0**
| البند | الحالة | المطلوب |
|------|--------|---------|
| ترخيص النشاط (نقل/تطبيق بالأردن) | ⏳ | **P0** — تراخيص هيئة تنظيم النقل + تجاري |
| اتفاقية الكباتن + شروط الاستخدام + الخصوصية | ⏳ (مسوّدات في `docs/legal`) | P0 |
| اتفاقية مزوّد الدفع (CliQ/بنك) | ⏳ | P0 |
| سياسة استرداد/إلغاء + دعم تشغيلي | ⏳ | P1 |
| تأمين المركبات/الركّاب | ⏳ | P1 |

---

## خارطة طريق مقترحة للإطلاق (مراحل)
1. **أسبوع 1 — تشغيل محلي/تجريبي:** نشر باك إند + PostgreSQL + Redis على سيرفر تجريبي، ربط تطبيق الطالب، تشغيل فعلي + إصلاح أخطاء runtime.
2. **أسبوع 2 — التكاملات:** OpenAI + بوّابة OTP (واتساب/SMS) + FCM + تجربة CliQ.
3. **أسبوع 3 — QA:** تجربة end-to-end على أجهزة حقيقية (طالب/كابتن/ولي أمر/إدارة) + إصلاحات.
4. **أسبوع 4 — البناء والنشر:** EAS builds + حسابات المتاجر + نشر اللوحة + الأمان (HTTPS/أسرار).
5. **أسبوع 5–6 — تجريبي محدود (Pilot):** جامعة واحدة + عدد محدود كباتن، معايرة مكافحة الاحتيال والتسعير، ثم الإطلاق الواسع.

> **القانوني (القسم 7) يمشي بالتوازي من البداية لأنه أطول زمنياً وحاجز إطلاق.**


---

# 4) الدراسة المعيارية (Benchmarks)

# دراسة معيارية (Benchmark) — 20+ تطبيق نقل وتوصيل

> دراسة تطبيق-تطبيق لأنماط التصميم والتجربة، مع **الدرس المطبّق على رفيق (طالب + كابتن)** لكل واحد.
> الهدف: ليس النسخ، بل اعتماد الأنماط المثبتة عالمياً ومحلياً في الترتيب، التناسق، البساطة، ووضوح التدفقات.
> المحتوى مُعاد صياغته وملخّص التزاماً بقيود ترخيص المصادر؛ الروابط للرجوع. آخر تحديث: يونيو 2026.

## كيف تُقرأ هذه الوثيقة
لكل تطبيق: **ما هو** · **أبرز أنماط التصميم/التجربة** · **🎯 الدرس لرفيق**.
في النهاية: جدول مقارنة + الدروس المُجمّعة مفصّلة بين تطبيق الطالب وتطبيق الكابتن.

---

# القسم الأول: 10 تطبيقات عالمية

## 1) Uber (راكب + سائق)
- **ما هو:** أكبر تطبيق تنقّل عالمي، بتطبيق راكب وتطبيق سائق منفصلين.
- **الأنماط:**
  - **خريطة تملأ الشاشة** كأول ما تراه + حقل وجهة واحد مهيمن؛ التطبيق **يقترح نقطة التقاء مناسبة** ويسمح بسحب الدبوس داخل دائرة محددة.
  - **هوية موحّدة "One Uber Identity"**: تسجيل دخول/حساب واحد يعمل عبر كل تطبيقات أوبر (راكب، سائق، Eats). ([Uber USL](https://www.uber.com/ca/en/blog/usl-ubers-unified-signup-and-login-stack/))
  - **Uber Lite**: نسخة خفيفة تدعم 50 لغة و30 طريقة دفع وتعمل على شبكات ضعيفة. ([Engineering Uber Lite](https://www.uber.com/ca/en/blog/engineering-uber-lite/))
  - تطبيق السائق: اضغط على الخريطة لرؤية المناطق المزدحمة + اتجاهات الطلب + Safety Toolkit. ([Driver app](https://www.uber.com/us/en/deliver/driver-app/))
- **🎯 الدرس لرفيق:** خريطة-أولاً للطرفين؛ و**حساب/هوية واحد** يخدم الطالب والكابتن بنفس الرقم (يحسم مشكلة «رقم واحد، دوران» معمارياً)؛ ودعم شبكات ضعيفة + RTL/عربي أولاً.

## 2) Lyft
- **ما هو:** منافس أوبر الأمريكي، سوق ثنائي (راكب/سائق).
- **الأنماط:** **تطبيق سائق منفصل (Lyft Driver)** لقبول الطلبات والملاحة turn-by-turn والدفع؛ هوية لونية دافئة (وردي/بنفسجي) مع فعل أساسي واحد. ([Lyft ride model](https://www.ad-hoc-news.de/news/ueberblick/lyft-ride-how-the-core-ride-hailing-product-anchors-the-platform/69539369))
- **🎯 الدرس لرفيق:** الإبقاء على **تطبيقين منفصلين بهوية موحّدة** (رفيق/كابتن رفيق) — وهو ما نتبعه أصلاً، لكن يجب توحيد الهوية البصرية بينهما بدل التضارب الحالي.

## 3) Bolt
- **ما هو:** شركة تنقّل أوروبية (ركوب + سكوتر + توصيل) عبر تطبيقات متعددة.
- **الأنماط:** بساطة لونية، تدفّق حجز قصير جداً، حجز بدون دفعة مقدمة (سلبية: ظاهرة الحجز الوهمي). ([Wikipedia: Bolt](https://en.wikipedia.org/wiki/Bolt_(company)))
- **🎯 الدرس لرفيق:** اجعل **تدفّق طلب الرحلة قصيراً جداً**؛ وانتبه لإلغاءات الطلب الوهمية (سياسة إلغاء/تأكيد للطالب والكابتن).

## 4) DiDi
- **ما هو:** أكبر تطبيق تنقّل في العالم (الصين + أمريكا اللاتينية)، ركوب + طعام.
- **الأنماط:** شعار «اطلب سيارة بـ **3 نقرات**» — بساطة التدفّق هي المنتج. ([DiDi Rider](https://apps.apple.com/us/app/didi-rider-affordable-rides/id1362398401))
- **🎯 الدرس لرفيق:** قِس نجاح رئيسية الطالب بعدد النقرات حتى تأكيد الرحلة/الاشتراك — استهدف ≤3.

## 5) inDrive (متوفّر بالأردن)
- **ما هو:** تطبيق ركوب بنموذج **تفاوض السعر (P2P)** في 1100+ مدينة.
- **الأنماط:**
  - **bid/post**: الراكب يقترح الأجرة، والسائقون القريبون يقبلون/يرفضون/يفاوضون. ([Grepix: bid/post](https://www.grepixit.com/blog/take-control-of-the-fare-the-indriver-bid-post-system-explained.html))
  - الدفع **مباشرة للسائق نقداً أو إلكترونياً**؛ واجهة محسّنة للشبكات الضعيفة. ([Wikipedia: InDrive](https://en.wikipedia.org/wiki/InDrive))
- **🎯 الدرس لرفيق:** دعم **الدفع النقدي** كخيار أول-درجة (ثقافة الكاش بالأردن)، وعدم افتراض أن كل دفع إلكتروني؛ وواجهة خفيفة على الشبكة.

## 6) Grab (سوبر آب)
- **ما هو:** سوبر آب جنوب شرق آسيا (ركوب، طعام، مالية).
- **الأنماط:** **Grab Feed** + توصيات محتوى مخصّصة؛ الخدمات الثانوية منظّمة دون إرباك، والأساسي بارز. ([Grab engineering](https://engineering.grab.com/grab-everyday-super-app))
- **🎯 الدرس لرفيق:** الخدمات الإضافية (طرود/مفقودات/تبادل) تُنظَّم في **صفحة «خدمات» واحدة** لا تُكدَّس على الرئيسية.

## 7) Gojek (راكب + سائق)
- **ما هو:** سوبر آب إندونيسي (20+ خدمة)، أعاد تصميم تطبيقه بالكامل.
- **الأنماط:**
  - أعادوا التصميم **لبناء رابط عاطفي** وإعطاء التطبيق «روحاً». ([Gojek redesign](https://medium.com/gojekengineering/design-with-love-the-creative-process-behind-go-jek-redesign-beb0ba081a33))
  - **«قتلوا الخريطة الحية»** بعد الحجز واستبدلوها بحركة وألوان دلالية (أخضر=في الوقت، أزرق=مطر) لتخفيف قلق الانتظار. ([Killed live map](https://medium.com/gojekengineering/why-we-killed-the-live-map-using-motion-to-cure-post-booking-anxiety-ea479b00884e))
  - تطبيق السائق نفسه «سوبر آب» متكامل. ([Gojek driver](https://blog.gojek.io/the-story-of-our-big-android-app-rewrite/))
- **🎯 الدرس لرفيق:** **حالة ما بعد الطلب** يجب أن تكون مطمئنة (timeline + ألوان دلالية + رسائل بشرية) لا مجرّد خريطة صامتة.

## 8) Talabat (توصيل — متوفّر بالأردن)
- **ما هو:** أكبر تطبيق توصيل طعام بالشرق الأوسط، UI سلس وشبكة تجار ضخمة. ([SDLC: Talabat](https://sdlccorp.com/post/steps-to-develop-a-meal-delivery-application-like-talabat/))
- **الأنماط:** **talabat pro** اشتراك شهري بسعر واضح = توصيل مجاني غير محدود من متاجر مؤهلة (نموذج اشتراك بقيمة محسوسة). ([talabat pro](https://www.talabat.com/uae/campaign/pro))
- **🎯 الدرس لرفيق:** اشتراك رفيق يجب أن يُقدَّم **بقيمة واضحة قابلة للقياس** (مثل: «X رحلة على مسارك خلال الشهر») لا مجرّد «خطة».

## 9) Deliveroo (توصيل)
- **ما هو:** توصيل طعام بريطاني، اشتهر بإعادة تصميم **متتبّع الطلب**.
- **الأنماط:** متتبّع الطلب يُبقي العميل مطّلعاً **خطوة-بخطوة مهما حدث**، ما خفّض الضغط على خدمة العملاء. ([Deliveroo order tracker](https://medium.com/deliveroo-design/our-order-tracker-designing-a-product-that-crosses-the-physical-and-digital-divide-7cc773d84245))
- **🎯 الدرس لرفيق:** **تتبّع رحلة الطالب على شكل timeline** واضح (بانتظار سائق → في الطريق → وصل → بالرحلة → وصلت الجامعة).

## 10) DoorDash (توصيل + اشتراك)
- **ما هو:** أكبر توصيل في أمريكا، أسّسه طلاب جامعة.
- **الأنماط:** **DashPass** اشتراك يطبّق مزاياه فقط على طلبات مؤهلة فوق حد أدنى — أي قواعد واضحة لمتى تنطبق القيمة. ([DashPass](https://help.doordash.com/en-au/consumers/article/what-is-dashpass))
- **🎯 الدرس لرفيق:** **قواعد الاشتراك صريحة**: على أي مسارات/جامعات/أوقات يسري، وكم رحلة، ومتى ينتهي.

---

# القسم الثاني: 10 تطبيقات أردنية / إقليمية

## 11) Jeeny — جيني (راكب + سائق) ⭐ مرجعك
- **ما هو:** تطبيق ركوب يعمل في الأردن والسعودية، بتطبيق سائق منفصل («جيني — اعمل واكسب»).
- **الأنماط:** يُسوّق نفسه بـ **«واجهة بسيطة جداً وتجربة سلسة»**؛ فئات رحلات واضحة (Economy في الأردن)؛ هوية موحّدة بين تطبيق الراكب والسائق. ([Jeeny App Store](https://apps.apple.com/jo/app/jeeny-%D8%AC%D9%8A%D9%86%D9%8A/id1178701124)، [Jeeny driver](https://apps.apple.com/de/app/jeeny-drive-and-earn-money/id1456609782))
- **🎯 الدرس لرفيق:** **البساطة والتناسق** قبل كثرة الميزات — هذا جوهر شكواك. خفّض الكثافة البصرية، ووحّد الهوية بين رفيق وكابتن رفيق.

## 12) Careem — كريم (سوبر آب، راكب + كابتن)
- **ما هو:** أول يونيكورن بالمنطقة، تطوّر من ركوب إلى سوبر آب (توصيل، مدفوعات، Careem Pay).
- **الأنماط:**
  - تصميم تطبيق **الكابتن** خضع لتحسينات أتمتة لتبسيط مهام السائق. ([Netguru: Careem Captain](https://www.netguru.com/clients/careem-captain-product-design))
  - تطبيق **المدفوعات** صُقل بناءً على ملاحظات المستخدمين فعلياً. ([Netguru: Careem payments](https://www.netguru.com/clients/careem-payment-app-design))
  - يستخدم مصطلح **«كابتن»** (وهو ما تتبعه). ([Careem super app](https://blog.careem.com/posts/designing-a-super-app-experience-for-50-million-users-a-case-study-by-koos))
- **🎯 الدرس لرفيق:** **بسّط مهام الكابتن** (online/offline، استقبال طلب، ملاحة، أرباح) وأزل الزحمة؛ وطوّر تدفّق الدفع **بناءً على ملاحظات مستخدمين حقيقيين**.

## 13) Uber Jordan (راكب + سائق)
- **ما هو:** أوبر يعمل في عمّان وكبرى المدن.
- **الأنماط:** نفس نمط أوبر العالمي (خريطة-أولاً، هوية موحّدة، أمان)، مع دعم عربي ودفع نقدي بالسوق الأردني.
- **🎯 الدرس لرفيق:** المعيار العالمي مُطبّق محلياً = **خريطة + عربي + كاش** هو الحد الأدنى المتوقَّع بالأردن.

## 14) inDrive Jordan (راكب + سائق)
- **ما هو:** inDrive منتشر بقوة بالأردن لأسعاره.
- **الأنماط:** التفاوض على السعر + الدفع المباشر للسائق — يلائم حساسية السعر لدى **الطلاب**.
- **🎯 الدرس لرفيق:** الطلاب حسّاسون للسعر؛ اجعل **الشفافية السعرية** و«التوفير عبر الاشتراك» رسالة بارزة.

## 15) Petra Ride — بترا رايد (راكب + سائق، أردني)
- **ما هو:** تطبيق نقل وتوصيل أردني يصف نفسه بأنه **«التطبيق الوحيد المرخّص بالمملكة»** بسائقين مرخّصين وأسطول كبير.
- **الأنماط:** يذكر **رحلات الجامعة** صراحة كحالة استخدام؛ يجمع تاكسي + خاص + توصيل. ([Petra Ride App Store](https://apps.apple.com/es/app/petra-ride/id1463809354))
- **🎯 الدرس لرفيق:** **الترخيص والأمان والثقة** ورقة رابحة محلياً — أبرز توثيق السائقين (الوثائق/المركبة) للطالب؛ ووضّح أنك خدمة طلابية مرخّصة.

## 16) TaxiF (أردني)
- **ما هو:** تطبيق تاكسي محلي يركّز على القدرة على تحمّل التكلفة وتلبية الحاجات المحلية. ([Grepix: Jordan apps](https://www.grepixit.com/blog/best-ride-hailing-and-taxi-apps-in-jordan.html))
- **🎯 الدرس لرفيق:** التركيز المحلي + السعر المعقول يكسبان حصة — موضِع رفيق كـ**الأرخص والأنسب للطالب على مساره الثابت**.

## 17) Tawseela / توصيلة (إدارة طلبات وتوصيل)
- **ما هو:** تطبيق إدارة طلبات وتوصيل للأعمال عبر لوحة واضحة وسريعة. ([Tawseela on Google Play](https://play.google.com/store/apps/details?id=com.twseela.app))
- **🎯 الدرس لرفيق:** **لوحة تشغيل واضحة وسريعة** للكابتن والأدمن (طلبات، مسارات، حالة) أهم من الزخرفة.

## 18) Careem Food / توصيل (إقليمي بالأردن)
- **ما هو:** ذراع التوصيل ضمن سوبر آب كريم.
- **الأنماط:** تتبّع طلب + محفظة موحّدة + خيارات دفع مرنة ضمن نفس الحساب.
- **🎯 الدرس لرفيق:** **محفظة واحدة موحّدة** تخدم كل الخدمات (رحلة، اشتراك، طرود) بدل مسارات دفع متفرّقة.

## 19) TolApp JO / طلاب الأردن (تطبيق طلابي أردني)
- **ما هو:** تطبيق لتنظيم الوصول لخدمات الجامعات الأردنية وتنظيم الشؤون الأكاديمية للطلاب. ([TolApp JO](https://tolapp-jo.en.uptodown.com/android/download))
- **🎯 الدرس لرفيق:** جمهورك **طلابي**؛ يمكن ربط الاشتراك بالجامعة/الكلية والمسار، وربما التحقق من صفة الطالب — وهذا تمايز عن تطبيقات الركوب العامة.

## 20) فوم / تطبيقات التاكسي العربية السريعة (إقليمي)
- **ما هو:** تطبيقات تاكسي عربية تركّز على «تاكسي بضغطة زر» وأمان وأسعار معقولة. ([فوم App Store](https://apps.apple.com/jo/app/id6477774061))
- **🎯 الدرس لرفيق:** **العربية أولاً + بساطة الزر الواحد + رسالة الأمان** هي المعيار في السوق العربي.

> **(+ مرجعان للتصميم):** Bus/Shuttle booking case studies (حجز مقعد بمسار + بطاقة صعود رقمية بدل ورق + الحجز حسب جدول المحاضرات) — مفيدة مباشرة لنموذج رفيق الطلابي. ([Transzip](https://bootcamp.uxdesign.cc/case-study-a-commute-app-for-booking-daily-office-rides-432d0f4c3540)، [RideMates](https://manalkhan.webflow.io/ridemates))

---

# جدول المقارنة السريع

| التطبيق | خريطة-أولاً | هوية/حساب موحّد | تطبيق سائق منفصل | اشتراك/باقة | دفع نقدي | الدرس الأبرز لرفيق |
|--------|:---:|:---:|:---:|:---:|:---:|------|
| Uber | ✅ | ✅ One Identity | ✅ | — | ✅ | حساب واحد متعدد الأدوار + خريطة |
| Lyft | ✅ | ✅ | ✅ | — | — | تطبيقان بهوية موحّدة |
| Bolt | ✅ | ✅ | ✅ | — | ✅ | تدفّق حجز قصير |
| DiDi | ✅ | ✅ | ✅ | — | ✅ | 3 نقرات للطلب |
| inDrive | ✅ | ✅ | ✅ | — | ✅ | كاش + شفافية سعر + شبكة خفيفة |
| Grab | ✅ | ✅ | ✅ | ✅ | ✅ | تنظيم الخدمات الثانوية |
| Gojek | جزئي | ✅ | ✅ | — | ✅ | طمأنة ما بعد الطلب |
| Talabat | — | ✅ | ✅ | ✅ Pro | ✅ | اشتراك بقيمة واضحة |
| Deliveroo | — | ✅ | ✅ | ✅ Plus | — | تتبّع timeline |
| DoorDash | — | ✅ | ✅ | ✅ DashPass | — | قواعد اشتراك صريحة |
| Jeeny ⭐ | ✅ | ✅ | ✅ | — | ✅ | البساطة والتناسق |
| Careem | ✅ | ✅ | ✅ كابتن | جزئي | ✅ | تبسيط الكابتن + محفظة موحّدة |
| Petra Ride | ✅ | ✅ | ✅ | — | ✅ | الترخيص/الثقة + رحلات جامعة |
| TaxiF | ✅ | ✅ | ✅ | — | ✅ | محلي + سعر معقول |
| Tawseela | جزئي | ✅ | ✅ | — | ✅ | لوحة تشغيل واضحة |

> الرموز تقديرية لأغراض المقارنة التصميمية فقط.

---

# الدروس المُجمّعة المطبّقة على رفيق

## أ) قواعد عابرة للتطبيقين
1. **خريطة-أولاً** عند الدخول (بعد الأذونات) — معيار شبه إجماعي (Uber/Bolt/DiDi/inDrive/Jeeny/Petra).
2. **عربي أولاً + لايت ديفولت + دعم RTL وشبكات ضعيفة** (Uber Lite/inDrive/السوق العربي).
3. **حساب/هوية واحد متعدد الأدوار** (Uber One Identity) → يحسم «رقم واحد، دوران» للطالب والكابتن.
4. **تطبيقان منفصلان بهوية بصرية موحّدة** (Lyft/Jeeny/Careem) → وحّد ألوان رفيق وكابتن رفيق.
5. **بساطة الزر الواحد**: فعل أساسي مهيمن لكل تطبيق (DiDi 3 نقرات / Jeeny).
6. **الدفع النقدي خيار أول-درجة** + محفظة موحّدة (inDrive/Careem).
7. **WCAG**: تباين 4.5:1 للنص العادي و3:1 للكبير؛ الدارك مود سياق مستقل لا مجرد عكس. ([UXPin](https://www.uxpin.com/studio/blog/color-schemes-for-apps/)، [Muzli dark mode](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/))

## ب) تطبيق الطالب — تطبيقات مباشرة
- رئيسية = **خريطة + «اطلب/احجز رحلتك»**؛ نقل الخدمات الثانوية لصفحة «خدمات» (Grab).
- **اشتراك بقيمة واضحة وقابلة للقياس** على مسار/جامعة + قواعد صريحة (Talabat Pro/DashPass) + خطوة دفع فعلية (نقد/محفظة/CliQ).
- **تتبّع الرحلة timeline** مطمئن بألوان دلالية ورسائل بشرية (Deliveroo/Gojek).
- **بطاقة صعود رقمية (QR)** بدل ورق + ربط بجدول المحاضرات/المسار (Transzip/RideMates).
- إبراز **الأمان والترخيص** (Petra Ride) وحساسية السعر للطالب (inDrive).

## ج) تطبيق الكابتن — تطبيقات مباشرة
- رئيسية = **خريطة + مفتاح Online/Offline** واضح + الطلب الحالي (Uber/Careem captain).
- **تبسيط جذري** للوحة وإزالة الزحمة اللونية (Careem captain/Jeeny) + احترام لايت/دارك (أُصلح).
- مهام السائق المباشرة: استقبال طلب → ملاحة → إتمام → أرباح؛ كل شيء آخر ثانوي.
- **لوحة تشغيل سريعة وواضحة** (Tawseela) + توثيق المركبة/الوثائق لبناء الثقة.

---

## المصادر
Uber (USL، Uber Lite، Driver app) · Lyft (ad-hoc-news) · Bolt (Wikipedia) · DiDi (App Store) · inDrive (Grepix، Wikipedia) · Grab (engineering.grab.com) · Gojek (Medium engineering/UX) · Talabat (talabat.com، SDLC) · Deliveroo (Medium design) · DoorDash (help.doordash.com) · Jeeny (App Store) · Careem (Netguru، blog.careem.com) · Petra Ride (App Store) · Jordan apps (Grepix، Appicial) · Tawseela (Google Play) · TolApp JO (Uptodown) · فوم (App Store) · أنظمة الألوان/الدارك مود (UXPin، Muzli) · حالات حجز الباصات (uxdesign.cc، webflow.io).

> *تم تلخيص وإعادة صياغة محتوى المصادر التزاماً بقيود الترخيص؛ الروابط أعلاه للرجوع والتحقق.*


---

# 5) التدقيق: الحالة والخطة (Audit — State & Plan)

# حالة المشروع + خطة العمل الصارمة (المرجع الوحيد)

> **هذا هو الملف المرجعي الوحيد** لحالة المشروع والخطة. التفاصيل التقنية القديمة في `AUDIT_2026-07.md` (ملحق). آخر تحديث أثناء التطوير.

---

## 0. الحقيقة الأهم: لماذا «كل خطوة يضرب معك خطأ»؟

**السبب الجذري لمعظم أخطائك ليس في الكود — بل أن قاعدة بياناتك المحلية متأخّرة عن مخطّط الكود.**
- `coupon_code has no column` → عمود ناقص (migration لم يُطبّق).
- `CHECK constraint failed: type` → قيود enum قديمة (migration لم يُطبّق).
- `ride-requests → Error` → عمود `direction` ناقص عندك + الكود لم يكن null-safe (أُصلح).

**أثبتُّ هذا بالتشغيل:** ضربتُ **كل مسارات الأدمن (24 مساراً)** على قاعدة بيانات محدّثة → **كلها تعمل بلا خطأ**. الأخطاء تظهر فقط على قاعدتك القديمة.

### ✅ الحل النهائي (نفّذه مرة واحدة على جهازك)
```bash
cd "…/Rafeeq-JO/backend"
git pull
php artisan migrate:fresh --seed
```
> **قاعدة إلزامية:** بعد كل `git pull` → `php artisan migrate`. عند أي خطأ عمود/CHECK → `php artisan migrate:fresh --seed`.

**تحصيناً من طرفي:** حوّلت أعمدة enum الحسّاسة إلى string، جعلت الموارد null-safe، وأضفت اختبارات probe + HTTP smoke تصطاد هذا النوع مبكّراً.

---

## 1. الحالة الصادقة لكل جزء

| الجزء | النسبة | الحكم |
|-------|--------|-------|
| **الباك إند (منطق + APIs + أمان)** | ~90% | قوي ومُختبر (158 اختبار). كل مسارات الأدمن تعمل. المتبقّي: تكاملات حيّة + ضبط إنتاج. |
| **الهوية البصرية (توكنز v6)** | ~85% | كحلي+ذهبي موحّد + أزرار دلالية + toast + loader + skeletons. |
| **إعادة بناء الشاشات (UX)** | ~35% | أُعيد بناء: محفظة، رئيسية الطالب، طلب الرحلة، الإشعارات، معالج وثائق الكابتن، أداء اللوحة. **الباقي ما زال بالتصميم القديم بألوان جديدة** — وهذا سبب إحساسك «هو هو». |
| **الداشبورد (UX/تخطيط)** | ~50% | skeletons + إصلاح الأيقونات تمّ، لكن **التخطيط والتنقّل يحتاجان إعادة تصميم** (غير مستجيب للشاشات، كثافة عالية، أيقونات نصّية). |

---

## 2. جرد الأخطاء والمشاكل (مُكتشفة بالتشغيل + المراجعة)

### مُصلَحة (التغطية والأجرة) ✅ RFQ-324
- **قبول موقع خارج نطاق الخدمة**: `ZoneService::nearest()` كان «يلصق» أي نقطة (حتى بالعقبة على بُعد 330كم) بأقرب منطقة إربد ويقدّر أجرة. أضفت `covering()` صارمة (polygon أو radius + هامش 1.5كم) وبوابة في إنشاء الطلب ترفض بـ`OUT_OF_COVERAGE` ورسالة عربية واضحة.
- **تقدير المسافة**: endpoint التقدير صار يقبل الإحداثيات + الجامعة ويعيد `distance_km` الفعلية (haversine) و`in_coverage` — يظهر للطالب بُعد الرحلة وهل النقطة مخدومة. (ملاحظة: الأجرة نفسها مسطّحة لكل منطقة لأنه تجميع منطقة‑جامعة داخل إربد، وهذا مقصود؛ المشكلة كانت فقط قبول مواقع خارج التغطية.)
- اختبار جديد يرفض نقطة العقبة. 159 اختبار أخضر.

### مُصلَحة (جولة الويب) ✅ RFQ-322/323
- **الخريطة على الويب**: كانت تعرض بطاقة إحداثيات + زر «افتح» (لأن WebView لا يعمل على الويب). الآن **خريطة OSM/Leaflet مضمّنة فعلياً داخل `<iframe>`** مع تحديث حيّ + النقر لاختيار الموقع عبر `postMessage`. + `map.invalidateSize()` لإصلاح الخريطة البيضاء/الفارغة.
- **رفع الوثائق 422 على الويب**: سببان — (1) `Content-Type: multipart/form-data` كان يُضبط يدوياً بدون `boundary` فيسقط الملف على المتصفح؛ أُزيل ليضبطه الناقل تلقائياً. (2) على الويب `asset.file` أحياناً مفقود → صار يُبنى `File` من الـURI باسم/نوع صحيحين. طُبّق نفس إصلاح الـboundary على رفع إيصال CliQ.

### مُصلَحة (جولة سابقة) ✅
- انهيار الاشتراك (CHECK: type) — RFQ-314.
- انهيار طلبات الرحلات (null-safe) — RFQ-318.
- الشكاوى «تحقيق» كانت تغيّر الحالة بصمت → صارت تفتح تفاصيل الشكوى كاملة — RFQ-318.
- الخريطة تظهر OSM المجانية لو فشل مفتاح Google — RFQ-315.
- حرف «ر» في شاشات الدخول → استُبدل بصورة اللوجو — RFQ-318.

### مشاكل تصميم/UX قائمة (خطة المرحلة F)
- **الداشبورد:** التخطيط ثابت غير مستجيب (sidebar 64 دائماً)؛ كثافة عالية؛ أيقونات Material Symbols نصّية (بديلها SVG)؛ الـsidebar بحاجة تنظيم بصري؛ الـLoader فيها أضعف من الكابتن.
- **الموبايل:** الشاشات غير المُعاد بناؤها (trips, checkout, subscriptions, payments, parcels, rewards, lost-found, exchange, support, chat, emergency, addresses, settings, onboarding) ما زالت بالنمط القديم.
- **الهوية:** اللوجو placeholder (r-logo) — يحتاج أيقونة + wordmark بنسخ فاتح/داكن (بعد تثبيت الاسم).
- **الـLoader غير معمّم** على كل الشاشات (فكرتك: خلفية خريطة غامقة + loader فوقها).

### تحصينات مستقبلية (باك إند)
- ✅ ~~تحويل باقي أعمدة enum الحسّاسة إلى string~~ — تمّ (كل الـ20 عموداً). RFQ-320.
- ضبط أمان الإنتاج (توكن httpOnly، إزالة كلمة مرور الأدمن الافتراضية، CORS/Reverb).
- تنظيم الدوكس: دمج ملفات schema المكررة (DATABASE_SCHEMA.md + .generated.md + database/schema.md) وخطط قديمة → مرجع واحد (مجدول في G).

---

## 3. إعادة التصميم الجذرية — لماذا تحسّها «نفس الشي»؟ + المواصفة الحقيقية

**صراحة:** ما تمّ حتى الآن = **توحيد الألوان + إعادة بناء 5 شاشات**. الـ**هيكلة والتنقّل والإحساس العام ما زالت مشابهة** — لذلك تحسّها «هو هو». الاتفاق كان على تغيير **جذري** لا يشبه القديم. إليك المواصفة الفعلية التي سأنفّذها (ليست ألواناً):

### أ) نظام تصميم موحّد (Design Language) — يُبنى أولاً
- **مكوّنات جديدة موحّدة:** رأس شاشة، بطاقات، قوائم، حقول، شيتات سفلية قابلة للسحب فعلاً، حالات فارغة/تحميل، توست، حوارات — بلغة بصرية واحدة (زوايا، ظلال، مسافات، حركة).
- **حركة (Motion):** انتقالات دخول، ضغط تفاعلي، loader معمّم (فكرة الخريطة الغامقة + loader فوقها).
- **أيقونات:** مجموعة واحدة (SVG بالداشبورد بدل Material Symbols النصّية).

### ب) الطالب — هيكلة معلومات جديدة
- **رئيسية «الخريطة هي التطبيق»:** خريطة كاملة + شيت سفلي متدرّج (peek/half/full) قابل للسحب، CTA «إلى أين؟» مهيمن، اختصارات ذكية.
- **تدفّق طلب موحّد بخطوات** (اتجاه → موقع على الخريطة → نوع → تأكيد وسعر) بدل نموذج طويل.
- **تبويب سفلي معاد تصميمه** بأيقونات وحالة نشطة واضحة.
- إعادة بناء بقية الشاشات (المحفظة/الرحلات/الاشتراكات/الخدمات) على المكوّنات الجديدة.

### ج) الكابتن — «أداة عمل» مركّزة
- شاشة قيادة (Driver HUD): خريطة + حالة اتصال بارزة (ذهبي) + عروض واردة كبطاقات فعل سريعة + أرباح اليوم أعلى.
- تدفّق الرحلة (قبول → في الطريق → OTP صعود → OTP إنزال) كخطوات بصرية واضحة.

### د) الداشبورد — لوحة قيادة عصرية
- **تخطيط مستجيب** (sidebar قابل للطي + تجاوب للشاشات).
- sidebar منظّم بمجموعات + أيقونات SVG + حالة نشطة أنيقة.
- صفحات البيانات: جداول حديثة + فلاتر + skeletons + فراغات، وبطاقات KPI متّسقة.

> **الفرق الجوهري:** بعد المرحلة F، الشاشة تُفتح فتبدو **تطبيقاً مختلفاً كلياً** (تخطيط + تنقّل + حركة + مكوّنات)، لا مجرّد ألوان.

---

## 4. الخطة الصارمة (مراحل + معايير قبول)

### المرحلة E — تثبيت (صفر أخطاء تشغيل) — **✅ مُغلقة**
- ✅ probe لكل مسارات الأدمن + HTTP smoke لتدفّق الرحلة والاشتراك والشحن.
- ✅ **تحويل كل أعمدة enum الحسّاسة (20 عموداً) إلى string** — منع نهائي لأخطاء `CHECK constraint failed`. (RFQ-320)
- ✅ حذف migrations الترقيع الزائدة على `wallet_transactions` (add_subscription_payment + drop_type_check) بعد أن أصبح العمود string من الأساس.
- ✅ إصلاح الخريطة: `react-native-webview` كان **مفقوداً كلياً من تطبيق الكابتن** → أُضيف؛ + خصائص WebView متينة (javaScriptEnabled/domStorageEnabled/startInLoadingState/مؤشر تحميل) للتطبيقين. (RFQ-321)
- ✅ `migrate:fresh --seed` نظيف + **158 اختبار أخضر** بعد كل التغييرات.
- **القبول:** ✅ لا 500؛ الاختبارات خضراء؛ الخريطة تعمل بالتطبيقين بعد `npm install`.

### المرحلة F — إعادة التصميم الجذرية (شاشة‑بشاشة)
- F1: نظام التصميم/المكوّنات الجديدة + الحركة + الـloader المعمّم.
- F2: إعادة بناء كل شاشات الطالب.
- F3: إعادة بناء كل شاشات الكابتن.
- F4: إعادة تصميم تخطيط + صفحات الداشبورد + أيقونات SVG.
- **القبول:** كل شاشة على المكوّنات الجديدة، مُختبرة لايت+دارك وعربي+إنجليزي، وتبدو جديدة كلياً.

### المرحلة G — الهوية والإطلاق
- تثبيت الاسم قانونياً + أيقونة/wordmark نهائية عبر التطبيقات.
- مفتاح Google Maps، بناء APK، تقوية أمان الإنتاج، تجريبي بجامعة.

### الترتيب الملزم: **E → F1 → F2 → F3 → F4 → G**. لا ننتقل لمرحلة قبل إغلاق معايير قبول سابقتها.

---

## 5. طريقة العمل (لإيقاف «العشوائية»)
- كل خطوة = commit مرقّم `[RFQ-###]` + تحقّق (tsc/tests) + دفع مباشر على `foundation/phase-0-1`.
- كل رد = **ما أنجزته بالتفصيل + ما تبقّى للمرحلة الجاية**.
- التوثيق: هذا الملف هو المرجع؛ لا ننشئ ملفات جديدة إلا للضرورة.


---

# 6) التدقيق الشامل يوليو 2026 (Audit 2026-07)

# تقرير التدقيق الشامل لمنصّة رفيق — يوليو 2026

> **الحالة:** تدقيق ثابت (static) لكامل المستودع — الباك إند + التطبيقات الثلاثة + التوثيق.
> **الطريقة:** قراءة الكود سطراً بسطر + تحليل التوثيق + مراجعة معمارية. لم تُشغَّل التطبيقات على أجهزة.
> **المدقّق:** جلسة تدقيق شاملة (Kiro). **المرجع للخطة:** `docs/audit/MASTER_REMEDIATION_PLAN.md`.

---

## 0. الخلاصة التنفيذية (الصورة الصادقة)

| البُعد | التقييم | ملخّص |
|--------|---------|--------|
| **الباك إند (منطق + APIs)** | 🟢 قوي | معماري نظيف (Modular Monolith، 32 وحدة)، محفظة ذرّية آمنة، لا حقن SQL، RBAC + throttling. **لكن** فيه 3 مشاكل تزامن/تكامل حرجة يجب حلّها قبل التعامل بأموال حقيقية. |
| **قابلية التوسّع (Scalability)** | 🟡 متوسط | البنية قابلة للتوسّع، لكن عمليات ثقيلة (GPT/Vision، الإشعارات، محرّك التجميع) تعمل **متزامنة داخل الطلب** رغم توفّر Redis queue → عنق زجاجة تحت الضغط. |
| **الأمان** | 🟡 جيد مع ملاحظات | الأساسات ممتازة. المتبقّي: توكن الأدمن في localStorage، أسرار الإنتاج، كلمة مرور أدمن افتراضية، CORS/Reverb مفتوحة افتراضياً. |
| **التصميم والهوية البصرية** | 🔴 **المشكلة الكبرى** | **6+ تحوّلات هوية** تركت بقايا من كل حقبة تتعايش معاً → تناقض ألوان بين التطبيقات الثلاثة، ألوان قديمة مكتوبة يدوياً (hardcoded)، وتناقض بين التوثيق والكود. |
| **لوحة الإدارة (أداء/UX)** | 🔴 يحتاج عملاً | لا حالات تحميل (skeleton)، أيقونات نصّية تُومض، صورة خلفية 5MB، لا كاش بيانات → «تخبيصات» وبطء (شكوى المستخدم مؤكّدة تقنياً). |
| **القانوني (تشابه inDrive)** | 🟡 قابل للمعالجة | نموذج العمل **مختلف فعلياً** عن inDrive (تجميع مناطقي + اشتراكات، لا مزاد أسعار). الخطر الحقيقي **بصري** (اللون الليموني + الطابع الأدنى) + إشارات «inDrive» صريحة في الكود/التوثيق. |
| **التوثيق** | 🟡 غني لكن مبعثر | تفصيلي وصادق، لكنه متضخّم ومتناقض (نسخ تصميم متعدّدة، ملفات مكرّرة، steering قديم يضلّل الجلسات). |

**الحكم العام:** الجوهر (الباك إند والمنطق) **حقيقي ومُختبَر وليس ديمو**. الفجوة للإطلاق العالمي ليست في «هل يعمل»، بل في: **(1)** توحيد الهوية البصرية وإزالة بقايا التصميم القديم، **(2)** إصلاح 3 مشاكل تزامن بالباك إند، **(3)** تحويل العمليات الثقيلة للطوابير، **(4)** تلميع أداء لوحة الإدارة، **(5)** المعالجة القانونية البصرية، **(6)** التشغيل الفعلي (خوادم/مفاتيح/متاجر).

---

## 1. البنية التقنية (كما هي فعلياً في الكود)

```
frontend/ (npm workspaces)
├── student-app/     Expo (RN 0.74.5 + expo-router 3.5) — تطبيق الطالب
├── driver-app/      Expo (RN 0.74.5 + expo-router 3.5) — تطبيق الكابتن
├── admin-dashboard/ Next.js 14.2.35 (App Router) + Tailwind — لوحة الإدارة
└── packages/
    ├── shared/      نظام التصميم (theme) + i18n (ar/en) + types + validators
    └── api-client/  عميل REST مُنمّط (axios) — @rafeeq/api-client

backend/  Laravel 11/12 (PHP 8.4) — Modular Monolith
├── Core/           (Http, Exceptions, Permissions/RBAC, Audit, Repositories, Support)
├── Infrastructure/ (Gpt, Sms, Push, Maps) — كلها مع fallback آمن
├── Shared/         (Enums, HasUuid, Phone)
└── Modules/        32 وحدة (Auth, Wallet, RideRequests, Matching, Trips, Payments, ...)
```

- **الحالة/التخزين (موبايل):** Zustand + AsyncStorage + expo-secure-store.
- **الوقت الحقيقي:** Laravel Reverb (مُعرّف) لكن الافتراضي حالياً **polling** كل 12ث (تدهور آمن).
- **قاعدة البيانات:** PostgreSQL 16 (+PostGIS مخطّط)، مفاتيح UUID، المبالغ بالفلس (integer).

---

## 2. التصميم والهوية البصرية 🔴 (الأولوية القصوى)

> شكوى المستخدم: «مشاكل تصميم كثيرة وغريبة، لون غامق على خلفيات سوداء، غير عصري، الخط غير مرتّب، عجقة بالهوية البصرية، ومشاكل عند التبديل دارك↔لايت». **التدقيق يؤكّد الشكوى ويحدّد السبب الجذري.**

### 2.1 السبب الجذري: تراكم 6+ هويّات بصرية
تتبّع `docs/PROGRESS.md` يكشف أن الهوية تغيّرت أكثر من ست مرات:

`أزرق بنكي (v1) → أخضر أردني + ذهبي (v2) → Stitch كحلي + سماوي → كحلي + ذهبي (طالب) → إندِيغو + سماوي (v4) → أسود + ليموني «inDrive» (v5)`

**كل تحوّل ترك بقايا في الكود لم تُنظَّف.** لذلك تتعايش اليوم ألوان من حقب مختلفة في وقت واحد — وهذا بالضبط مصدر «العجقة» و«اللون الغامق على الأسود».

### 2.2 تناقض الهوية بين التطبيقات الثلاثة (الأخطر بصرياً)
| التطبيق | المصدر | اللون الأساسي | لون التأكيد | النتيجة |
|---------|--------|----------------|--------------|---------|
| الطالب + الكابتن | `packages/shared/src/theme/scheme.ts` | أسود/أبيض (إنك) | **ليموني `#C1F11D`** (v5) | هوية حديثة موحّدة |
| لوحة الإدارة | `admin-dashboard/tailwind.config.ts` | **إندِيغو `#4F46E5`** (v4) | **سماوي `#22D3EE`** | **هوية مختلفة تماماً!** |

→ **التطبيقات الثلاثة لا تشترك بنفس اللون البراندي.** الموبايل ليموني، اللوحة إندِيغو/سماوي. حتى شريط التمرير في اللوحة يستخدم إندِيغو `rgba(79,70,229)`.

### 2.3 نسخ تصميم متناقضة في التوثيق (تضلّل أي مطوّر)
- `docs/DESIGN.md` → «v2» أخضر أردني `#0B7A43`.
- `docs/DESIGN_SYSTEM.md` → «v4» إندِيغو `#4F46E5`.
- الكود الفعلي `scheme.ts` → «v5» أسود + ليموني.
- `.kiro/steering/00-project-context.md` (**inclusion: always**) → أزرق `#2563EB` + ذهبي `#D4A017` + «قريب من التطبيقات البنكية» + خط «Tajawal».

→ لا أحد يعرف ما هي الهوية الرسمية. الـ steering القديم **يُحمَّل في كل جلسة** فيدفع أي عمل جديد للرجوع للهوية القديمة.

### 2.4 ألوان قديمة مكتوبة يدوياً (hardcoded) لا تتبع الثيم
هذه هي مصادر «لون غامق على خلفية سوداء» و«لا يتغيّر مع الدارك/لايت»:

| الملف | السطر | المشكلة |
|-------|-------|---------|
| `student-app/src/components/ErrorBoundary.tsx` | 53-59 | كحلي `#0B192C` + ذهبي `#FFBF00` (هوية قديمة، ثابت) |
| `driver-app/src/components/ErrorBoundary.tsx` | 50-56 | كحلي `#06121F` + سماوي `#00E5FF` (هوية قديمة، ثابت) |
| `*/app/(auth)/welcome.tsx` | 44-55 | خلفية `#0E0F12` غامقة **حتى في اللايت مود** |
| `student-app/src/components/AuthShell.tsx` | 52-61 | خلفية `#0E0F12` غامقة ثابتة |
| `student-app/src/lib/push.ts` | 53 | `lightColor: '#0B7A43'` (أخضر قديم) |
| `driver-app/src/lib/push.ts` | 50 | `lightColor: '#00E5FF'` (سماوي قديم) |
| `*/src/components/MapBackdrop.tsx` | 22 | `routeColor = '#E6B23E'` (ذهبي قديم) |
| `*/src/components/BrandSplash.tsx` | 85 | أبيض ثابت |
| `*/app/(app)/notifications.tsx` | 134,187 | أبيض ثابت على خلفية قد لا تضمن التباين |

> **بحث آلي:** ~20 ملفاً موبايل فيها ألوان hex مكتوبة يدوياً (خارج ملفات الثيم). ملفات `invoice.ts` و`LiveMap.tsx` تستثنى (HTML للطباعة/الخرائط — مقبول جزئياً).

### 2.5 تعليقات ومتغيّرات قديمة (drift)
- `driver-app/src/components/kit.tsx:5` يقول «captain navy+cyan brand» بينما الفعلي ليموني.
- `driver-app/src/theme.ts` يقول «gold accent» بينما الفعلي ليموني.
- `shared/src/theme/typography.ts` يقول الخط «Tajawal» بينما الفعلي **Cairo**.
- `admin-dashboard` متغيّر CSS اسمه `--font-tajawal` لكنه يحمّل **Cairo**؛ وخط العرض `--font-lexend` يحمّل فعلياً **Plus_Jakarta_Sans**. أسماء لا تطابق القيم.

### 2.6 الطباعة (الخط)
- الموبايل: **Cairo** (400–800) عبر `@expo-google-fonts/cairo` — جيد وموحّد.
- اللوحة: `Cairo` للنص + `Plus_Jakarta_Sans` للعناوين + `JetBrains_Mono` للأرقام — **ثلاثة خطوط** بأسماء متغيّرات مضلّلة.
- **لا يوجد نظام مقاسات/أوزان موحّد مطبّق بصرامة** عبر التطبيقات → «الخط غير مرتّب» كما وصف المستخدم.

### 2.7 الدارك/لايت والعربي (الديفولت) — نقطة إيجابية
- ✅ الديفولت **عربي + لايت** مضبوط صحيحاً في التطبيقات الثلاثة (`prefs.ts` للموبايل، `prefs.tsx` للوحة).
- ⚠️ **خطر RTL:** في الموبايل `I18nManager.forceRTL` يتطلّب إعادة تشغيل التطبيق؛ أول فتح قد يظهر LTR للحظة. يجب فرض RTL مبكّراً + مطالبة بإعادة التشغيل عند تبديل اللغة.
- ⚠️ الشاشات ذات الخلفية الغامقة الثابتة (2.4) **لا تحترم** تبديل الثيم إطلاقاً.

---

## 3. لوحة الإدارة — الأداء وتجربة الاستخدام 🔴

> شكوى المستخدم: «أدخل الصفحة ما ببيّن إنها بتحمّل، فجأة تطلع الصفحة، بدها ريلود، واللوج-إن بدو شغل». **مؤكّد تقنياً — الأسباب:**

### 3.1 لا حالات تحميل على مستوى التنقّل
- **لا يوجد أي ملف `loading.tsx`** في `app/` (App Router). لذلك عند الانتقال بين الصفحات لا يظهر أي مؤشّر تحميل فوري.
- كل صفحة `'use client'` تجلب بياناتها في `useEffect` → الصفحة تُرسم فارغة ثم «تقفز» البيانات فجأة = بالضبط «بتطلع الصفحة بوجهي».
- لا توجد مكوّنات **Skeleton** في اللوحة (بينما الموبايل عنده `ListSkeleton` — لم يُنقل للّوحة).

### 3.2 الأيقونات نصّية تُومض (Material Symbols)
- `globals.css:1` يستورد خط Material Symbols عبر `@import url(...)` من Google Fonts — **استيراد حاجب للعرض (render-blocking)**.
- الأيقونات تُكتب كـ **ligatures نصّية** (`dashboard`، `directions_car`...). قبل تحميل الخط يرى المستخدم **الكلمات الخام** ثم تتحوّل لأيقونات = «التخبيصات» و«الوميض».

### 3.3 صورة خلفية 5 ميغابايت على شاشة الدخول
- `public/amman-map.jpg` حجمها **5.0MB**، تُحمَّل كخلفية `background-image` في `login/page.tsx` → بطء وامض على أول شاشة يراها الموظّف.

### 3.4 لا كاش للبيانات + كل شيء client-render
- لا يوجد SWR / React Query → كل تنقّل يعيد الجلب من الصفر (لا cache، لا revalidate).
- كل الصفحات `'use client'` → لا استفادة من RSC/SSR في نكست، والحمل كله على المتصفّح.

### 3.5 اللوج-إن
- التدفّق سليم منطقياً (`auth.tsx` + MFA)، لكن:
  - التوكن في `localStorage` (خطر XSS — انظر §4).
  - شاشة الدخول على هوية **v4 (إندِيغو/سماوي)** مع الصورة الثقيلة.
  - لا يوجد redirect للمستخدم المُصادَق أصلاً إذا فتح `/login` (تحسين بسيط).

---

## 4. الأمان 🟡

### 4.1 نقاط قوّة مؤكّدة
- **المحفظة ذرّية:** `WalletService` (hold/capture/release/apply) تستخدم `DB::transaction` + `lockForUpdate` مع إعادة فحص تحت القفل. المبالغ بالفلس (integer). السحوبات لا تصبح سالبة.
- **لا حقن SQL:** كل الاستعلامات الخام مُعاملة (parameterized).
- **RBAC** مطبّق على كل مسارات الإدارة + throttling ثلاثي (`auth` 6/د، `api` 120/د، `sensitive` 20/د).
- رؤوس أمنية صارمة (`SecurityHeaders`) + HSTS عند HTTPS.
- تشفير الحقول الحساسة (الهوية الوطنية)، إخفاء أكواد OTP، تحقق رفع الملفات (نوع + حجم + disk خاص).

### 4.2 مخاطر يجب معالجتها قبل الإطلاق
| # | الخطر | الخطورة | المعالجة |
|---|-------|---------|----------|
| 1 | توكن الأدمن في `localStorage` (XSS) | عالٍ | كوكي httpOnly (Sanctum SPA) قبل التعامل بأموال |
| 2 | كلمة مرور أدمن **افتراضية** في الـ seeder | عالٍ | إجبار تغييرها + منعها في الإنتاج |
| 3 | أسرار (OpenAI/CliQ/FCM/WhatsApp) تُدار عبر `.env` | عالٍ (تشغيلي) | Secrets Manager بالإنتاج |
| 4 | CORS + Reverb افتراضيات مفتوحة | متوسط | تقييد الأصول (origins) بالإنتاج |
| 5 | `apiUrl` الافتراضي `http://localhost` | متوسط | فرض HTTPS بالإنتاج |
| 6 | 3 تنبيهات `laravel/framework` (أخطرها CRLF injection) | متوسط | ترقية الإطار (مذكور: تمّت ترقية Laravel 12 — يُعاد التحقّق بـ `composer audit`) |
| 7 | ~40 تنبيه `npm audit` (غالبيتها transitive/dev في Expo/Next) | منخفض-متوسط | ترقية Expo SDK/Next لأحدث ثابت |

---

## 5. الباك إند — التزامن والتكامل وقابلية التوسّع 🟡

### 5.1 مشاكل تزامن/تكامل حرجة (يجب حلّها قبل أموال حقيقية)
| # | المكان | الخطورة | الوصف | الإصلاح |
|---|--------|---------|--------|---------|
| 1 | `DriverTripController::acceptOffer` (~L63-84) | **حرج** | «افحص ثم نفّذ» بلا قفل → **كابتنان يقبلان نفس الرحلة** المُجمّعة | `lockForUpdate` + تحديث ذرّي مشروط بالحالة |
| 2 | `PaymentService::approve` (~L256-265) | عالٍ | حارس الـ idempotency خارج القفل → اعتماد متزامن (أدمن/AI) يشحن المحفظة/يفعّل الاشتراك **مرّتين** | نقل الفحص داخل `lockForUpdate` |
| 3 | `RideRequestService::create` مقابل إنهاء الرحلة | عالٍ (وظيفي) | الطلب لا يخرج من حالة `Assigned` عند إتمام/إلغاء الرحلة، بينما الإنشاء يمنع التكرار في Pending/Grouped/Assigned → **الطالب يُحظر دائماً** من طلب جديد لنفس الجامعة | تحديث حالة الطلب عند نهاية الرحلة (نهائي) |
| 4 | تحقّق CliQ (image_hash/bank_reference) | عالٍ | إزالة التكرار racy بفهارس غير فريدة → احتمال شحن مزدوج | فهرس فريد + فحص تحت قفل |
| 5 | `adminCredit` (شحن) | متوسط | لا idempotency (المرجع غير فريد) | مرجع فريد + فحص |
| 6 | `cancelBooking` (طالب) | متوسط | لا يُحرّر حجز المحفظة (hold) | استدعاء release عند الإلغاء |

### 5.2 قابلية التوسّع (Scalability)
- ⚠️ **عمليات ثقيلة متزامنة داخل الطلب** رغم توفّر Redis queue: تحقّق GPT-Vision (timeout 60ث)، إرسال Push/SMS، ومحرّك التجميع (Matching). تحت الضغط تحبس عمّال الويب.
  → **الحل:** دفعها كلها إلى Jobs (`ShouldQueue`). (لاحظ: بثّ الإشعارات الجماعية أصبح queued فعلاً — RFQ-258؛ يُعمَّم النمط على الباقي.)
- ⚠️ **N+1** في `TripService::end()` و`cancel()` (تحميل علاقات داخل حلقة).
- ⚠️ كتابة `trip_tracking` غير محدودة (تتضخّم) → سياسة تقليم/تجميع بعد انتهاء الرحلة.

### 5.3 التكامل بين التطبيقات الثلاثة (طالب ↔ كابتن ↔ أدمن)
- ✅ **حلقة الرحلة موجودة ومترابطة:** `RideRequests` → `Matching` (عروض للكابتن) → `Trips` (Trip OTP صعود + OTP إنزال) → `Ratings` → `Wallet/Payments` (حجز → التقاط → عمولة → أرباح الكابتن).
- ✅ حساب موحّد متعدد الأدوار (نفس الرقم طالب+كابتن) عبر `become-driver` (RFQ-266).
- ✅ محادثة طالب↔كابتن مرتبطة بالرحلة + إشعارات + بثّ.
- ⚠️ الفجوة الوحيدة: إغلاق حالة `ride_request` (§5.1 #3) — تكسر إعادة الطلب.

### 5.4 الصلابة (Resilience) — نقطة قوّة
- كل التكاملات الخارجية لها **بديل آمن** (`NullGptClient`، `LogSmsGateway`، `LogPushGateway`، haversine بدل Google) لا يرمي استثناءً ولا يكسر المعاملة. أداة `Safely` تغلّف الآثار الجانبية.

### 5.5 الاختبارات
- ~135 اختبار Feature/Unit، تغطية واسعة للتدفّقات. **الفجوات:** لا اختبارات تزامن/سباق، لا اختبار لإغلاق `ride_request`، لا اختبار لمسار فشل GPT.

---

## 6. القانوني والملكية الفكرية (تشابه inDrive) 🟡

> قلق المستخدم: «التطبيق شبه مستنسخ من inDrive — بدنا حل للمسألة القانونية».

### 6.1 التحليل الصادق
- **نموذج العمل مختلف فعلياً:** رفيق = **تجميع مناطقي (zone pooling) + اشتراكات + Express** بتسعير خوارزمي (`PricingService`: surge/min-fill/عمولة). inDrive = **مزاد أسعار** (الراكب يقترح السعر والسائقون يساومون). **هذه أكبر ميزة مميّزة لـ inDrive وهي غير موجودة في رفيق** → هذا **دفاع قوي**.
- **الخطر الحقيقي = الطابع البصري (Trade Dress):** اللون **الليموني `#C1F11D`** هو توقيع inDrive البصري، مع طابع «أسود + أدنى (minimal)». إضافةً لذلك، **إشارات صريحة لـ «inDrive»** في:
  - `packages/shared/src/theme/scheme.ts` (تعليقات: "inDrive-inspired", "signature lime", "Same simple, confident idea as inDrive").
  - `docs/PROGRESS.md` (عبارات «توقيع inDrive»، «مظهر inDrive القوي»).

### 6.2 التوصيات (تقلّل الخطر عملياً)
1. **تغيير لون التأكيد** من الليموني المطابق لـ inDrive إلى **لون براندي أصلي** لرفيق (مثلاً أخضر أردني أو تركوازي مميّز) — يحافظ على الحداثة دون تطابق بصري.
2. **إزالة كل إشارات «inDrive»** من الكود والتوثيق (تعليقات/عبارات) — لا تترك دليلاً مكتوباً على «النسخ».
3. **إبراز التمايز الوظيفي** في التسويق/التوثيق: التجميع الطلابي + الاشتراكات + الخدمات (طرود/مفقودات/تبادل) — هذه هوية رفيق الأصلية.
4. تصميم **لوجو وأيقونة ومخطّطات شاشات أصلية** (تجنّب تطابق التخطيط 1:1 مع أي تطبيق).
5. استكمال المسودّات القانونية (`docs/legal/`) + مراجعة محامٍ أردني + تراخيص هيئة تنظيم النقل قبل الإطلاق.

> **ملاحظة:** هذه ليست استشارة قانونية — يلزم محامٍ مختصّ. لكن تقنياً، التمايز الوظيفي + تغيير الطابع البصري + إزالة الإشارات يقلّل الخطر جوهرياً.

---

## 7. التوثيق 🟡

### 7.1 المشاكل
- **تضخّم وتكرار:** ~20 ملف بالجذر + مجلدات فرعية، مع ازدواج: `DESIGN.md` ↔ `DESIGN_SYSTEM.md`، `DATABASE_SCHEMA.md` ↔ `.generated` ↔ `database/schema.md`، `ARCHITECTURE.md` ↔ `architecture/*`، `SECURITY.md` ↔ `security/*`، `ROADMAP.md` ↔ `business/roadmap.md`.
- **تناقض التصميم** (§2.3) — أخطر مشكلة توثيقية.
- **steering قديم** يُحمَّل دائماً ويضلّل (§2.3).
- `REVAMP_PLAN.md` و`EXECUTION_PLAN.md` يصفان «v3 كحلي+سماوي» — تجاوزهما الواقع (v5).

### 7.2 المعالجة (منفّذة جزئياً في هذه الجلسة — انظر سجل التغييرات أسفل)
- إنشاء `docs/audit/` كمصدر واحد للتدقيق والخطة.
- توضيح المصدر المعتمد (Canonical) للتصميم = الكود، مع تحديث الملفات المتناقضة.
- تحديث steering ليعكس الهوية الحالية بدل القديمة.

---

## 8. جرد المشاكل حسب الأولوية (P0 حاجز إطلاق · P1 مهم · P2 تحسين)

| # | المشكلة | المجال | الأولوية |
|---|---------|--------|----------|
| 1 | توحيد الهوية البصرية عبر التطبيقات الثلاثة + إزالة بقايا الألوان القديمة | تصميم | **P0** |
| 2 | تغيير اللون الليموني (inDrive) + إزالة إشارات inDrive | تصميم/قانوني | **P0** |
| 3 | إصلاح سباق قبول العرض (كابتنان لنفس الرحلة) | باك إند | **P0** |
| 4 | إصلاح idempotency اعتماد الدفع (شحن مزدوج) | باك إند/مال | **P0** |
| 5 | إصلاح إغلاق حالة ride_request (حظر الطالب) | باك إند/وظيفي | **P0** |
| 6 | حالات تحميل (skeleton + loading.tsx) للّوحة | لوحة | **P0** |
| 7 | إصلاح أيقونات Material Symbols الوامضة + ضغط صورة الدخول | لوحة/أداء | **P0** |
| 8 | تحويل GPT/إشعارات/تجميع إلى Jobs (queues) | باك إند/توسّع | **P1** |
| 9 | توكن الأدمن → كوكي httpOnly + إزالة كلمة مرور افتراضية | أمان | **P1** |
| 10 | ألوان hardcoded في ErrorBoundary/AuthShell/welcome → ثيم | تصميم | **P1** |
| 11 | فرض RTL مبكّراً + إعادة تشغيل عند تبديل اللغة | تصميم/موبايل | **P1** |
| 12 | كاش بيانات اللوحة (SWR) + N+1 بالباك إند + تقليم trip_tracking | أداء/توسّع | **P1** |
| 13 | تنظيف التوثيق + توحيد الخطوط + أسماء المتغيّرات | توثيق/تصميم | **P2** |
| 14 | اختبارات تزامن + مسارات الفشل | جودة | **P2** |
| 15 | التشغيل الفعلي (خوادم/مفاتيح/متاجر/تراخيص) | تشغيل | **P0 (بالتوازي)** |

**التفاصيل الكاملة للخطة والمراحل في:** `docs/audit/MASTER_REMEDIATION_PLAN.md`.



---

## 9. تدقيق أعمق للشاشات (جولة ثانية — بناءً على ملاحظات المالك)

### 9.1 الخريطة — الخبر الجيد + الفجوة
- ✅ `LiveMap.tsx` **يستخدم Google Maps الرسمي** (JavaScript API) داخل التطبيق عبر WebView **عندما يتوفّر مفتاح** (`buildGoogleHtml`)، مع بديل OpenStreetMap/Leaflet (`buildLeafletHtml`) عند غياب المفتاح، وبطاقة إحداثيات على الويب.
- ⚠️ المفتاح يأتي من الباك إند `GET /v1/config` (env `GOOGLE_MAPS_KEY`) أو `app.json extra.mapsKey` — **حالياً فارغ** → لذلك تُعرض خريطة OSM لا Google. **الحل تشغيلي: ضبط مفتاح Google Maps.**
- ⚠️ استخدام **WebView** للخريطة أثقل وأقل سلاسة من خريطة أصلية. توصية: التحوّل إلى `react-native-maps` مع مزوّد Google للحصول على تجربة أصلية ناعمة (تكبير/تدوير/أداء).

### 9.2 الشاشة الرئيسية (طالب + كابتن) — «مش فرندلي»
- الطالب `home.tsx`: نمط inDrive (خريطة كاملة + شيت سفلي + «إلى أين؟»). المفهوم حديث، لكن:
  - الشيت السفلي **ثابت (View)** وليس Bottom Sheet قابل للسحب (الـgrabber شكلي فقط) → يبدو جامداً.
  - ازدحام: بحث + عناوين محفوظة + خدمات أفقية + شريط محفظة/اشتراك مكدّسة → كثافة عالية.
- الكابتن `dashboard.tsx`: عند حالة «قيد المراجعة» تكون الشاشة شبه فارغة (شارة حالة + وثائق/مركبة + زر إرسال) بلا توجيه واضح.

### 9.3 رفع الوثائق والمركبة — «عجقة ومستخدم تايه» (مؤكّد)
- لا يوجد **معالج خطوات (Wizard)**: الكابتن يجب أن يزور تبويب `documents` ثم `vehicle` ثم يرجع لـ`dashboard` ليجد زر «إرسال للمراجعة». لا مؤشّر تقدّم («خطوة 2 من 4»)، لا قائمة تحقّق «ما الذي ينقصك للانطلاق».
- `documents.tsx` يستخدم **DocumentPicker عام** (ملف/PDF) **وليس التقاط كاميرا أولاً** ولا **معاينة/قصّ للصورة** بعد الرفع → المستخدم لا يرى ماذا رفع.
- بعد الرفع لا يوجد **توست/إرشاد** «تمام، الآن أضف مركبتك» → المستخدم لا يعرف الخطوة التالية (بالضبط شكوى المالك).

### 9.4 نظام الرسائل/الفاليديشن/التوست — مجزّأ (مؤكّد)
- **لا يوجد نظام Toast/Snackbar عام.** كل شاشة تدير `error`/`success` محلياً وترسم `<Banner>` **سطري (inline)** → أماكن وأنماط غير موحّدة.
- **لا حوارات تأكيد موحّدة** (لا استخدام لـ`Alert.alert`) → أفعال حسّاسة قد تُنفّذ بلا تأكيد.
- ✅ منطق الفاليديشن **مركزي** (`validateForm` + `validators` من `@rafeeq/shared`) ويظهر تحت الحقل عبر `Input error` — جيد لكنه غير مطبّق باتّساق في كل الشاشات.

### 9.5 الإشعارات — «عجقة» (مؤكّد جزئياً)
- شاشة `notifications.tsx` تخلط: قائمة الإشعارات + لوحة تفضيلات (Switches) + **تفعيل كوبونات داخل بطاقات الإشعار** → كثافة وظيفية عالية في شاشة واحدة.
- لا **تجميع حسب التاريخ** (اليوم/أمس) ولا **فلترة حسب الفئة (تبويبات)** → قائمة مسطّحة.
- ✅ يوجد `ListSkeleton` (تحميل جيد). ⚠️ لون `#FFFFFF` ثابت في زر الكوبون.
- على مستوى المنظومة: Push + SMS + Banner داخلي + هذه القائمة تعمل بشكل **غير مترابط** → إحساس «العجقة». يلزم توحيد: توست للأحداث اللحظية + مركز إشعارات مرتّب + تفضيلات في الإعدادات (فصلها عن الفيد).

### 9.6 بقايا هوية إضافية مكتشفة
- `student-app/app.json`: **splash background `#0B7A43`** (أخضر قديم) + `adaptiveIcon.backgroundColor #0B7A43` → أيقونة/سبلاش التطبيق ما زالت بالأخضر القديم. يجب توحيدها مع الهوية النهائية.
- لا يوجد `eas.json` بعد → يلزم إعداده لبناء APK للتجربة على الأجهزة.

### 9.7 خلاصة الجولة الثانية
المشاكل ليست في «هل الميزة موجودة» (معظمها موجود ويعمل)، بل في **تجربة الاستخدام والتدفّق**: غياب معالج خطوات للوثائق، غياب نظام توست/تأكيد موحّد، شيت سفلي جامد، خريطة WebView بلا مفتاح Google، وإشعارات مكدّسة. كلها ضمن **المرحلة 3 و7** من خطة الإصلاح مع إضافات مذكورة أدناه.



---

## 10. سجل الإصلاحات المنفّذة (محدّث أثناء التنفيذ)

> يُحدَّث مع كل إصلاح. كل بند مُتحقَّق منه (typecheck / اختبارات / migrate).

### الهوية البصرية v6 (كحلي + ذهبي)
- **RFQ-286/287:** نظام تصميم v6 كامل (`scheme.ts` كحلي `#243B7A` + ذهبي `#E7A63A`)، نظام أزرار دلالي (أساسي كحلي / قبول أخضر / خطر أحمر / تأكيد ذهبي)، نظام Feedback موحّد (توست + حوار تأكيد) في التطبيقين، توحيد الداشبورد على نفس الهوية، وحذف كل بقايا/إشارات inDrive والألوان القديمة. **تحقّق:** الأربع workspaces تعدّي `tsc`.
- **RFQ-288:** إصلاح غلطتين قديمتين تكسران البناء: مفتاح `services` مكرّر في i18n (ar/en) + `Input` الكابتن ناقصه `onDark`.

### الباك إند (أخطاء فعلية من التشغيل)
- **RFQ-289 (حرج):** إصلاح انهيار «طلب رحلة باب‑لباب» — عمود `coupon_code` كان ناقصاً من جدول `ride_requests` (الموديل والخدمة يكتبانه). أُضيف عبر migration آمن (fresh + existing). **تحقّق:** `migrate:fresh` + فحص آلي لكل الموديلات (55 موديل، 0 تعارض fillable/schema) + 144 اختبار أخضر.
- **RFQ-290:** شحن المحفظة الإداري صار (أ) **idempotent** (نفس المرجع لا يشحن مرتين) و(ب) **قابلاً للعكس** — `reverseTransaction` يسجّل قيداً عكسياً (Adjustment debit) غير تدميري، يُعلّم الأصل (`reversed_at`/`reversal_of`)، محمي ضد العكس المزدوج وصرف الرصيد. Endpoint جديد `POST /admin/wallets/reverse` + 4 اختبارات (148 أخضر). **يحل شكوى: «شحنت 100 وما قدرت ألغي».**

- **RFQ-291 (وظيفي مهم):** إغلاق حالة `ride_request` عند إتمام/إلغاء الرحلة — الإتمام يعلّمها Completed (يرفع الحظر عن إعادة الطلب لنفس الجامعة)، والإلغاء يعيدها Pending ويفصل الرحلة (يُعاد تجميعها). **يحل: الطالب كان يُحظر دائماً.** +2 اختبار (150 أخضر).
- **RFQ-292 (حرج):** إصلاح سباق قبول العرض — تحديث ذرّي مشروط (`driver_id IS NULL` + PendingDriver) بحيث **كابتن واحد فقط** يقدر ياخذ الرحلة المجمّعة؛ المحاولة المتزامنة تُرفض بـ OFFER_TAKEN. +1 اختبار (151 أخضر).

### قيد العمل / التالي
- إصلاح idempotency اعتماد الدفع `PaymentService::approve` + فهرس فريد لـ CliQ (تبقّى من مشاكل التزامن).
- واجهة الداشبورد لزر «عكس الشحن» (backend جاهز).
- إعادة تصميم صفحة الشحن (طالب) — عجقة/إرباك.
- مراجعة صفحة‑بصفحة للتصميم (نص فوق أيقونات، تباين، ترتيب).
- تحسين/ضغط قاعدة البيانات للتوسّع المستقبلي.
- باقي إصلاحات الباك إند (سباق قبول العرض، إغلاق حالة ride_request، تحويل العمليات الثقيلة للطوابير، واتساب OTP، ذهاب‑إياب).
