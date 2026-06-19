<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
| Each module registers its own route file via its ServiceProvider using
| Route::middleware('api')->prefix('api/v1')->group(...). This file only
| holds platform-level routes that don't belong to a single module.
*/

Route::prefix('v1')->group(function () {
    Route::get('/ping', fn () => response()->json([
        'data' => [
            'service' => 'rafeeq-api',
            'status' => 'ok',
            'time' => now()->toIso8601String(),
        ],
        'message' => 'pong',
    ]));

    /*
     | Public client bootstrap config. Lets every app (student/captain/admin)
     | read runtime settings — notably the Maps provider + client key — from a
     | single place (backend .env) instead of baking keys into each app build.
     | The Maps JS key is a client key (restricted by referrer/package) so it is
     | safe to expose here.
     */
    Route::get('/config', fn () => response()->json([
        'data' => [
            'maps' => [
                'provider' => config('services.maps.provider', 'google'),
                'key' => (string) config('services.maps.google_key', ''),
                'mapbox_token' => (string) config('services.maps.mapbox_token', ''),
                'default_center' => ['lat' => 32.5556, 'lng' => 35.85], // Irbid
            ],
            'features' => [
                'realtime' => config('broadcasting.default') === 'reverb',
            ],
        ],
        'message' => 'ok',
    ]));
});
