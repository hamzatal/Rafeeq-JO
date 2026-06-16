<?php

return [
    /*
    | Third-party integrations used across the platform.
    */

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'organization' => env('OPENAI_ORGANIZATION'),
        'chat_model' => env('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
        'vision_model' => env('OPENAI_VISION_MODEL', 'gpt-4o'),
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'timeout' => (int) env('OPENAI_TIMEOUT', 60),
        'max_monthly_tokens' => (int) env('OPENAI_MAX_MONTHLY_TOKENS', 50_000_000),
    ],

    'cliq' => [
        // Manual transfer + GPT-Vision verification (Phase 3).
        'alias' => env('CLIQ_ALIAS'),
        'bank_name' => env('CLIQ_BANK_NAME'),
        'beneficiary_name' => env('CLIQ_BENEFICIARY_NAME'),
        'request_ttl_minutes' => (int) env('CLIQ_REQUEST_TTL', 1440),
    ],

    'firebase' => [
        'credentials' => env('FIREBASE_CREDENTIALS'),
        'project_id' => env('FIREBASE_PROJECT_ID'),
    ],

    'sms' => [
        'driver' => env('SMS_DRIVER', 'log'),
        'sender_id' => env('SMS_SENDER_ID', 'Rafeeq'),
        'api_key' => env('SMS_API_KEY'),
        'base_url' => env('SMS_BASE_URL'),
    ],

    'maps' => [
        'provider' => env('MAPS_PROVIDER', 'google'),
        'google_key' => env('GOOGLE_MAPS_KEY'),
        'mapbox_token' => env('MAPBOX_TOKEN'),
    ],
];
