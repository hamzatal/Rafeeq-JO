<?php

return [
    'length' => (int) env('OTP_LENGTH', 6),
    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 300),
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
    'resend_cooldown_seconds' => (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60),

    // In non-production environments, return the code in the API response
    // and allow a universal test code for QA without sending real SMS.
    'debug_return_code' => env('OTP_DEBUG_RETURN_CODE', env('APP_ENV') !== 'production'),
    'universal_code' => env('OTP_UNIVERSAL_CODE'),
];
