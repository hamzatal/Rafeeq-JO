# 05 — المعمارية (Architecture)

> مرجع تقني موجز. للحالة والخطة راجع [ROADMAP](../ROADMAP.md)، وللحالة الحقيقية للكود راجع [AUDIT](../AUDIT.md).

## 1) النمط
**Modular Monolith** على **Laravel 12 / PHP 8.4**، namespace `Rafeeq\`. كل مجال أعمال مغلّف في «Module» مستقل (Controllers / Services / Models / Repositories / Requests / Resources / Routes / Migrations / Providers) يسجّل نفسه عبر `ServiceProvider`. يتيح استخراج أي module كخدمة لاحقاً.

النموذج الأساسي: **تجميع باب-لباب حسب المنطقة (Zone Pooling)** — الطالب يطلب من بيته لجامعته، ومحرّك المطابقة يجمّع طلاب نفس المنطقة+الجامعة في رحلة كابتن واحد (سعة 4 افتراضي/7 أقصى) + اشتراكات مجدولة + رحلات Express.

## 2) المكوّنات
- **Backend:** Laravel 12، Sanctum (auth)، RBAC، Audit، مبالغ بالفلس (int)، مفاتيح UUID، Reverb (بثّ حيّ)، Redis (cache/queue/broadcast).
- **Frontend (monorepo npm):** `student-app` + `driver-app` (Expo RN + expo-router) · `admin-dashboard` (Next.js + Tailwind) · `packages/shared` (تصميم Stitch + i18n + أنواع) · `packages/api-client` (عميل REST نوعي).
- **قاعدة البيانات:** PostgreSQL 16 (lat/lng decimal؛ PostGIS لاحقاً).

## 3) الطبقات
`Core` (ApiResponse/BaseService/Repository/Exceptions/Middleware/RBAC/Audit) · `Shared` (Enums + Traits) · `Infrastructure` (SMS · Push/FCM · Gpt/OpenAI · Maps) · `Modules` (المجال) · بثّ Events عبر Reverb.

## 4) الموديولات (32)
Auth · Users · Students · Drivers · Universities · Areas · PickupPoints · Routes · Zones · Subscriptions · RideRequests · Matching · Trips · Wallet · Payouts · Payments · Notifications · Ratings · Support · Complaints · Disputes · Safety · Chat · Parcels · Rewards · LostFound · Exchange · Addresses · Reports · AI · Settings · Coupons.

> بنية كل موديول موحّدة — انسخ موديولاً موجوداً وسجّل الـ Provider في `backend/bootstrap/providers.php`.

## 5) معايير الـ API
- إصدار: `/api/v1/...`؛ استجابة موحّدة `{ data, meta, message }`؛ أخطاء `{ message, errors, code }`.
- مصادقة: Bearer (Sanctum)؛ توطين: `Accept-Language: ar|en`.
- دورة الطلب: Route → middleware (`auth:sanctum` → RBAC → rate-limit → audit) → FormRequest → Controller رفيع → Service → Repository → Resource → Events.

## 6) دورة المال ومكافحة الاحتيال
كل الدفع عبر **CliQ → محفظة مسبقة الدفع (فلس)**. الكابتن يتقاضى **من المنصة** (لا كاش) + حجز العمولة (config، افتراضي 15%). **OTP صعود + OTP إنزال/تسليم** على الطرفين. تسجيل الإلغاءات + Risk Flags + SOS. الشكوى الحرجة → تجميد + تحقيق. التسعير: راجع [PRICING](../product/PRICING.md) — **النموذج الحالي في الكود لا يطابق نموذج العمل وسيُعاد كتابته في المرحلة 5.**

## 7) عميل الـ API (نطاقات `RafeeqApi`)
auth · profile · driver · admin · catalog · transport · driverTrips · wallet · payments · notifications · ratings · rideRequests · support · complaints · disputes · parcels · rewards · lostFound · exchange · coupons · zones · emergency. استجابة موحّدة، Accept-Language تلقائي.

## 8) التكاملات (مفاتيح env — كلها اختيارية، fallback آمن)
| التكامل | env | بدونها |
|---|---|---|
| OpenAI (Vision/AI) | `OPENAI_API_KEY` | مراجعة يدوية / NullGptClient |
| Firebase FCM | `FIREBASE_*` | إشعار داخل التطبيق (log) |
| CliQ | `CLIQ_*` | تعليمات تحويل عامة |
| SMS / WhatsApp OTP | `SMS_*` / `WHATSAPP_*` | log |
| Reverb (بثّ حيّ) | `REVERB_*` | polling |
| الخرائط | `GOOGLE_MAPS_KEY` / `MAPBOX_TOKEN` | إحداثيات نصية |

## 9) التشغيل محلياً
- Backend: `cd backend && composer install && php artisan migrate:fresh --seed && php artisan serve`
- Frontend: `cd frontend && npm install` ثم `npm run student` / `npm run driver` / `npm run admin`
- CI (GitHub Actions): إقلاع Laravel + phpunit + migrate على PostgreSQL 16 + typecheck/lint للتطبيقات.

## 10) قرارات معمارية (ADR ملخّص)
| القرار | السبب |
|--------|-------|
| Modular Monolith بدل Microservices | سرعة إطلاق + كلفة أقل + قابلية تقسيم لاحقة |
| PostgreSQL (+PostGIS لاحقاً) | استعلامات جغرافية + JSONB لبيانات AI |
| Expo (RN) | كود واحد iOS + Android + Web |
| Sanctum | مصادقة token بسيطة للموبايل |
| Redis + Reverb | كاش/طوابير + بثّ حيّ للتتبّع |


---

# قاعدة البيانات

(مدموج من `06-DATABASE.md`)

# مخطط قاعدة البيانات — رفيق (Rafeeq) · Database Schema

> **المصدر الرسمي لبنية قاعدة البيانات.** يُحدَّث مع كل migration جديد.
> يُولَّد جزء منه آلياً من قاعدة البيانات الحيّة عبر `php artisan db:schema-doc` (انظر الأسفل).
>
> آخر تحديث: RFQ-211 · PostgreSQL 16 · المجموع: **65 جدول** (56 جدول نطاق + 9 جداول نظام).

---

## 1. الاصطلاحات (Conventions)

| الاصطلاح | القاعدة |
|----------|---------|
| المفاتيح الأساسية | `id` من نوع **UUID** (عبر `HasUuid`) في كل جداول النطاق |
| المال | يُخزَّن دائماً **بالفلس** (`*_fils`) كـ integer — لا أرقام عشرية أبداً |
| التواريخ | `created_at` / `updated_at` (timestamps) — وبعض الجداول `deleted_at` (Soft Delete) |
| الإحداثيات | `lat` / `lng` بنوع `numeric(10,7)` (دقّة ~1cm) — لا PostGIS بعد (انظر §6) |
| العلامات | الأعمدة المنتهية بـ `!` في هذا الملف تعني **NOT NULL** |
| الترميز | `str(n)`=varchar · `int`=integer · `int8`=bigint · `int2`=smallint · `ts`=timestamp · `bool`=boolean |
| الحذف الناعم | `users, universities, areas, pickup_points, zones, routes, subscription_plans, subscriptions` |

---

## 2. جداول النظام (Laravel Framework) — 9

لا تُعدّل يدوياً؛ تُدار من الإطار.

| الجدول | الغرض |
|--------|-------|
| `migrations` | سجل الـ migrations المنفّذة |
| `cache` · `cache_locks` | الكاش + الأقفال (عند `CACHE_STORE=database`) |
| `jobs` · `job_batches` · `failed_jobs` | طابور المهام والمهام الفاشلة |
| `sessions` | الجلسات (عند `SESSION_DRIVER=database`) |
| `password_reset_tokens` | رموز إعادة تعيين كلمة المرور |
| `personal_access_tokens` | توكنات Sanctum (UUID, prefix `rfq_`) |

---

## 3. جداول النطاق حسب المجال (Domain Tables) — 54

### 3.1 الهوية والصلاحيات (Identity & Access) — 9
| الجدول | الأعمدة الرئيسية | ملاحظات |
|--------|------------------|---------|
| `users` | id, full_name!, phone!, phone_verified_at, email, password, type!, status!, locale!, avatar_path, last_login_at, metadata(jsonb), mfa_secret, mfa_enabled_at, mfa_recovery_codes, deleted_at | النواة. `type`: student/driver/staff/... · MFA للموظفين |
| `otp_codes` | id, identifier!, channel!, purpose!, code_hash!, attempts!, max_attempts!, expires_at!, consumed_at, ip, user_agent | الرمز مُجزّأ (hash) لا نص صريح |
| `roles` · `permissions` | name, label_ar, label_en, group / is_system | RBAC |
| `role_user` · `permission_role` | (pivot) | ربط الأدوار/الصلاحيات |
| `audit_logs` | user_id, action!, auditable_type/id, changes(jsonb), ip, user_agent | سجل تدقيق |
| `student_profiles` | user_id!, university_id, default_pickup_point_id, student_number, faculty, gender, onboarded! | ملف الطالب |
| `driver_profiles` | user_id!, status!, verification_level!, national_id, rating_avg!, rating_count!, total_trips!, face/liveness_verified_at, reviewed_by, submitted_at | ملف الكابتن (تقييم مُخزَّن مُجمّع) |
| `driver_documents` | driver_id!, type!, file_path!, status!, reviewed_by, expires_at | وثائق الكابتن (disk آمن) |
| `vehicles` | driver_id!, make!, model!, year!, color!, plate_number!, seats!, status! | المركبات (سعة 4–7) |

### 3.2 الجغرافيا والكتالوج (Geography & Catalog) — 6
| الجدول | الأعمدة الرئيسية | ملاحظات |
|--------|------------------|---------|
| `universities` | name_ar!, name_en!, code!, city, lat, lng, logo_path, contact_phone, is_active! | الجامعات |
| `areas` | name_ar!, name_en!, governorate, lat, lng, is_active! | المناطق |
| `pickup_points` | area_id, university_id, name_ar!, name_en!, landmark, lat!, lng!, is_active! | نقاط التجمّع |
| `zones` | name_ar!, name_en!, city!, center_lat!, center_lng!, radius_km!, is_active!, boundary(json) | مناطق التجميع + حدّ مضلّع اختياري (Geofence) |
| `routes` | university_id!, from_area_id, name!, price_fils!, capacity!, days(json), departure_time, is_active! | المسارات الثابتة |
| `route_stops` | route_id!, pickup_point_id!, stop_order!, eta_minutes | محطات المسار المرتّبة |

### 3.3 الاشتراكات (Subscriptions) — 2
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `subscription_plans` | university_id, route_id, name!, type!, price_fils!, rides_count, duration_days!, is_active! |
| `subscriptions` | student_id!, plan_id!, route_id, status!, starts_at, ends_at, remaining_rides |

### 3.4 الرحلات والتجميع (Trips & Matching) — 5
| الجدول | الأعمدة الرئيسية | ملاحظات |
|--------|------------------|---------|
| `trips` | route_id, driver_id, vehicle_id, zone_id, university_id, type!, fare_fils!, scheduled_at!, status!, started_at, ended_at, capacity!, is_express!, base_fare_fils!, express_fee_fils!, surge_multiplier! | قلب النظام · scheduled/pooled |
| `trip_passengers` | trip_id!, student_id!, subscription_id, pickup_point_id, pickup_lat/lng, pickup_order, status!, **boarding_code!**, **dropoff_code**, fare_fils!, commission_fils!, captain_share_fils!, paid_at, boarded_at, dropoff_confirmed_at | OTP صعود + OTP إنزال + دورة المال |
| `trip_tracking` | trip_id!, lat!, lng!, speed, recorded_at! | تتبّع لحظي **لكل رحلة** |
| `driver_locations` | driver_id!, lat!, lng!, speed, recorded_at! | نبضات GPS **لكل كابتن** (كشف الاحتيال) |
| `ride_requests` | student_id!, zone_id, university_id!, subscription_id, trip_id, pickup_lat/lng!, desired_time!, type!, is_express!, express_fee_fils!, status!, notes | طلب باب-لباب |

### 3.5 المال (Money & Payments) — 6
| الجدول | الأعمدة الرئيسية | ملاحظات |
|--------|------------------|---------|
| `wallets` | user_id!, balance_fils!, held_fils!, currency! | المحفظة (متاح = balance − held) |
| `wallet_transactions` | wallet_id!, type!, amount_fils!, balance_after!, reference, description, meta(jsonb) | دفتر حركات موقّع |
| `wallet_holds` | wallet_id!, user_id!, amount_fils!, status!, reason, reference, captured_at, released_at | حجز الرصيد (active/captured/released) |
| `payment_requests` | number!, user_id!, payable_type/id, purpose!, amount_fils!, currency!, method!, status!, expires_at, approved_by | طلب دفع (`RFQ-YYYY-#####`) |
| `payments` | payment_request_id!, method!, proof_path, extracted(json), ai_confidence, verified_by, status!, notes | إثبات التحويل + تحقّق GPT Vision |
| `payout_requests` | captain_user_id!, amount_fils!, method!, destination, status!, processed_by | سحب أرباح الكابتن |

### 3.6 التقييم والمكافآت (Ratings & Rewards) — 3
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `ratings` | trip_id!, rater_id!, ratee_id!, direction!, stars!, comment (فريد لكل رحلة/مقيّم/اتجاه) |
| `reward_accounts` | user_id!, tier!, points!, lifetime_points! |
| `reward_transactions` | account_id!, type!, points!, reason!, reference |

### 3.7 الإشعارات (Notifications) — 3
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `rafeeq_notifications` | user_id!, type!, category!, title!, body!, data(json), channels(json), is_critical!, read_at |
| `notification_preferences` | user_id! (unique), push_enabled!, sms_enabled!, payments!, trips!, ratings!, safety!, general! |
| `device_tokens` | user_id!, token! (unique), platform!, last_used_at |

### 3.8 السلامة ومكافحة الاحتيال (Safety & Fraud) — 5
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `risk_flags` | user_id, type!, severity!, description, meta(jsonb), resolved_at, resolved_by |
| `cancellation_logs` | trip_id, actor_user_id, actor_role, reason, passengers_count!, lat, lng |
| `ghost_trip_watches` | trip_id!, driver_id!, pickups(json)!, resolved!, expires_at! |
| `sos_incidents` | user_id!, trip_id, lat, lng, status!, note, handled_by, resolved_at |
| `emergency_contacts` | user_id!, name!, phone!, relation, is_primary!, notify_on_sos! (بديل تطبيق ولي الأمر) |

### 3.9 الدعم والنزاعات (Support & Disputes) — 4
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `support_tickets` | number!, user_id!, category!, subject!, status!, priority!, level!, assigned_to, last_reply_at |
| `ticket_messages` | ticket_id!, sender_id, body!, is_staff!, attachments(json) |
| `complaints` | number!, reporter_id!, against_user_id, trip_id, category!, severity!, status!, description!, ai_report(json), handled_by |
| `disputes` | subject_user_id!, trip_id, type!, status!, severity!, risk_score, summary, opened_by, assigned_to, action_taken, resolved_by |

### 3.10 المحادثة (Chat) — 2
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `chat_conversations` | trip_id, student_user_id!, driver_user_id!, last_message_at (فريد لكل رحلة/طرفين) |
| `chat_messages` | conversation_id!, sender_user_id!, body!, read_at |

### 3.11 الخدمات الإضافية (Extra Services) — 4
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `parcels` | number!, sender_id!, courier_id, receiver_name/phone!, from/to_point_id, category!, size!, fee_fils!, status!, **pickup_code!**, **delivery_code!** | OTP مزدوج (سلسلة عهدة) |
| `parcel_events` | parcel_id!, type!, actor_id, lat, lng, note, at! |
| `lost_found_items` | reporter_id!, type!, category!, title!, location, trip_id, images(json), status!, matched_with |
| `exchange_items` | owner_id!, type!, title!, condition!, price_fils, status!, reserved_by |

### 3.12 الذكاء الاصطناعي والعناوين (AI & Addresses) — 3
| الجدول | الأعمدة الرئيسية |
|--------|------------------|
| `ai_conversations` | user_id!, title, last_message_at |
| `ai_messages` | conversation_id!, role!, content!, tokens! |
| `saved_addresses` | user_id!, label!, title, address_text!, lat, lng, is_default! |

### 3.13 الكوبونات والخصومات (Coupons) — 2
| الجدول | الأعمدة الرئيسية | ملاحظات |
|--------|------------------|---------|
| `coupons` | code! (unique), type! (percentage/fixed), value!, max_discount_fils, min_amount_fils!, scope!, university_id, plan_id, first_order_only!, usage_limit, per_user_limit, used_count!, starts_at, expires_at, is_active!, deleted_at | محرّك الخصومات |
| `coupon_redemptions` | coupon_id!, user_id!, discount_fils!, context_type, context_id | سجل الاستبدال (حدود لكل مستخدم) |

---

## 4. خريطة العلاقات (Relationships)

`users` هو المحور المركزي (يرتبط به ~30 جدول عبر FK). السلاسل الرئيسية:

```
users ─┬─ student_profiles ── university / pickup_point
       ├─ driver_profiles ──┬─ driver_documents
       │                    ├─ vehicles
       │                    ├─ driver_locations
       │                    └─ (courier) parcels
       ├─ wallets ──┬─ wallet_transactions
       │            └─ wallet_holds
       ├─ subscriptions ── subscription_plans ── routes ── route_stops ── pickup_points ── areas/universities
       └─ reward_accounts ── reward_transactions

trips ─┬─ trip_passengers ── (student) users
       ├─ trip_tracking
       ├─ ratings · chat_conversations ── chat_messages
       ├─ ride_requests ── zones
       └─ sos_incidents · cancellation_logs · ghost_trip_watches · disputes

payment_requests ── payments        (payable: subscription | wallet top-up — polymorphic)
support_tickets ── ticket_messages
ai_conversations ── ai_messages
```

---

## 5. تحليل إعادة الترتيب (Normalization Review)

> **الخلاصة:** المخطط مُطبّع (normalized) باحترافية. **لا يُنصح بدمج الجداول لتقليل العدد** — ذلك سيقلب علاقات 1:N سليمة إلى anti-patterns. 54 جدول نطاق رقمٌ صحّي لمنصة بهذا النطاق.

التحسينات النقطية المعتمدة (column-level، لا table-level):
- ✅ **`student_profiles.reward_tier` مكرّر** مع `reward_accounts.tier` — مصدر الحقيقة الوحيد هو `reward_accounts`؛ يُزال العمود المكرّر (RFQ-204).
- ✅ توحيد `gender`/`verification_level`/الحالات على enums بدل strings حرّة حيثما أمكن (تدريجياً).
- 🔎 `trip_tracking` و`driver_locations` متشابهان بنيوياً لكنهما **مقصودان منفصلين**: الأول لحظي-لكل-رحلة (يُعرض للراكب)، الثاني نبضات-لكل-كابتن (كشف احتيال، احتفاظ مختلف). الإبقاء عليهما منفصلين هو الصحيح.

## 6. خارطة طريق قاعدة البيانات
- **PostGIS**: ترقية `lat/lng` إلى `geography(Point)` + فهارس GiST للاستعلامات المكانية (أقرب كابتن/منطقة) عند توفّر الحاجة للحجم.
- **التقسيم (Partitioning)**: `trip_tracking` / `driver_locations` / `audit_logs` مرشّحة للتقسيم الزمني عند نموّ البيانات.
- **النسخ الاحتياطي**: سياسة نسخ يومية + retention قبل الإطلاق.

## 7. كيفية التوليد
```bash
php artisan db:schema-doc        # يُعيد توليد القسم المرجعي من قاعدة البيانات الحيّة
```


---

# عقد التكامل

(مدموج من `12-INTEGRATION-CONTRACT.md`)

# 12 — عقد التكامل بين الفرونت والباك إند (Integration Contract)

> المرحلة 5 (التكامل والصحّة الشاملة). هذا المستند يوثّق **ضمان التكامل** بين
> التطبيقات الثلاثة (الطالب/الكابتن/الإدارة) والـ API، وكيف يُفرَض آلياً.

## المبدأ

التطبيقات الثلاثة تتشارك حزمة `@rafeeq/api-client` التي تستدعي الباك إند عبر
خريطة نقاط النهاية الموحّدة `ENDPOINTS` في `@rafeeq/shared`. أي انحراف بين ما
يستدعيه الفرونت وما يوفّره الباك إند (مسار محذوف/مُعاد تسميته، أو فعل HTTP خاطئ)
يظهر كـ **404/405 وقت التشغيل** في تطبيق منشور — وهو بالضبط نوع العطل الذي يصعب
اكتشافه يدوياً.

## الضمان المؤتمت

اختبار حيّ ضمن مجموعة PHPUnit يفرض العقد على كل تشغيل:
`backend/tests/Feature/ApiContractTest.php`

يقوم بـ:

1. **بناء خريطة المسارات المسجّلة** فعلياً في Laravel (المسار + أفعال HTTP)،
   مع تطبيع معاملات المسار (`{id}` → `{}`).
2. **تحليل `ENDPOINTS`** في `packages/shared/src/constants.ts` إلى خريطة
   `dotted.key → /api/v1/normalized/path` (بما فيها نقاط النهاية الديناميكية
   `(id) => \`/x/${id}\``).
3. **تحليل كل استدعاءات `api-client`** بنمط `this.http.<method>(ENDPOINTS.<ref>)`
   وربطها بمسارها المطبّع.
4. **التأكيد** أن كل استدعاء مُحلَّل يطابق مساراً خلفياً بنفس الفعل والمسار.

يتخطّى الاختبار بلطف (`markTestSkipped`) إن لم تكن مساحة الفرونت موجودة بجانب
الباك إند (سحب backend منفرد).

## نتيجة التدقيق (RFQ-347)

- **نقاط نهاية الفرونت:** 177 — **كلها** لها مسار خلفي مقابل (صفر يؤدي لـ404).
- **استدعاءات api-client المُحلَّلة:** 203 — **صفر** عدم تطابق في الفعل أو المسار.
- **الخلاصة:** عقد الـ API بين التطبيقات الثلاثة والباك إند **متطابق ومتكامل
  ١٠٠٪** وقت كتابة هذا المستند، ومقفول بالاختبار ضد أي انحراف مستقبلي.

## كيف تشغّله

```bash
cd backend
./vendor/bin/phpunit --filter ApiContractTest
```

> يعمل تلقائياً ضمن خطوة `php artisan test` في CI — لا حاجة لخطوة إضافية.

## عند فشل الاختبار

الرسالة تسرد بالضبط الاستدعاء المخالف، مثل:
`payouts.ts: POST ENDPOINTS.driver.performance -> /api/v1/driver/performance :: backend has [GET]`

المعالجة: صحّح إمّا فعل/مسار الاستدعاء في `api-client`/`ENDPOINTS`، أو أضِف/عدّل
المسار في وحدة الباك إند المعنية — بحيث يعود العقد متطابقاً.


---

## عقد الترجمات (i18n) — RFQ-349

`t('some.key')` يشير لمفتاح مفقود يعرض **المفتاح الخام** في الواجهة (خطأ مرئي)،
ولا يلتقطه TypeScript لأن `t()` يقبل أي نص. لذا اختبار حيّ إضافي:
`backend/tests/Feature/I18nContractTest.php`

يتحقق من:

1. **تطابق ar/en في الحزمة المشتركة** — مجموعتا المفاتيح متطابقتان (لا مفتاح
   نصفه مترجم).
2. **تطبيقا الطالب والكابتن** لا يستخدمان إلا مفاتيح موجودة في القاموس المشترك.
3. **لوحة الأدمن** لا تستخدم إلا مفاتيح مُعرّفة في قاموسها المسطّح.

### نتيجة التدقيق

- **الحزمة المشتركة:** 640 مفتاح `ar` = 640 مفتاح `en` (تطابق تام).
- **الجوّال:** 446 مفتاح مستخدم — **صفر مفقود**.
- **الأدمن:** 519 مفتاح مُعرّف / 454 مستخدم — **صفر مفقود**.

> **المرحلة 5 (التكامل والصحّة) مكتملة 100%:** عقد المسارات + عقد الترجمات +
> الصحّة الشاملة (192 اختبار خلفي، 4 واجهات type-check، seed نظيف) — كلها مقفولة
> باختبارات حيّة تعمل في CI.
