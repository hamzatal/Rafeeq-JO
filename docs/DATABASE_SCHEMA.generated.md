# مرجع قاعدة البيانات (مُولَّد آلياً) — Auto-Generated DB Reference

> ⚠️ **لا تُعدّل هذا الملف يدوياً.** يُولَّد عبر `php artisan db:schema-doc`.
> للتوثيق الموصوف بالمجالات: `docs/DATABASE_SCHEMA.md`.

- المُولّد من: **pgsql** · التاريخ: 2026-06-19
- المجموع: **63** جدول (54 نطاق + 9 نظام)

---

## جداول النطاق (Domain)

### `ai_conversations`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `title` | varchar | ✓ |  |
| `last_message_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id,last_message_at`

### `ai_messages`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `conversation_id` | uuid | — |  |
| `role` | varchar | — |  |
| `content` | text | — |  |
| `tokens` | int4 | — | 0 |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `conversation_id` → `ai_conversations(id)`

**Indexes:** `conversation_id`

### `areas`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `name_ar` | varchar | — |  |
| `name_en` | varchar | — |  |
| `governorate` | varchar | ✓ |  |
| `lat` | numeric | ✓ |  |
| `lng` | numeric | ✓ |  |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Indexes:** `governorate` · `is_active`

### `audit_logs`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | ✓ |  |
| `action` | varchar | — |  |
| `auditable_type` | varchar | ✓ |  |
| `auditable_id` | uuid | ✓ |  |
| `changes` | jsonb | ✓ |  |
| `ip` | varchar | ✓ |  |
| `user_agent` | varchar | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `action` · `auditable_type,auditable_id`

### `cancellation_logs`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | ✓ |  |
| `actor_user_id` | uuid | ✓ |  |
| `actor_role` | varchar | ✓ |  |
| `reason` | varchar | ✓ |  |
| `passengers_count` | int2 | — | '0'::smallint |
| `lat` | numeric | ✓ |  |
| `lng` | numeric | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Foreign keys:** `actor_user_id` → `users(id)` · `trip_id` → `trips(id)`

**Indexes:** `actor_user_id,created_at`

### `chat_conversations`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | ✓ |  |
| `student_user_id` | uuid | — |  |
| `driver_user_id` | uuid | — |  |
| `last_message_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `driver_user_id` → `users(id)` · `student_user_id` → `users(id)` · `trip_id` → `trips(id)`

**Indexes:** `driver_user_id` · `student_user_id` · `trip_id,student_user_id,driver_user_id` (unique)

### `chat_messages`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `conversation_id` | uuid | — |  |
| `sender_user_id` | uuid | — |  |
| `body` | text | — |  |
| `read_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `conversation_id` → `chat_conversations(id)` · `sender_user_id` → `users(id)`

**Indexes:** `conversation_id,created_at`

### `complaints`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `number` | varchar | — |  |
| `reporter_id` | uuid | — |  |
| `against_user_id` | uuid | ✓ |  |
| `against_type` | varchar | ✓ |  |
| `trip_id` | uuid | ✓ |  |
| `category` | varchar | — |  |
| `severity` | varchar | — | 'low'::character varying |
| `status` | varchar | — | 'open'::character varying |
| `description` | text | — |  |
| `ai_report` | json | ✓ |  |
| `resolution` | text | ✓ |  |
| `handled_by` | uuid | ✓ |  |
| `resolved_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `against_user_id` → `users(id)` · `handled_by` → `users(id)` · `reporter_id` → `users(id)`

**Indexes:** `against_user_id` · `number` (unique) · `status,severity`

### `device_tokens`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `token` | varchar | — |  |
| `platform` | varchar | — | 'android'::character varying |
| `last_used_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `token` (unique) · `user_id`

### `disputes`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `subject_user_id` | uuid | — |  |
| `trip_id` | uuid | ✓ |  |
| `type` | varchar | — |  |
| `status` | varchar | — | 'open'::character varying |
| `severity` | varchar | — | 'medium'::character varying |
| `risk_score` | int2 | ✓ |  |
| `summary` | text | ✓ |  |
| `opened_by` | uuid | ✓ |  |
| `assigned_to` | uuid | ✓ |  |
| `action_taken` | varchar | ✓ |  |
| `resolution` | text | ✓ |  |
| `resolved_by` | uuid | ✓ |  |
| `resolved_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `assigned_to` → `users(id)` · `opened_by` → `users(id)` · `resolved_by` → `users(id)` · `subject_user_id` → `users(id)`

**Indexes:** `status` · `subject_user_id,status` · `trip_id`

### `driver_documents`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `driver_id` | uuid | — |  |
| `type` | varchar | — |  |
| `file_path` | varchar | — |  |
| `status` | varchar | — | 'pending'::character varying |
| `reviewed_by` | uuid | ✓ |  |
| `review_note` | text | ✓ |  |
| `expires_at` | date | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `driver_id` → `driver_profiles(id)` · `reviewed_by` → `users(id)`

**Indexes:** `driver_id,type`

### `driver_locations`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `driver_id` | uuid | — |  |
| `lat` | numeric | — |  |
| `lng` | numeric | — |  |
| `speed` | numeric | ✓ |  |
| `recorded_at` | timestamp | — |  |

**Foreign keys:** `driver_id` → `driver_profiles(id)`

**Indexes:** `driver_id,recorded_at` · `recorded_at`

### `driver_profiles`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `status` | varchar | — | 'pending'::character varying |
| `verification_level` | int2 | — | '0'::smallint |
| `national_id` | text | ✓ |  |
| `rating_avg` | numeric | — | '0'::numeric |
| `rating_count` | int4 | — | 0 |
| `total_trips` | int4 | — | 0 |
| `face_verified_at` | timestamp | ✓ |  |
| `liveness_verified_at` | timestamp | ✓ |  |
| `reviewed_by` | uuid | ✓ |  |
| `review_note` | text | ✓ |  |
| `submitted_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `reviewed_by` → `users(id)` · `user_id` → `users(id)`

**Indexes:** `status` · `user_id` (unique)

### `emergency_contacts`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `name` | varchar | — |  |
| `phone` | varchar | — |  |
| `relation` | varchar | ✓ |  |
| `is_primary` | bool | — | false |
| `notify_on_sos` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id,is_primary`

### `exchange_items`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `owner_id` | uuid | — |  |
| `type` | varchar | — | 'book'::character varying |
| `title` | varchar | — |  |
| `condition` | varchar | — | 'good'::character varying |
| `description` | text | ✓ |  |
| `images` | json | ✓ |  |
| `price_fils` | int8 | ✓ |  |
| `status` | varchar | — | 'available'::character varying |
| `reserved_by` | uuid | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `owner_id` → `users(id)` · `reserved_by` → `users(id)`

**Indexes:** `owner_id` · `type,status`

### `ghost_trip_watches`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | — |  |
| `driver_id` | uuid | — |  |
| `pickups` | json | — |  |
| `resolved` | bool | — | false |
| `expires_at` | timestamp | — |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `driver_id` → `driver_profiles(id)` · `trip_id` → `trips(id)`

**Indexes:** `driver_id,resolved` · `expires_at` · `resolved`

### `lost_found_items`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `reporter_id` | uuid | — |  |
| `type` | varchar | — |  |
| `category` | varchar | — | 'general'::character varying |
| `title` | varchar | — |  |
| `description` | text | ✓ |  |
| `location` | varchar | ✓ |  |
| `trip_id` | uuid | ✓ |  |
| `images` | json | ✓ |  |
| `status` | varchar | — | 'open'::character varying |
| `matched_with` | uuid | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `reporter_id` → `users(id)`

**Indexes:** `reporter_id` · `type,status`

### `notification_preferences`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `push_enabled` | bool | — | true |
| `sms_enabled` | bool | — | true |
| `payments` | bool | — | true |
| `trips` | bool | — | true |
| `ratings` | bool | — | true |
| `safety` | bool | — | true |
| `general` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id` (unique)

### `otp_codes`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `identifier` | varchar | — |  |
| `channel` | varchar | — | 'sms'::character varying |
| `purpose` | varchar | — |  |
| `code_hash` | varchar | — |  |
| `attempts` | int2 | — | '0'::smallint |
| `max_attempts` | int2 | — | '5'::smallint |
| `expires_at` | timestamp | — |  |
| `consumed_at` | timestamp | ✓ |  |
| `ip` | varchar | ✓ |  |
| `user_agent` | varchar | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Indexes:** `expires_at` · `identifier` · `identifier,purpose`

### `parcel_events`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `parcel_id` | uuid | — |  |
| `type` | varchar | — |  |
| `actor_id` | uuid | ✓ |  |
| `lat` | numeric | ✓ |  |
| `lng` | numeric | ✓ |  |
| `note` | text | ✓ |  |
| `at` | timestamp | — |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `actor_id` → `users(id)` · `parcel_id` → `parcels(id)`

**Indexes:** `parcel_id`

### `parcels`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `number` | varchar | — |  |
| `sender_id` | uuid | — |  |
| `courier_id` | uuid | ✓ |  |
| `receiver_name` | varchar | — |  |
| `receiver_phone` | varchar | — |  |
| `from_point_id` | uuid | ✓ |  |
| `to_point_id` | uuid | ✓ |  |
| `from_address` | varchar | ✓ |  |
| `to_address` | varchar | ✓ |  |
| `category` | varchar | — | 'general'::character varying |
| `size` | varchar | — | 'small'::character varying |
| `description` | text | ✓ |  |
| `fee_fils` | int8 | — | '0'::bigint |
| `status` | varchar | — | 'created'::character varying |
| `pickup_code` | varchar | — |  |
| `delivery_code` | varchar | — |  |
| `picked_up_at` | timestamp | ✓ |  |
| `delivered_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `courier_id` → `driver_profiles(id)` · `from_point_id` → `pickup_points(id)` · `sender_id` → `users(id)` · `to_point_id` → `pickup_points(id)`

**Indexes:** `courier_id,status` · `number` (unique) · `sender_id,status`

### `payment_requests`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `number` | varchar | — |  |
| `user_id` | uuid | — |  |
| `payable_type` | varchar | ✓ |  |
| `payable_id` | uuid | ✓ |  |
| `purpose` | varchar | — |  |
| `amount_fils` | int8 | — |  |
| `currency` | varchar | — | 'JOD'::character varying |
| `method` | varchar | — | 'cliq'::character varying |
| `status` | varchar | — | 'pending'::character varying |
| `reject_reason` | text | ✓ |  |
| `expires_at` | timestamp | ✓ |  |
| `approved_at` | timestamp | ✓ |  |
| `approved_by` | uuid | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `approved_by` → `users(id)` · `user_id` → `users(id)`

**Indexes:** `number` (unique) · `payable_type,payable_id` · `status` · `user_id,status`

### `payments`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `payment_request_id` | uuid | — |  |
| `method` | varchar | — | 'cliq'::character varying |
| `proof_path` | varchar | ✓ |  |
| `extracted` | json | ✓ |  |
| `ai_confidence` | int2 | ✓ |  |
| `verified_by` | varchar | ✓ |  |
| `status` | varchar | — | 'pending'::character varying |
| `notes` | text | ✓ |  |
| `submitted_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `payment_request_id` → `payment_requests(id)`

**Indexes:** `payment_request_id` · `status`

### `payout_requests`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `captain_user_id` | uuid | — |  |
| `amount_fils` | int8 | — |  |
| `method` | varchar | — | 'cliq'::character varying |
| `destination` | varchar | ✓ |  |
| `status` | varchar | — | 'pending'::character varying |
| `note` | varchar | ✓ |  |
| `admin_note` | varchar | ✓ |  |
| `processed_by` | uuid | ✓ |  |
| `processed_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `captain_user_id` → `users(id)`

**Indexes:** `captain_user_id,status` · `status`

### `permission_role`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `permission_id` | uuid | — |  |
| `role_id` | uuid | — |  |

**Foreign keys:** `permission_id` → `permissions(id)` · `role_id` → `roles(id)`

### `permissions`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `name` | varchar | — |  |
| `group` | varchar | — |  |
| `label_ar` | varchar | — |  |
| `label_en` | varchar | — |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Indexes:** `group` · `name` (unique)

### `pickup_points`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `area_id` | uuid | ✓ |  |
| `university_id` | uuid | ✓ |  |
| `name_ar` | varchar | — |  |
| `name_en` | varchar | — |  |
| `landmark` | varchar | ✓ |  |
| `lat` | numeric | — |  |
| `lng` | numeric | — |  |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Foreign keys:** `area_id` → `areas(id)` · `university_id` → `universities(id)`

**Indexes:** `is_active`

### `rafeeq_notifications`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `type` | varchar | — |  |
| `category` | varchar | — | 'general'::character varying |
| `title` | varchar | — |  |
| `body` | text | — |  |
| `data` | json | ✓ |  |
| `channels` | json | ✓ |  |
| `is_critical` | bool | — | false |
| `read_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id,category` · `user_id,read_at`

### `ratings`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | — |  |
| `rater_id` | uuid | — |  |
| `ratee_id` | uuid | — |  |
| `direction` | varchar | — |  |
| `stars` | int2 | — |  |
| `comment` | text | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `ratee_id` → `users(id)` · `rater_id` → `users(id)` · `trip_id` → `trips(id)`

**Indexes:** `ratee_id` · `trip_id,rater_id,direction` (unique)

### `reward_accounts`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `tier` | varchar | — | 'bronze'::character varying |
| `points` | int4 | — | 0 |
| `lifetime_points` | int4 | — | 0 |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id` (unique)

### `reward_transactions`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `account_id` | uuid | — |  |
| `type` | varchar | — |  |
| `points` | int4 | — |  |
| `reason` | varchar | — |  |
| `reference` | varchar | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `account_id` → `reward_accounts(id)`

**Indexes:** `account_id`

### `ride_requests`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `student_id` | uuid | — |  |
| `zone_id` | uuid | ✓ |  |
| `university_id` | uuid | — |  |
| `subscription_id` | uuid | ✓ |  |
| `trip_id` | uuid | ✓ |  |
| `pickup_lat` | numeric | — |  |
| `pickup_lng` | numeric | — |  |
| `pickup_address` | varchar | ✓ |  |
| `desired_time` | timestamp | — |  |
| `type` | varchar | — | 'scheduled'::character varying |
| `is_express` | bool | — | false |
| `express_fee_fils` | int4 | — | 0 |
| `status` | varchar | — | 'pending'::character varying |
| `notes` | varchar | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `student_id` → `users(id)` · `subscription_id` → `subscriptions(id)` · `trip_id` → `trips(id)` · `university_id` → `universities(id)` · `zone_id` → `zones(id)`

**Indexes:** `status` · `student_id,status` · `zone_id,university_id,status`

### `risk_flags`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | ✓ |  |
| `type` | varchar | — |  |
| `severity` | varchar | — |  |
| `description` | varchar | ✓ |  |
| `meta` | jsonb | ✓ |  |
| `resolved_at` | timestamp | ✓ |  |
| `resolved_by` | uuid | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Foreign keys:** `resolved_by` → `users(id)` · `user_id` → `users(id)`

**Indexes:** `severity` · `type` · `user_id,resolved_at`

### `role_user`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `role_id` | uuid | — |  |
| `user_id` | uuid | — |  |

**Foreign keys:** `role_id` → `roles(id)` · `user_id` → `users(id)`

### `roles`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `name` | varchar | — |  |
| `label_ar` | varchar | — |  |
| `label_en` | varchar | — |  |
| `is_system` | bool | — | false |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Indexes:** `name` (unique)

### `route_stops`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `route_id` | uuid | — |  |
| `pickup_point_id` | uuid | — |  |
| `stop_order` | int2 | — | '0'::smallint |
| `eta_minutes` | int2 | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `pickup_point_id` → `pickup_points(id)` · `route_id` → `routes(id)`

**Indexes:** `route_id,stop_order`

### `routes`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `university_id` | uuid | — |  |
| `from_area_id` | uuid | ✓ |  |
| `name` | varchar | — |  |
| `price_fils` | int4 | — | 0 |
| `capacity` | int2 | — | '4'::smallint |
| `days` | json | ✓ |  |
| `departure_time` | varchar | ✓ |  |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Foreign keys:** `from_area_id` → `areas(id)` · `university_id` → `universities(id)`

**Indexes:** `is_active`

### `saved_addresses`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `label` | varchar | — | 'other'::character varying |
| `title` | varchar | ✓ |  |
| `address_text` | varchar | — |  |
| `lat` | float8 | ✓ |  |
| `lng` | float8 | ✓ |  |
| `is_default` | bool | — | false |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id,is_default`

### `sos_incidents`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `trip_id` | uuid | ✓ |  |
| `lat` | numeric | ✓ |  |
| `lng` | numeric | ✓ |  |
| `status` | varchar | — | 'open'::character varying |
| `note` | varchar | ✓ |  |
| `handled_by` | uuid | ✓ |  |
| `resolved_at` | timestamp | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Foreign keys:** `handled_by` → `users(id)` · `trip_id` → `trips(id)` · `user_id` → `users(id)`

**Indexes:** `status`

### `student_profiles`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `university_id` | uuid | ✓ |  |
| `default_pickup_point_id` | uuid | ✓ |  |
| `student_number` | varchar | ✓ |  |
| `faculty` | varchar | ✓ |  |
| `gender` | varchar | ✓ |  |
| `onboarded` | bool | — | false |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `default_pickup_point_id` · `university_id` · `user_id` (unique)

### `subscription_plans`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `university_id` | uuid | ✓ |  |
| `route_id` | uuid | ✓ |  |
| `name` | varchar | — |  |
| `type` | varchar | — |  |
| `price_fils` | int4 | — | 0 |
| `rides_count` | int4 | ✓ |  |
| `duration_days` | int2 | — |  |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Foreign keys:** `route_id` → `routes(id)` · `university_id` → `universities(id)`

**Indexes:** `is_active`

### `subscriptions`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `student_id` | uuid | — |  |
| `plan_id` | uuid | — |  |
| `route_id` | uuid | ✓ |  |
| `status` | varchar | — | 'pending'::character varying |
| `starts_at` | timestamp | ✓ |  |
| `ends_at` | timestamp | ✓ |  |
| `remaining_rides` | int4 | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Foreign keys:** `plan_id` → `subscription_plans(id)` · `route_id` → `routes(id)` · `student_id` → `users(id)`

**Indexes:** `status` · `student_id,status`

### `support_tickets`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `number` | varchar | — |  |
| `user_id` | uuid | — |  |
| `category` | varchar | — |  |
| `subject` | varchar | — |  |
| `status` | varchar | — | 'open'::character varying |
| `priority` | varchar | — | 'normal'::character varying |
| `level` | int2 | — | '1'::smallint |
| `assigned_to` | uuid | ✓ |  |
| `last_reply_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `assigned_to` → `users(id)` · `user_id` → `users(id)`

**Indexes:** `number` (unique) · `status,level` · `user_id,status`

### `ticket_messages`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `ticket_id` | uuid | — |  |
| `sender_id` | uuid | ✓ |  |
| `body` | text | — |  |
| `is_staff` | bool | — | false |
| `attachments` | json | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `sender_id` → `users(id)` · `ticket_id` → `support_tickets(id)`

**Indexes:** `ticket_id`

### `trip_passengers`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | — |  |
| `student_id` | uuid | — |  |
| `subscription_id` | uuid | ✓ |  |
| `pickup_point_id` | uuid | ✓ |  |
| `pickup_lat` | numeric | ✓ |  |
| `pickup_lng` | numeric | ✓ |  |
| `pickup_order` | int2 | ✓ |  |
| `status` | varchar | — | 'booked'::character varying |
| `boarding_code` | varchar | — |  |
| `dropoff_code` | varchar | ✓ |  |
| `fare_fils` | int4 | — | 0 |
| `commission_fils` | int4 | — | 0 |
| `captain_share_fils` | int4 | — | 0 |
| `paid_at` | timestamp | ✓ |  |
| `boarded_at` | timestamp | ✓ |  |
| `dropoff_confirmed_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `pickup_point_id` → `pickup_points(id)` · `student_id` → `users(id)` · `subscription_id` → `subscriptions(id)` · `trip_id` → `trips(id)`

**Indexes:** `trip_id,student_id` (unique)

### `trip_tracking`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `trip_id` | uuid | — |  |
| `lat` | numeric | — |  |
| `lng` | numeric | — |  |
| `speed` | numeric | ✓ |  |
| `recorded_at` | timestamp | — |  |

**Foreign keys:** `trip_id` → `trips(id)`

**Indexes:** `recorded_at` · `trip_id,recorded_at`

### `trips`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `route_id` | uuid | ✓ |  |
| `driver_id` | uuid | ✓ |  |
| `vehicle_id` | uuid | ✓ |  |
| `zone_id` | uuid | ✓ |  |
| `university_id` | uuid | ✓ |  |
| `type` | varchar | — | 'scheduled'::character varying |
| `fare_fils` | int4 | — | 0 |
| `scheduled_at` | timestamp | — |  |
| `status` | varchar | — | 'scheduled'::character varying |
| `started_at` | timestamp | ✓ |  |
| `ended_at` | timestamp | ✓ |  |
| `capacity` | int2 | — | '4'::smallint |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `is_express` | bool | — | false |
| `base_fare_fils` | int4 | — | 0 |
| `express_fee_fils` | int4 | — | 0 |
| `surge_multiplier` | numeric | — | '1'::numeric |

**Foreign keys:** `driver_id` → `driver_profiles(id)` · `route_id` → `routes(id)` · `university_id` → `universities(id)` · `vehicle_id` → `vehicles(id)`

**Indexes:** `scheduled_at` · `status` · `zone_id`

### `universities`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `name_ar` | varchar | — |  |
| `name_en` | varchar | — |  |
| `code` | varchar | — |  |
| `city` | varchar | ✓ |  |
| `lat` | numeric | ✓ |  |
| `lng` | numeric | ✓ |  |
| `logo_path` | varchar | ✓ |  |
| `contact_phone` | varchar | ✓ |  |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |

**Indexes:** `code` (unique) · `is_active`

### `users`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `full_name` | varchar | — |  |
| `phone` | varchar | — |  |
| `phone_verified_at` | timestamp | ✓ |  |
| `email` | varchar | ✓ |  |
| `email_verified_at` | timestamp | ✓ |  |
| `password` | varchar | ✓ |  |
| `type` | varchar | — | 'student'::character varying |
| `status` | varchar | — | 'pending'::character varying |
| `locale` | varchar | — | 'ar'::character varying |
| `avatar_path` | varchar | ✓ |  |
| `last_login_at` | timestamp | ✓ |  |
| `metadata` | jsonb | ✓ |  |
| `remember_token` | varchar | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |
| `mfa_secret` | text | ✓ |  |
| `mfa_enabled_at` | timestamp | ✓ |  |
| `mfa_recovery_codes` | text | ✓ |  |

**Indexes:** `email` (unique) · `phone` (unique) · `status` · `type`

### `vehicles`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `driver_id` | uuid | — |  |
| `make` | varchar | — |  |
| `model` | varchar | — |  |
| `year` | int2 | — |  |
| `color` | varchar | — |  |
| `plate_number` | varchar | — |  |
| `seats` | int2 | — | '4'::smallint |
| `status` | varchar | — | 'active'::character varying |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `driver_id` → `driver_profiles(id)`

**Indexes:** `plate_number` (unique)

### `wallet_holds`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `wallet_id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `amount_fils` | int8 | — |  |
| `status` | varchar | — | 'active'::character varying |
| `reason` | varchar | ✓ |  |
| `reference` | uuid | ✓ |  |
| `captured_at` | timestamp | ✓ |  |
| `released_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Foreign keys:** `user_id` → `users(id)` · `wallet_id` → `wallets(id)`

**Indexes:** `reference` · `reference,status` · `status` · `wallet_id,status`

### `wallet_transactions`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `wallet_id` | uuid | — |  |
| `type` | varchar | — |  |
| `amount_fils` | int8 | — |  |
| `balance_after` | int8 | — |  |
| `reference` | varchar | ✓ |  |
| `description` | varchar | ✓ |  |
| `meta` | jsonb | ✓ |  |
| `created_at` | timestamp | — | CURRENT_TIMESTAMP |

**Foreign keys:** `wallet_id` → `wallets(id)`

**Indexes:** `wallet_id,created_at`

### `wallets`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `user_id` | uuid | — |  |
| `balance_fils` | int8 | — | '0'::bigint |
| `currency` | varchar | — | 'JOD'::character varying |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `held_fils` | int8 | — | '0'::bigint |

**Foreign keys:** `user_id` → `users(id)`

**Indexes:** `user_id` (unique)

### `zones`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `name_ar` | varchar | — |  |
| `name_en` | varchar | — |  |
| `city` | varchar | — | 'إربد'::character varying |
| `center_lat` | numeric | — |  |
| `center_lng` | numeric | — |  |
| `radius_km` | numeric | — | '3'::numeric |
| `is_active` | bool | — | true |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |
| `deleted_at` | timestamp | ✓ |  |
| `boundary` | json | ✓ |  |

**Indexes:** `city` · `is_active`


---

## جداول النظام (Framework)

### `cache`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `key` | varchar | — |  |
| `value` | text | — |  |
| `expiration` | int4 | — |  |

### `cache_locks`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `key` | varchar | — |  |
| `owner` | varchar | — |  |
| `expiration` | int4 | — |  |

### `failed_jobs`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | int8 | — | nextval('failed_jobs_id_seq'::regclass) |
| `uuid` | varchar | — |  |
| `connection` | text | — |  |
| `queue` | text | — |  |
| `payload` | text | — |  |
| `exception` | text | — |  |
| `failed_at` | timestamp | — | CURRENT_TIMESTAMP |

**Indexes:** `uuid` (unique)

### `job_batches`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | varchar | — |  |
| `name` | varchar | — |  |
| `total_jobs` | int4 | — |  |
| `pending_jobs` | int4 | — |  |
| `failed_jobs` | int4 | — |  |
| `failed_job_ids` | text | — |  |
| `options` | text | ✓ |  |
| `cancelled_at` | int4 | ✓ |  |
| `created_at` | int4 | — |  |
| `finished_at` | int4 | ✓ |  |

### `jobs`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | int8 | — | nextval('jobs_id_seq'::regclass) |
| `queue` | varchar | — |  |
| `payload` | text | — |  |
| `attempts` | int2 | — |  |
| `reserved_at` | int4 | ✓ |  |
| `available_at` | int4 | — |  |
| `created_at` | int4 | — |  |

**Indexes:** `queue`

### `migrations`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | int4 | — | nextval('migrations_id_seq'::regclass) |
| `migration` | varchar | — |  |
| `batch` | int4 | — |  |

### `password_reset_tokens`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `email` | varchar | — |  |
| `token` | varchar | — |  |
| `created_at` | timestamp | ✓ |  |

### `personal_access_tokens`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | uuid | — |  |
| `tokenable_type` | varchar | — |  |
| `tokenable_id` | uuid | — |  |
| `name` | varchar | — |  |
| `token` | varchar | — |  |
| `abilities` | text | ✓ |  |
| `last_used_at` | timestamp | ✓ |  |
| `expires_at` | timestamp | ✓ |  |
| `created_at` | timestamp | ✓ |  |
| `updated_at` | timestamp | ✓ |  |

**Indexes:** `expires_at` · `token` (unique) · `tokenable_type,tokenable_id`

### `sessions`

| العمود | النوع | Nullable | افتراضي |
|---|---|---|---|
| `id` | varchar | — |  |
| `user_id` | uuid | ✓ |  |
| `ip_address` | varchar | ✓ |  |
| `user_agent` | text | ✓ |  |
| `payload` | text | — |  |
| `last_activity` | int4 | — |  |

**Indexes:** `last_activity` · `user_id`

