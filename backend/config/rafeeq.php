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
];
