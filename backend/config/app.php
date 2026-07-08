<?php

return [
    'name' => env('APP_NAME', 'Rafeeq'),
    'env' => env('APP_ENV', 'production'),

    // Deployed release version — surfaced by the /api/v1/health probe so ops can
    // confirm which build is live. Set APP_VERSION at deploy time (e.g. git tag).
    'version' => env('APP_VERSION', '1.0.0'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    'timezone' => env('APP_TIMEZONE', 'Asia/Amman'),
    'locale' => env('APP_LOCALE', 'ar'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),
    'faker_locale' => env('APP_FAKER_LOCALE', 'ar_JO'),

    'cipher' => 'AES-256-CBC',
    'key' => env('APP_KEY'),
    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],

    'maintenance' => [
        'driver' => env('APP_MAINTENANCE_DRIVER', 'file'),
        'store' => env('APP_MAINTENANCE_STORE', 'database'),
    ],

    'supported_locales' => ['ar', 'en'],
];
