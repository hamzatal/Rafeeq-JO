<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Sensitive documents (driver KYC, payment proofs, parcels).
        // Defaults to local disk so it works with zero setup. For production,
        // set SECURE_DISK_DRIVER=s3 (and install league/flysystem-aws-s3-v3).
        'secure' => [
            'driver' => env('SECURE_DISK_DRIVER', 'local'),
            'root' => storage_path('app/secure'),
            'visibility' => 'private',
            'throw' => false,
            // S3 settings (used only when SECURE_DISK_DRIVER=s3)
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET', 'rafeeq-secure'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
