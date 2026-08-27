<?php

/*
 * ── Why the localhost patterns are environment-gated ──────────────────────────
 *
 * `supports_credentials` is true, which means a matching origin can make
 * cookie/token-bearing requests and READ the response. The localhost patterns
 * below were unconditional, so a production deployment that forgot to set
 * `CORS_ALLOWED_ORIGINS` still accepted credentialed requests from any page
 * served on the victim's own machine — and any page they visited could ask a
 * local server to make one.
 *
 * The patterns exist because Expo picks a different port on every start, so
 * enumerating them is not practical. That is a development need, so it is now a
 * development-only allowance.
 */

$localOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:19000',
];

$configured = env('CORS_ALLOWED_ORIGINS');
$isLocal = in_array(env('APP_ENV', 'production'), ['local', 'testing'], true);

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'up'],

    'allowed_methods' => ['*'],

    /*
     * Production MUST set CORS_ALLOWED_ORIGINS. If it is unset outside local, the
     * list is EMPTY rather than falling back to localhost — a deployment that
     * forgot to configure origins should refuse cross-origin calls, not quietly
     * trust the developer's laptop.
     */
    'allowed_origins' => $configured
        ? array_values(array_filter(array_map('trim', explode(',', $configured))))
        : ($isLocal ? $localOrigins : []),

    // Expo's variable ports — local development only.
    'allowed_origins_patterns' => $isLocal ? [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
    ] : [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
