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

    'terms' => [
        'version' => env('RAFEEQ_TERMS_VERSION', '2026-08-26'),
        'url' => env('RAFEEQ_TERMS_URL', 'https://rafeeq.jo/legal/terms'),
        'privacy_url' => env('RAFEEQ_PRIVACY_URL', 'https://rafeeq.jo/legal/privacy'),
    ],

    // Hard ceiling on a single manual admin wallet credit, in fils. A manual
    // credit creates balance with no incoming bank transfer behind it, so it is
    // bounded here rather than trusted to the operator.
    'admin_credit_max_fils' => (int) env('RAFEEQ_ADMIN_CREDIT_MAX_FILS', 50000),

    // Platform commission percentage taken from each ride fare.
    'commission_percent' => (int) env('RAFEEQ_COMMISSION_PERCENT', 15),

    // Default per-seat fare for pooled (door-to-door) rides, in fils.
    // Used as a fallback when no GPS distance is available.

    // ── Distance-based pricing (Phase 3) — money in fils ────────────────────
    // Opening fare ("meter drop") added to every distance-priced ride.
    // Per-kilometre rate (GPS/Haversine distance pickup → destination).
    // Per-minute rate (estimated from distance / avg speed unless provided).
    // Hard floor: no distance-priced ride is ever charged below this.
    // Night tariff multiplier applied from `night_start_hour` onward.
    // Average urban speed (km/h) used to estimate trip minutes from distance.

    // Express surcharge in fils.

    // Empty-seat economics: minimum riders before a pooled trip is "full enough".
    'min_fill_riders' => (int) env('RAFEEQ_MIN_FILL_RIDERS', 3),

    // Fair cap on dynamic surge applied to under-filled pooled trips.

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
     * ── Aggregation window (phase 5.2 — not yet wired into MatchingService) ──
     * A full car dispatches immediately regardless; these only bound how long an
     * under-filled one waits.
     */
    'match_window_peak_minutes' => (int) env('RAFEEQ_MATCH_WINDOW_PEAK_MIN', 8),
    'match_window_offpeak_minutes' => (int) env('RAFEEQ_MATCH_WINDOW_OFFPEAK_MIN', 18),

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
