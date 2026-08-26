<?php

/*
 | The OTP code is never returned to the client and there is no universal
 | bypass code, in any environment. Both were previously enabled by default and
 | guarded only by a literal string comparison against APP_ENV, so any value
 | other than the exact word "production" (prod, Production, staging) turned
 | full account takeover into a single request: ask for an OTP for any phone
 | number and read the code straight out of the response.
 |
 | In local development the code is read from the SMS log line instead.
 */

return [
    'length' => (int) env('OTP_LENGTH', 6),
    'ttl_seconds' => (int) env('OTP_TTL_SECONDS', 300),
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
    'resend_cooldown_seconds' => (int) env('OTP_RESEND_COOLDOWN_SECONDS', 60),

    // Not configurable. See the note at the top of this file.
    'debug_return_code' => false,
    'universal_code' => null,
];
