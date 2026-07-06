# Rafeeq Backend — Security & QA Audit (Static Analysis)

**Scope:** `/projects/sandbox/Rafeeq-JO/backend` — Laravel 12 modular monolith (32 modules, ~532 PHP files). Dependencies not installed; findings are from reading source only. No files were modified.

**Reviewer stance:** Backend security engineer + QA auditor. This platform handles real money (CliQ manual transfers, prepaid wallets, captain payouts) and carries university students, so money-integrity and location-privacy issues are weighted heavily.

---

## 0. Executive Summary

The codebase is **well above average** for an early-stage product: consistent modular structure, hashed OTPs, row-locked wallet mutations, idempotent payment approval backed by a partial unique index, a self-contained RFC-6238 TOTP, centralized JSON error envelope that hides internals in production, and a real test suite (~50 feature/unit tests) covering money and fraud paths.

However, several issues should be fixed **before** a real-money launch. The most important:

| # | Severity | Issue |
|---|----------|-------|
| 1 | **High** | Live trip GPS/status broadcast on **public** channels with **no channel authorization** wired — real-time tracking of student rides is exposed to anyone with a trip UUID |
| 2 | **High** | **Orphaned wallet holds**: fare holds are never released for booked-but-never-boarded passengers when a trip completes → student funds locked indefinitely |
| 3 | **High** | **MFA bypass**: staff/admin with TOTP enabled can still log in via the passwordless SMS-OTP flow, which never checks the second factor |
| 4 | **Medium/High** | **Coupon can create phantom money**: when ride discount > platform commission, the captain is credited more than the student is debited, minting balance in the wallet ledger |
| 5 | **Medium** | Coupon `redeem()` re-checks only the global usage cap under lock — `per_user_limit` / `first_order_only` are race-prone |
| 6 | **Medium** | SOS endpoint has no rate limit and does not validate `trip_id` ownership |
| 7 | **Medium** | Missing indexes on FK/hot columns used by financial reports (`trip_passengers.student_id`, `paid_at`) |

Details, file references, and fixes below.

---

## 1. Architecture

### Structure
- **Layering:** `Core/` (framework glue: RBAC, middleware, audit, base classes), `Infrastructure/` (GPT, SMS, Push, Maps gateways behind contracts), `Shared/` (enums, traits, `Phone` support), `Modules/*` (32 domain modules). Clean, PSR-4 (`composer.json`), each layer namespaced (`Rafeeq\Core`, `Rafeeq\Modules`, …).
- **Module shape is consistent:** `Controllers / Services / Models / Requests / Resources / Routes / Database/Migrations / Providers`. Each module has its own `ServiceProvider` registered in `bootstrap/providers.php`, and each provider self-registers its routes (`Route::middleware('api')->prefix('api')->group(...)`) and migrations (`loadMigrationsFrom`). This is a genuine modular monolith, not a folder cosmetic.
- **Request lifecycle** (`bootstrap/app.php`): API stack prepends `ForceJsonResponse`, `SecurityHeaders`, `SetLocale`; appends global `throttle:api`. Named aliases `role`, `permission`, `audit`. Exceptions rendered through `ApiExceptionRenderer` as a unified JSON envelope. Stateless Sanctum Bearer tokens for all clients; `statefulApi()` deliberately not enabled (documented reasoning re: CSRF).
- **Services encapsulate business logic**; controllers stay thin and use FormRequests. Money mutations concentrate in `WalletService` / `RideBillingService` / `PaymentService` / `PayoutService`.

### Anti-patterns / observations
- **`app(SettingService::class)` service-location** inside `WalletController::topupInstructions` and `PaymentService::instructions` instead of constructor injection — minor inconsistency vs. the DI used everywhere else.
- **Cross-module coupling via concrete classes**: e.g. `PaymentService` directly `new`s/`app()`s `Coupon`, `Subscription`, etc. Acceptable for a monolith but means modules are not independently deployable (they aren't meant to be).
- **`composer.json` metadata drift**: description says "Laravel 11" while `require` pins `laravel/framework: ^12.0`; `php: ^8.2` while the target runtime is 8.4. Cosmetic.
- No `app/Http` — everything lives under `Core/Http`. Fine, but note `AppServiceProvider` is empty.

**Verdict:** architecture is coherent and consistently applied. No structural red flags.

---

## 2. Security Vulnerabilities

### 2.1 Live location broadcast on public channels — **High** (privacy/safety)
`Modules/Trips/Events/TripLocationUpdated.php` and `TripStatusChanged.php` both:
```php
public function broadcastOn(): array {
    return [new Channel('trip.'.$this->tripId)];   // PUBLIC channel
}
```
- They use `Illuminate\Broadcasting\Channel` (public), **not** `PrivateChannel`.
- `bootstrap/app.php` `withRouting(...)` does **not** register a `channels` file, and there is **no** `Broadcast::channel(...)` definition anywhere in the repo (grep returned nothing). So there is no subscriber authorization at all.
- Effect: with Reverb enabled, any client that connects and subscribes to `trip.{uuid}` receives the captain/student **real-time GPS stream and trip status**. Trip UUIDs are handed to every authenticated participant and appear in many API responses, so this is a realistic exposure — especially sensitive given female student riders in Jordan.

**Fix:** switch both events to `PrivateChannel('trip.'.$tripId)`, add a `routes/channels.php` registered via `->withRouting(channels: ...)`, and authorize only the trip's driver + booked passengers (+ admins). Ensure Reverb requires the broadcasting auth endpoint.

### 2.2 MFA bypass through passwordless OTP login — **High**
`AuthService::login()` correctly issues an MFA challenge when `hasMfaEnabled()`. But the SMS-OTP login path (`requestLoginOtp()` → `verifyOtp(purpose: Login)` in `AuthService`) issues a full access token **without any MFA check**:
```php
// verifyOtp(): after this->otp->verify(...), it just issues a token
$token = $this->issueToken($user, $deviceName, $request);
```
An admin/supervisor who enabled TOTP can therefore authenticate with only an SMS OTP, defeating the second factor. (Staff accounts are created with a password, but nothing prevents them from using `request-otp`.)

**Fix:** in `verifyOtp()` for the `Login` purpose, if `user->hasMfaEnabled()` return an MFA challenge instead of a token (mirror `login()`), or block passwordless OTP login for staff accounts.

### 2.3 AuthN / AuthZ — generally solid
- **Sanctum**: UUID PAT model swapped in (`AuthServiceProvider::register`). `sanctum.expiration` = 30 days; long-lived mobile tokens — acceptable, `logout`/`logoutAll` and password reset revoke tokens (`AuthService::resetPassword` deletes all tokens). Good.
- **RBAC** (`Core/Permissions/HasRoles`): `role`/`permission` middleware present; `hasPermission()` treats `admin` role as superuser; per-request permission cache avoids N+1. Routes gate admin surfaces well (e.g. `Payments/Routes/api.php` uses `permission:payments.view` / `payments.approve`; `Drivers` uses `drivers.view/review/approve`; `Users` staff mgmt uses `users.manage`).
- **IDOR**: payer endpoints call `assertOwner()` (`PaymentController`), driver trip endpoints call `ownedTrip()` (`DriverTripController`), saved-addresses test asserts 403 cross-user. Payment proof download and driver document download are admin-permission gated. **No obvious IDOR** in the money paths reviewed.
- **Mass assignment**: models use explicit `$fillable`; controllers pass `$request->validated()` (grep found **no** `guarded = []`, no `->update($request->all())`). `User` hides `password`, `mfa_secret`, `mfa_recovery_codes` and casts `mfa_secret`/`mfa_recovery_codes` as `encrypted`. Profile update whitelists `full_name/email/locale` only — **no privilege escalation** (status/type/role not settable by users). Good.
- **Staff creation** (`StaffService`) is restricted to `users.manage` and validates role against `STAFF_ROLES`. Reasonable.

### 2.4 Input validation & SQL injection
- FormRequests cover the sensitive write paths (auth, payments, driver docs, trips). Some controllers use inline `$request->validate([...])` (e.g. `WalletController`, `SosController`) — acceptable and correct.
- **SQL injection: none found.** All raw fragments use bound parameters: `CouponService` `whereRaw('LOWER(code) = ?', [...])`, `FraudMonitorService` `havingRaw('... >= ?', [...])`, reporting `selectRaw` uses static column expressions only. Good.

### 2.5 File upload safety — good
- Payment proof (`SubmitProofRequest`): `image|mimes:jpg,jpeg,png,webp|max:8192`. Driver docs (`UploadDocumentRequest`): `file|mimes:jpg,jpeg,png,pdf|max:8192`.
- Stored on the **private `secure` disk** via `->store(...)` (framework-generated hashed names — no path traversal, no user-controlled filename). `filesystems.php` `secure` disk defaults to local private, S3-ready via `SECURE_DISK_DRIVER=s3`. Downloads gated behind admin permissions. Image content hashed (`sha256`) for duplicate-proof detection.
- **Minor:** no explicit re-validation of MIME by content beyond Laravel's `mimes`/`image` (which do inspect content). Consider stripping EXIF / re-encoding images, and virus scanning for PDFs before an admin opens them.

### 2.6 Secrets, CORS, headers, throttling
- **Secrets**: `.env.example` / `.env.production.example` contain only placeholders; no real keys committed. `services.php` reads all secrets from env. Good.
- **CORS** (`config/cors.php`): explicit origins via `CORS_ALLOWED_ORIGINS`, plus localhost regex patterns for dev, `supports_credentials: true`. Since auth is Bearer-token (stateless), `supports_credentials` isn't required and slightly widens surface; ensure production sets a tight `CORS_ALLOWED_ORIGINS` and the localhost patterns are dev-only. **Low.**
- **Security headers** (`SecurityHeaders`): `nosniff`, `X-Frame-Options: DENY`, strict `Referrer-Policy`, JSON-only CSP `default-src 'none'`, HSTS only over TLS. Solid for a JSON API.
- **Throttling**: `api` 120/min per user-or-IP (global); `auth` 6/min per phone + 20/min per IP (brute-force resistant); `sensitive` 20/min applied to coupon validation. **Gap:** `sensitive` is *not* applied to payment create/proof or SOS despite the comment claiming so.

### 2.7 Payment / wallet integrity
- **Wallet mutations are row-locked**: `WalletService::apply()` / `hold()` / `capture()` / `release()` / `adminTopup()` / `reverseTransaction()` all `lockForUpdate()` the wallet row and re-check invariants inside `DB::transaction`. `apply()` enforces `newBalance >= 0`. Nested transactions use savepoints — safe. **This is the right pattern.**
- **Payment approval is idempotent under lock** (`PaymentService::approve`): re-reads status under `lockForUpdate`, refuses double-fulfilment; duplicate `bank_reference` blocked both by code and a **partial unique index** (`payments_bank_reference_approved_unique`, migration `2026_07_03_000100`). Good defense against double-crediting one CliQ transfer.
- **CliQ anti-fraud** (`PaymentService::fraudFlags` + `PaymentVerificationService`): duplicate image hash, duplicate bank reference, beneficiary mismatch, sender-name mismatch, `looks_edited` all force manual review; auto-approve only at confidence ≥ 80 with exact amount (tolerance 0), name+alias match, not edited, `is_cliq`. Without an OpenAI key the `NullGptClient` routes everything to human review. Well-designed.
  - *Minor:* the `duplicate_reference`/`duplicate_image` checks match payments in **any** status (incl. rejected), which could over-flag legitimate re-submissions. Low.
  - *Minor:* the model-returned `amount_matches` field is collected but unused (amount is recomputed server-side — correct, but the field is dead).

#### 2.7.1 Coupon can mint wallet balance — **Medium/High** (money integrity)
`RideBillingService::chargeForBoarding()`:
```php
$payable = max(0, $fare - $discount);
// student debited $payable
// captain credited $captainShare  (= fare - commission), regardless of discount
```
The captain always receives `fare - commission`, but the student only pays `fare - discount`. Net wallet delta = `(-payable) + captainShare = discount - commission`. When **`discount > commission`** (e.g. a 50% ride coupon vs. 15% commission), this is **positive** — the wallet system gains money that was never deposited. Because there is **no platform funding wallet** in the ledger, captain credits in this case are not backed by a corresponding debit → phantom balance the platform must later honor at payout.

**Fix:** cap ride coupon discount at the platform's commission for wallet-settled rides, OR debit the discount shortfall from a real platform/treasury wallet so the ledger stays zero-sum. Add an invariant test: `sum(all wallet txn amounts) == -sum(platform revenue)`.

#### 2.7.2 Coupon redemption race — **Medium**
`CouponService::redeem()` re-checks only `limitReached()` (global cap) under the row lock. `per_user_limit` and `first_order_only` are validated in `validate()` **without** a lock and not re-checked at redeem. Two concurrent rides/payments by the same user can both pass, exceeding a per-user or first-order-only coupon.

**Fix:** re-check per-user count and first-order inside the locked `redeem()` transaction, and add a unique constraint on `(coupon_id, user_id)` where the coupon is single-use-per-user.

#### 2.7.3 Payout flow — solid, one nuance
`PayoutService::request()` debits at request time (prevents double withdrawal); the real guard is `debit()`'s locked `newBalance < 0` check, so the earlier unlocked `availableBalance()` read is safe. Reject credits funds back; approve/reject guard on `isPending()`. **Nuance:** `apply()`/`debit()` check `balance_fils`, not `availableFils()` (held funds), so a payout could technically consume funds reserved by a hold. Captains rarely have holds, so **Low** — but consider debiting against available balance.

### 2.8 OTP / MFA soundness
- **OTP** (`OtpService`): codes stored **hashed** (`Hash::make`), short TTL (300s), max 5 attempts, 60s resend cooldown, prior codes invalidated on reissue, per-code attempt counter, `hash_equals` for the universal test code. Combined with the 6/min `auth` throttle, brute-forcing a 6-digit code is infeasible. Good.
  - *Risk:* `otp.debug_return_code` and `otp.universal_code` are keyed on `APP_ENV !== 'production'`. A single env misconfiguration in prod would expose OTPs in API responses and enable a universal bypass code. **Medium** — add a hard guard (e.g. refuse to boot with a universal code when `APP_ENV=production`).
- **TOTP** (`TotpService`): correct RFC-6238 (HMAC-SHA1, 6 digits, 30s), `hash_equals` comparison, ±1 step drift, base32 decode looks correct, secrets generated with `random_int`. Recovery codes hashed at rest, consumed single-use. `mfa_secret`/`mfa_recovery_codes` are `encrypted` casts. MFA challenge is a short-lived (300s) cache token. **Sound implementation** — the only issue is the bypass in §2.2.

---

## 3. Correctness / Bugs

### 3.1 Orphaned wallet holds on trip completion — **High**
`TripService::start()` places a fare **hold** on every wallet-paying booked passenger. `TripService::end()` transitions only `Onboard → Dropped` and finalizes ride requests, but **never releases holds** for passengers who stayed `Booked` (booked, trip started, never boarded). `cancel()` releases holds; `end()` does not. Those students' funds remain reserved (`held_fils`) **indefinitely**, silently reducing their available balance.

**Fix:** in `end()`, release any active hold for passengers not captured (status still `Booked`, or any active hold referencing `trip->id` that wasn't captured). Ideally add a reconciliation/prune job for stale active holds on finalized trips.

### 3.2 Money math — correct
- All money in integer **fils**; `PricingService::splitCommission()` uses `intdiv($fare * pct, 100)` (floor) and gives the remainder to the captain — no float drift, total conserved. `computeDiscount()` uses `floor` and clamps to the amount. Good.
- *Schema inconsistency:* `wallet_transactions.amount_fils` / `balance_after` are `bigInteger`, but `trip_passengers.fare_fils`/`commission_fils`/`captain_share_fils` are `unsignedInteger` (max ~4.29B fils ≈ 4.29M JOD). Not a practical overflow risk per-ride, but standardize on `bigInteger` for money. **Low.**

### 3.3 Transaction boundaries
- Boarding (`confirmBoarding`) wraps status change + subscription consume + `chargeForBoarding` + GPS check in a transaction. Billing itself opens a nested transaction. Consistent.
- `TripService::end()` and `cancel()` perform multiple `update()`s **outside** an explicit transaction (status flip, passenger bulk update, ride-request bulk update, hold releases, notifications). A mid-sequence failure could leave a trip `Completed` while some passengers/requests aren't updated. Wrap the state transition in `DB::transaction`. **Medium.**

### 3.4 Idempotency of admin top-up
`WalletService::adminTopup()` de-dupes by `(wallet_id, type=Topup, reference)` via a locked SELECT — correct under concurrency because the wallet row is locked, but there is **no DB unique constraint** backing it. If the locking ever changes, double-credit becomes possible. Add a unique index on `(wallet_id, type, reference)` for top-ups. **Low/Medium.**

### 3.5 Edge cases
- `WalletHold.reference` column is typed `uuid` (migration), but `WalletService::hold()` accepts arbitrary `?string $reference`; a non-UUID reference would be rejected by Postgres. Currently only trip IDs (UUIDs) are passed, so OK — but brittle.
- `uniqueTripCode()` / `uniqueCode()`: 4-digit codes unique per trip (≤4 seats) — fine.
- SOS `trip_id` is validated as `uuid` but **not** checked to belong to the reporter or to exist. **Low** (data quality; see §2.6 for the abuse angle).

### 3.6 N+1 / indexing
- Query patterns are mostly eager-loaded (`with(...)`, `withCount(...)`). `TripService::cancel()` explicitly batches `User::whereIn(...)` to avoid a prior N+1 (noted in code).
- **Missing indexes** (Postgres does *not* auto-index FK columns):
  - `trip_passengers.student_id` and `trip_passengers.paid_at` — `FinancialReportService` joins/filters on these (`whereBetween('trip_passengers.paid_at', ...)`, group by zone). Reports will seq-scan as data grows. **Medium.**
  - `payments.bank_reference` — used by `fraudFlags` existence checks on every proof; only the partial-unique (status='approved') index exists. Add a plain index. **Low/Medium.**
  - `wallet_transactions.reference` — used by `adminTopup` dedupe and hold/txn lookups. **Low.**

---

## 4. Performance & Scalability

- **Queues**: `QUEUE_CONNECTION=redis`. Slow work is offloaded: GPT-Vision verification (`VerifyPaymentProofJob`, `tries=2`, `timeout=120`, `failed()` un-sticks payments) and push/critical-SMS delivery (`DeliverNotificationJob`). In-app notifications are written synchronously (cheap). Good separation; returns fast to clients.
- **Blocking in request thread**:
  - `SosService::alertSafetyTeam()` loads **all** staff users and calls `notify()` per staff synchronously (each records a DB row + dispatches a job — acceptable), and `alertEmergencyContacts()` sends **SMS synchronously** in the request. Bounded (few contacts) and justified for a safety path, but consider a dedicated high-priority queue. **Medium.**
  - `MatchingService::formTrips()` loads **all** pending ride requests into memory and groups them; runs on a 5-min schedule (`rafeeq:match-rides`), so it's off the request path. Fine at launch scale; chunk/scope by zone if volume grows.
- **Caching**: Redis cache store; permissions cached per-request; MFA challenges in cache; assistant reply cache TTL configurable. No heavy per-request cache misuse seen.
- **Pagination**: list endpoints paginate (`paginate(per_page)`), with pagination meta injected by `ApiResponse`. Note `WalletController::adminTransactions` and some admin lists use `->get()` with a `limit`, which is fine.
- **Geo**: uses **Haversine in PHP** (`GpsFraudService::haversineMeters`) for boarding-proximity and ghost-watch checks, and app-side zone geofencing. `.env.example` mentions "PostgreSQL + PostGIS" but **no PostGIS spatial columns/indexes are used** — coordinates are `decimal(10,7)` and matching is by `zone_id`/`university_id` equality, not spatial queries. For current "nearest zone" logic this is fine and avoids a PostGIS dependency; if you later do radius/nearest-driver search at scale, adopt PostGIS + GiST indexes rather than scanning lat/lng in PHP. **Low now, plan ahead.**
- `trip_tracking` growth is bounded by `rafeeq:prune-tracking` (retention config). Good.

---

## 5. Code Quality & Cleanup

- **Consistency:** high. Uniform service/controller/request/resource pattern, Arabic user-facing messages with error codes, `BusinessRuleException`/`DomainException` hierarchy, `Safely` wrapper for side-effects (audit/notifications never break business txns).
- **No TODO/FIXME/HACK, no `dd()`/`dump()`/`var_dump`** in source (grep clean — matches were doc placeholders like `07XXXXXXXX`).
- **Dead/unused:** `PaymentVerificationService` collects `amount_matches` but never uses it. `AppServiceProvider` is empty (fine). `Core/Support/Csv.php` and `SchemaDocCommand` are utilities — confirm they're referenced (SchemaDocCommand is registered as a console command; Csv is used by reports/exports — verify).
- **Duplication:** the 4-digit unique-code generator exists twice (`TripService::uniqueTripCode` and `MatchingService::uniqueCode`) with slightly different mechanics; CliQ instruction assembly is duplicated in `WalletController::topupInstructions` and `PaymentService::instructions`. Minor; consider consolidating.
- **Service location** (`app(...)`) sprinkled where constructor DI would be cleaner (noted in §1).
- **Metadata drift** in `composer.json` (Laravel 11 vs 12, PHP 8.2 vs 8.4).
- **Nothing obvious to delete for size** — the tree is lean for 32 modules; the `AI/` module is the largest surface and worth a focused review for cost controls (there are per-user/monthly token caps in `services.openai`, which is good).

---

## 6. Tests

`tests/` has **~50** files (Feature + Unit) and clearly targets the risky paths:
- **Money/wallet:** `WalletHoldTest`, `WalletReversalTest`, `WalletSubscriptionPaymentTest`, `PayoutTest`.
- **Payments/CliQ:** `PaymentApprovalIdempotencyTest`, `PaymentBankReferenceUniquenessTest`, `PaymentFraudGuardTest`, `PaymentNameVerificationTest`, `CliqSettingsTest`.
- **Auth/MFA:** `AuthGuardTest`, `PasswordAuthTest`, `MfaTest`, `BecomeDriverTest`.
- **Matching/trips/fraud:** `MatchingExpressTest`, `RoundTripMatchingTest`, `AcceptOfferRaceTest` (concurrent claim), `DropoffOtpTest`, `GpsFraudTest`, `FraudMonitorTest`, `FraudSweepCommandTest`, `ZoneGeofenceTest`.
- **Infra/misc:** `SecurityHeadersTest`, `PaginationMetaTest`, `RideRequestFinalizationTest`, SMS gateway tests, `TotpAndGeofenceTest`, `PricingServiceTest`, `SafelyTest`.

### Critical paths NOT (visibly) covered
1. **Broadcast channel authorization** — no test that a non-participant cannot subscribe to `trip.{id}` (aligns with §2.1 being unguarded). **Add once channels are made private.**
2. **Hold release on trip `end()`** — `WalletHoldTest` likely covers capture/release on cancel, but the booked-never-boarded-at-completion leak (§3.1) appears untested.
3. **MFA vs. passwordless OTP login** — `MfaTest` covers the password path; no test asserts an MFA-enabled staff user is challenged on the SMS-OTP login path (§2.2).
4. **Coupon economics invariant** — no test asserts the wallet ledger stays zero-sum when `discount > commission` (§2.7.1), nor a per-user/first-order concurrency test (§2.7.2).
5. **Transaction atomicity of `end()`/`cancel()`** — no failure-injection test for partial completion (§3.3).

---

## 7. Prioritized Fix List

**Before launch (blockers):**
1. Make trip broadcast channels **private** + add `channels.php` authorization (§2.1).
2. Release fare holds for un-boarded passengers on trip completion + stale-hold reconciler (§3.1).
3. Close the MFA passwordless-OTP bypass (§2.2).
4. Cap ride coupon discount at commission or fund it from a treasury wallet; add ledger zero-sum invariant test (§2.7.1).

**Soon (high value):**
5. Lock-safe per-user/first-order coupon checks + unique constraint (§2.7.2).
6. Wrap `TripService::end()`/`cancel()` state transitions in a transaction (§3.3).
7. Add indexes: `trip_passengers.student_id`, `trip_passengers.paid_at`, `payments.bank_reference` (§3.6).
8. Throttle + ownership-validate SOS; apply `throttle:sensitive` to payment create/proof (§2.6).

**Hardening:**
9. Hard-fail on `universal_code` / `debug_return_code` when `APP_ENV=production` (§2.8).
10. Unique index for admin top-up idempotency; standardize money columns to `bigInteger` (§3.4, §3.2).
11. Debit payouts against available (not raw) balance (§2.7.3).
12. EXIF-strip/re-encode uploaded proof images; scan PDFs (§2.5).

---

*Static analysis only; dependencies were not installed and no code was executed. Line-level references point to the files named above.*
