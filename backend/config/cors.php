<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],

    'allowed_methods' => ['*'],

    // Explicit origins (production should set CORS_ALLOWED_ORIGINS in .env).
    'allowed_origins' => explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:19000'
    )),

    // Dev convenience: allow any localhost / 127.0.0.1 port (Expo uses variable ports).
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
