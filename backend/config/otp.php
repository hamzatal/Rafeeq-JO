<?php

return [
    'length' => (int) env('OTP_LENGTH', 6),
    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 300),
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
    'resend_cooldown_seconds' => (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60),

    // In non-production environments, return the code in the API response
    // and allow a universal test code for QA without sending real SMS.
    //
    // HARD PRODUCTION GUARD: these QA aids are FORCE-DISABLED whenever
    // APP_ENV=production, regardless of any env override — so a single
    // misconfiguration can never leak live OTPs or enable a bypass code.
    'debug_return_code' => env('APP_ENV') === 'production'
        ? false
        : (bool) env('OTP_DEBUG_RETURN_CODE', true),
    'universal_code' => env('APP_ENV') === 'production'
        ? null
        : env('OTP_UNIVERSAL_CODE'),
];
