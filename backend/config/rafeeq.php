<?php

/*
 | Rafeeq platform business settings (money in fils, 1 JOD = 1000 fils).
 | These can later be overridden by a DB-backed settings module.
 */
return [
    // Platform commission percentage taken from each ride fare.
    'commission_percent' => (int) env('RAFEEQ_COMMISSION_PERCENT', 15),

    // Default per-seat fare for pooled (door-to-door) rides, in fils.
    'default_fare_fils' => (int) env('RAFEEQ_DEFAULT_FARE_FILS', 1000),

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
