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
});
