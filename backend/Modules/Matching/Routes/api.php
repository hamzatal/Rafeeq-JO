<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Matching\Controllers\MatchingController;

/*
 * Running the matcher CREATES TRIPS AND SETS THEIR FARES.
 *
 * It was gated on `role:admin,supervisor` with no permission and no throttle — so a
 * supervisor who is deliberately barred from `admin/settings/pricing` could still
 * mint priced, money-bearing rows by hand, and could do it in a loop.
 *
 * `settings.manage` is the permission that already governs the tariff matrix and the
 * pricing knobs, which makes it the right one here: forming priced trips belongs with
 * the power to set prices, not with the power to read a support queue. Throttled
 * because it is a write that fans out across every pending rider.
 */
Route::prefix('v1/admin/matching')
    ->middleware(['auth:sanctum', 'permission:settings.manage', 'throttle:sensitive'])
    ->group(function () {
        Route::post('run', [MatchingController::class, 'run']);
    });
