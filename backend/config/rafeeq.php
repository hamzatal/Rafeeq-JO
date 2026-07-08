<?php

/*
 | Rafeeq platform business settings (money in fils, 1 JOD = 1000 fils).
 | These can later be overridden by a DB-backed settings module.
 */
return [
    // Platform commission percentage taken from each ride fare.
    'commission_percent' => (int) env('RAFEEQ_COMMISSION_PERCENT', 15),

    // Default per-seat fare for pooled (door-to-door) rides, in fils.
    // Used as a fallback when no GPS distance is available.
    'default_fare_fils' => (int) env('RAFEEQ_DEFAULT_FARE_FILS', 1000),

    // ── Distance-based pricing (Phase 3) — money in fils ────────────────────
    // Opening fare ("meter drop") added to every distance-priced ride.
    'base_fare_fils' => (int) env('RAFEEQ_BASE_FARE_FILS', 300),
    // Per-kilometre rate (GPS/Haversine distance pickup → destination).
    'per_km_fils' => (int) env('RAFEEQ_PER_KM_FILS', 250),
    // Per-minute rate (estimated from distance / avg speed unless provided).
    'per_min_fils' => (int) env('RAFEEQ_PER_MIN_FILS', 20),
    // Hard floor: no distance-priced ride is ever charged below this.
    'min_fare_fils' => (int) env('RAFEEQ_MIN_FARE_FILS', 1000),
    // Night tariff multiplier applied from `night_start_hour` onward.
    'night_multiplier' => (float) env('RAFEEQ_NIGHT_MULTIPLIER', 1.25),
    'night_start_hour' => (int) env('RAFEEQ_NIGHT_START_HOUR', 21),
    // Average urban speed (km/h) used to estimate trip minutes from distance.
    'avg_speed_kmh' => (int) env('RAFEEQ_AVG_SPEED_KMH', 30),

    // Express surcharge in fils.
    'express_fee_fils' => (int) env('RAFEEQ_EXPRESS_FEE_FILS', 1500),

    // Empty-seat economics: minimum riders before a pooled trip is "full enough".
    'min_fill_riders' => (int) env('RAFEEQ_MIN_FILL_RIDERS', 3),

    // Fair cap on dynamic surge applied to under-filled pooled trips.
    'max_surge_multiplier' => (float) env('RAFEEQ_MAX_SURGE_MULTIPLIER', 1.5),

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

    // ── Data retention ──────────────────────────────────────────────────────
    // How many days to keep raw live-location points (trip_tracking) for
    // finished trips before pruning them (keeps the table bounded).
    'tracking_retention_days' => (int) env('RAFEEQ_TRACKING_RETENTION_DAYS', 30),
];
