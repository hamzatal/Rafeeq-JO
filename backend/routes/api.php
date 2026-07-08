<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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
    // Shallow liveness probe — "is the app process up?" (no dependencies touched).
    Route::get('/ping', fn () => response()->json([
        'data' => [
            'service' => 'rafeeq-api',
            'status' => 'ok',
            'time' => now()->toIso8601String(),
        ],
        'message' => 'pong',
    ]));

    /*
     | Deep readiness probe — "can this instance actually serve traffic?"
     | Verifies the critical dependencies (database + cache) and reports each
     | component. Returns 200 when healthy, 503 when degraded so a load
     | balancer / orchestrator pulls the instance out of rotation.
     */
    Route::get('/health', function () {
        $checks = [];

        try {
            DB::select('select 1');
            $checks['database'] = 'ok';
        } catch (Throwable) {
            $checks['database'] = 'fail';
        }

        try {
            Cache::put('health:probe', '1', 5);
            $checks['cache'] = Cache::get('health:probe') === '1' ? 'ok' : 'fail';
        } catch (Throwable) {
            $checks['cache'] = 'fail';
        }

        $healthy = ! in_array('fail', $checks, true);

        return response()->json([
            'data' => [
                'service' => 'rafeeq-api',
                'status' => $healthy ? 'healthy' : 'degraded',
                'version' => (string) config('app.version'),
                'checks' => $checks,
                'time' => now()->toIso8601String(),
            ],
            'message' => $healthy ? 'ok' : 'degraded',
        ], $healthy ? 200 : 503);
    });

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
