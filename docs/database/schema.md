# تصميم قاعدة البيانات (Database Schema)

> القاعدة: PostgreSQL 16 + PostGIS. المفاتيح الأساسية `UUID`. كل الجداول فيها `created_at`, `updated_at`,
> ومعظمها `deleted_at` (Soft Deletes). الحقول المالية والحساسة مشفّرة عند اللزوم.

## نظرة عامة على المجالات
```
Identity     : users, otp_codes, sessions, personal_access_tokens
RBAC         : roles, permissions, role_user, permission_role
Profiles     : student_profiles, driver_profiles, driver_documents, vehicles
Geo/Network  : universities, areas, pickup_points, routes, route_stops
Mobility     : subscriptions, subscription_plans, trips, trip_passengers, trip_tracking
Payments     : payment_requests, payments, wallets, wallet_transactions
Services     : parcels, parcel_events, lost_found_items, lost_found_matches, exchange_items
Engagement   : reward_accounts, reward_transactions, notifications
Support      : support_tickets, ticket_messages, complaints
Safety       : sos_incidents, risk_flags, audit_logs
AI           : ai_conversations, ai_messages, ai_jobs
```

## الجداول الأساسية (Phase 1)

### users
| العمود | النوع | ملاحظات |
|--------|------|---------|
| id | uuid (PK) | |
| full_name | varchar(150) | |
| phone | varchar(20) unique | رقم أردني، صيغة E.164 |
| phone_verified_at | timestamptz null | |
| email | varchar(150) unique null | |
| email_verified_at | timestamptz null | |
| password | varchar | hashed (bcrypt/argon) |
| type | enum(student, driver, support, supervisor, admin) | الدور الأساسي |
| status | enum(pending, active, suspended, banned) | |
| locale | varchar(5) default 'ar' | ar / en |
| avatar_path | varchar null | |
| last_login_at | timestamptz null | |
| metadata | jsonb | إعدادات/أعلام مرنة |
| created_at / updated_at / deleted_at | timestamptz | |

### otp_codes
| العمود | النوع | ملاحظات |
|--------|------|---------|
| id | uuid (PK) | |
| identifier | varchar(150) | الهاتف أو الإيميل |
| channel | enum(sms, email, whatsapp) | |
| purpose | enum(register, login, reset_password, trip, payment) | |
| code_hash | varchar | الكود مخزّن hashed |
| attempts | smallint default 0 | محاولات خاطئة |
| max_attempts | smallint default 5 | |
| expires_at | timestamptz | عادة +5 دقائق |
| consumed_at | timestamptz null | |
| ip / user_agent | varchar null | لأغراض الأمان |
| created_at | timestamptz | |

> يُمنع إنشاء OTP جديد قبل مرور `resend_cooldown` (مثلاً 60 ثانية). يُحفظ الكود hashed فقط.

### roles / permissions (RBAC)
- `roles(id, name, label_ar, label_en, is_system)`
- `permissions(id, name, group, label_ar, label_en)`
- `role_user(role_id, user_id)`
- `permission_role(permission_id, role_id)`

أدوار النظام: `student`, `driver`, `support`, `supervisor`, `admin`.

### student_profiles
| العمود | النوع |
|--------|------|
| id | uuid (PK) |
| user_id | uuid → users |
| university_id | uuid → universities (null) |
| student_number | varchar null |
| faculty | varchar null |
| default_pickup_point_id | uuid → pickup_points (null) |
| gender | enum(male, female) null |
| reward_tier | enum(bronze, silver, gold, platinum) default bronze |

### driver_profiles
| العمود | النوع | ملاحظات |
|--------|------|---------|
| id | uuid (PK) | |
| user_id | uuid → users | |
| status | enum(pending, under_review, approved, rejected, suspended) | حالة التوثيق |
| verification_level | smallint default 0 | عدد طبقات الأمان المكتملة |
| national_id | varchar (encrypted) | |
| rating_avg | decimal(3,2) default 0 | |
| rating_count | int default 0 | |
| total_trips | int default 0 | |
| face_verified_at | timestamptz null | نتيجة فقط — بدون تخزين الصورة الحيوية |
| liveness_verified_at | timestamptz null | |

### driver_documents
| العمود | النوع |
|--------|------|
| id | uuid (PK) |
| driver_id | uuid → driver_profiles |
| type | enum(national_id, license, vehicle_registration, insurance, criminal_record, photo) |
| file_path | varchar |
| status | enum(pending, approved, rejected) |
| reviewed_by | uuid → users (null) |
| review_note | text null |
| expires_at | date null |

### vehicles
| العمود | النوع |
|--------|------|
| id | uuid (PK) |
| driver_id | uuid → driver_profiles |
| make / model | varchar |
| year | smallint |
| color | varchar |
| plate_number | varchar unique |
| seats | smallint |
| status | enum(active, inactive) |

### audit_logs
| العمود | النوع | ملاحظات |
|--------|------|---------|
| id | uuid (PK) | |
| user_id | uuid → users (null) | الفاعل |
| action | varchar | مثل `auth.login`, `driver.approve` |
| auditable_type / auditable_id | varchar / uuid | الكيان المتأثر |
| changes | jsonb | before/after |
| ip / user_agent | varchar | |
| created_at | timestamptz | |

## ملاحظات أمان البيانات
- الحقول الحساسة (`national_id`, الوثائق الرسمية) مشفّرة (Laravel encrypted cast).
- البيانات الحيوية (Face/Liveness): نخزّن **نتيجة التحقق فقط** لا الصور — تقليلاً للمسؤولية القانونية.
- جميع عمليات الكتابة الحساسة تُسجّل في `audit_logs`.
- الأرقام المالية تُخزّن كـ `bigint` بوحدة القرش (fils) لتجنّب أخطاء الـ float.

> جداول المراحل القادمة (Trips/Payments/Parcels...) موثّقة في ملفات منفصلة عند تنفيذ كل مرحلة.
