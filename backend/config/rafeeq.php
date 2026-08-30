<?php

/*
 | Rafeeq platform business settings (money in fils, 1 JOD = 1000 fils).
 | These can later be overridden by a DB-backed settings module.
 */
return [

    /*
     * Minimum age: 18, Jordan's age of majority.
     *
     * Not a preference. Under 18 a rider cannot form a binding contract for the
     * fares, commissions and no-show fees this platform charges, and a guardian
     * consent flow is a legal instrument that needs a Jordanian lawyer to draft —
     * so the rule is a hard floor rather than a flow. Enforced at registration and
     * asserted by test.
     */
    'min_age' => (int) env('RAFEEQ_MIN_AGE', 18),

    /*
     * Terms of service version.
     *
     * Bumping this invalidates every stored acceptance, so users are asked again.
     * Every money movement in this codebase needs a contractual basis, and that
     * basis has to be a specific version the user demonstrably accepted — not
     * "they agreed once".
     */
    /*
     * How much commission a captain may owe before they stop receiving trips.
     *
     * Cash inverts the money flow: the captain holds the whole fare and owes us the
     * commission, so every cash trip makes the platform a creditor. Without a ceiling
     * a captain could run cash-only indefinitely and never settle — the platform would
     * be extending unsecured credit to an unbounded number of drivers.
     *
     * 10 dinars is roughly a full day of commission at the mid band, so a captain can
     * work a normal day on cash and settle at the end of it. The block is on going
     * online, not on finishing a trip in progress: stranding a rider mid-journey to
     * collect a debt would be indefensible.
     */
    'captain_debt_ceiling_fils' => (int) env('RAFEEQ_CAPTAIN_DEBT_CEILING_FILS', 10000),

    /*
     * The legal documents, and which version of them a user agreed to.
     *
     * `url` and `privacy_url` were defined here and read NOWHERE — while the apps
     * carried their own copies in `packages/shared/src/utils/legal.ts`, defaulted from
     * `EXPO_PUBLIC_LEGAL_BASE_URL`. Two sources for the same four links, so a staging
     * deployment that changed one and not the other shipped an app whose privacy link
     * pointed at production. Both stores require a REACHABLE privacy policy, and under
     * PDPL a notice the user cannot read is not a notice.
     *
     * They are now served by `GET /v1/config`, which every app already calls at start-up
     * for the maps key. The app keeps its compile-time values as a fallback, so a
     * failed config fetch degrades to a working link rather than to none.
     */
    'legal' => [
        'version' => env('RAFEEQ_TERMS_VERSION', '2026-08-26'),
        'base_url' => rtrim((string) env('RAFEEQ_LEGAL_BASE_URL', 'https://rafeeq.jo/legal'), '/'),
    ],

    // Hard ceiling on a single manual admin wallet credit, in fils. A manual
    // credit creates balance with no incoming bank transfer behind it, so it is
    // bounded here rather than trusted to the operator.
    'admin_credit_max_fils' => (int) env('RAFEEQ_ADMIN_CREDIT_MAX_FILS', 50000),

    // The same argument for the SELF-SERVICE top-up, which had a floor and no ceiling
    // — and which `runVerification()` can auto-approve into a wallet credit with no
    // human in the path. 200 JOD is far above any student top-up and far below a
    // number worth laundering through a vision model.
    'topup_max_fils' => (int) env('RAFEEQ_TOPUP_MAX_FILS', 200000),

    /*
     * Where a failed scheduled command reports.
     *
     * `routes/console.php` read `env('OPS_ALERT_EMAIL')` directly — the only two
     * `env()` calls anywhere outside `config/`. Under `php artisan config:cache`, which
     * is the normal containerised posture, `env()` outside config returns null: the
     * failure alerts for retention pruning and the nightly backup went nowhere, and
     * silently. That is the failure mode that hides every other failure.
     */
    'ops_alert_email' => env('OPS_ALERT_EMAIL'),

    /*
     * ── What used to be here ─────────────────────────────────────────────────
     *
     * Nine keys describing a distance-and-duration meter — opening fare, per-km,
     * per-minute, minimum fare, average speed, night multiplier, night start hour,
     * max surge — were deleted in phase 5, and their COMMENTS were left behind
     * dangling above no keys at all. That reads, to the next person, like a block of
     * settings that failed to load.
     *
     * The pricing keys now live in one block further down, under «التعرفة». There is
     * no per-km rate because the fare is a lookup in the (zone × university) matrix,
     * and no surge or night multiplier because both charge above the approved tariff.
     *
     * `min_fill_riders` was ALSO declared here, duplicating the one below. PHP keeps
     * the last of two identical keys silently, so this one was dead — and editing its
     * default would have changed nothing, which is the kind of bug that costs an hour.
     */

    // ── GPS anti-fraud thresholds ───────────────────────────────────────────
    // Max distance (m) allowed between the captain and a rider's pickup at the
    // moment boarding is confirmed; beyond this is a location mismatch.
    'gps_boarding_mismatch_meters' => (int) env('RAFEEQ_GPS_BOARDING_MISMATCH_METERS', 400),

    // After a captain cancels a trip with riders, how long (minutes) we keep
    // watching their location near the cancelled pickups for a ghost trip.
    'ghost_watch_minutes' => (int) env('RAFEEQ_GHOST_WATCH_MINUTES', 30),

    // How close (m) the captain must come to a watched pickup to trigger a
    // ghost-trip flag.
    'ghost_watch_radius_meters' => (int) env('RAFEEQ_GHOST_WATCH_RADIUS_METERS', 250),

    /*
     * ── Data retention ──────────────────────────────────────────────────────
     *
     * Deliberately NOT configurable here. Every retention period lives in
     * Rafeeq\Core\Retention\RetentionPolicy, next to the reason it is that number,
     * because the privacy notice makes those durations a promise to the user.
     *
     * `RAFEEQ_TRACKING_RETENTION_DAYS` used to sit here and silently override the
     * published 30-day window from an environment variable — a promise that can be
     * changed without a code review, a test, or a document update is not a promise.
     */

    /*
     * ── Pricing ──────────────────────────────────────────────────────────────
     *
     * The TARIFF itself is NOT here. Six bands with a seat price and a whole-car
     * price live in `Modules\Matching\Data\Tariff`, versioned, because the
     * regulator approves a tariff and an env var must not be able to change one
     * (roadmap decision 17: «التعرفة بيانات لا كود»).
     *
     * Deleted in phase 5, and each deletion matters:
     *   per_km_fils · per_min_fils · avg_speed_kmh — distance/time pricing made
     *     the fare unquotable in advance, which is the product.
     *   night_multiplier · night_start_hour — charging above the approved tariff
     *     is a regulatory offence in Jordan (decision 18).
     *   max_surge_multiplier — surge charged the RIDER for our failure to fill a
     *     car. The captain is protected by the guarantee below instead.
     */

    // Platform commission taken from each seat fare. The captain keeps the rest,
    // and `PricingService::splitCommission` floors the commission so the rounding
    // remainder falls on the platform's side rather than the captain's. This is
    // also what funds the guarantee below.
    'commission_percent' => (int) env('RAFEEQ_COMMISSION_PERCENT', 15),

    // Priority surcharge for an express (urgent) request. NOT surge: it is a
    // published fee for a different product, chosen by the rider up front.
    'express_fee_fils' => (int) env('RAFEEQ_EXPRESS_FEE_FILS', 1500),

    // Fallback seat price when a corridor has no approved matrix row yet.
    'default_fare_fils' => (int) env('RAFEEQ_DEFAULT_FARE_FILS', 1500),

    // Riders below which a car is not worth a captain's time. Drives the
    // aggregation window and the guarantee — never the price.
    'min_fill_riders' => (int) env('RAFEEQ_MIN_FILL_RIDERS', 3),

    /*
     * ── Captain minimum guarantee ────────────────────────────────────────────
     * Paid out of OUR commission when a car dispatches under-filled. Capped three
     * ways (off-peak only, daily cap, below min-fill) because PRICING.md §3 shows
     * a one-rider trip costs the platform 2.000 net — «الدعم وحده يُفلس المنصّة».
     */
    'captain_guarantee_fils' => (int) env('RAFEEQ_CAPTAIN_GUARANTEE_FILS', 3500),
    'captain_guarantee_daily_cap' => (int) env('RAFEEQ_CAPTAIN_GUARANTEE_DAILY_CAP', 2),

    /*
     * ── Aggregation window ───────────────────────────────────────────────────
     * Read by Matching\Data\PeakWindows, which MatchingService::readyToDispatch
     * consults. A full car dispatches immediately regardless, and so does a car
     * whose departure is due; these only bound how long an under-filled one waits
     * for company.
     */
    'match_window_peak_minutes' => (int) env('RAFEEQ_MATCH_WINDOW_PEAK_MIN', 8),
    'match_window_offpeak_minutes' => (int) env('RAFEEQ_MATCH_WINDOW_OFFPEAK_MIN', 18),

    /*
     * ── Timeouts for states that were never closing ──────────────────────────
     *
     * Both read by `rafeeq:expire-stale`.
     *
     * `trip_accept_grace_minutes` — how long past its departure a pooled trip waits
     * for a captain before it is cancelled and its riders released. Nothing used to
     * close these at all, so an unaccepted trip held its riders' wallet balances
     * frozen indefinitely. Fifteen minutes is short on purpose: past that the rider
     * has already made another plan, and holding their money is the real harm.
     *
     * `ride_request_expiry_grace_minutes` — how long past its desired time a request
     * survives. Deliberately longer than the trip grace, so a rider returned to the
     * pool by a cancelled trip gets at least one more matcher cycle. Expiring a
     * request that could still have been served is worse than expiring it late.
     */
    'trip_accept_grace_minutes' => (int) env('RAFEEQ_TRIP_ACCEPT_GRACE_MIN', 15),
    'ride_request_expiry_grace_minutes' => (int) env('RAFEEQ_RIDE_REQUEST_EXPIRY_GRACE_MIN', 45),

    // ── Operations ──────────────────────────────────────────────────────────
    // Failed jobs in the last 24h before `rafeeq:worker-alive --alert-on-failures`
    // exits non-zero. Not zero: one transient FCM timeout is noise, and an alarm
    // that cries every night is an alarm that gets muted.
    'failed_jobs_alert_threshold' => (int) env('RAFEEQ_FAILED_JOBS_ALERT_THRESHOLD', 10),

    /*
     * ── Bounded work ────────────────────────────────────────────────────────
     *
     * Batch sizes for anything that walks a table which grows with usage. These
     * exist because the matcher loaded EVERY pending ride request into memory and
     * then made two more in-memory copies of it while grouping — fine at 40
     * requests, fatal at 40,000, and the failure mode is the matcher dying at the
     * busiest moment of the morning.
     */

    // Ride requests loaded per pooling group. A group is one
    // (zone × university × direction × express) tuple, so this is the ceiling on
    // riders considered for one corridor in one pass, not on the whole queue.
    'matching_batch_size' => (int) env('RAFEEQ_MATCHING_BATCH_SIZE', 500),

    // Staff loaded per chunk when fanning an alert out to the safety team.
    'staff_alert_chunk' => (int) env('RAFEEQ_STAFF_ALERT_CHUNK', 100),

    // Recipients loaded per chunk for an admin broadcast.
    'broadcast_chunk' => (int) env('RAFEEQ_BROADCAST_CHUNK', 200),
];
