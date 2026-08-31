<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\AI\Controllers\AiAdminController;
use Rafeeq\Modules\AI\Controllers\AssistantController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Rafeeq Assistant (any authenticated user). Reads are cheap and unthrottled
    // beyond the global limit; the one endpoint that spends money is not.
    Route::get('assistant/conversations', [AssistantController::class, 'conversations']);
    Route::get('assistant/conversations/{conversation}', [AssistantController::class, 'messages']);

    /*
     * The only endpoint in this file that costs money per call, and it was the only
     * billed endpoint in the codebase without `throttle:sensitive`.
     *
     * The global limit is 120 requests/minute/user. One assistant turn is up to four
     * model round-trips (the tool-calling loop), and if the model calls
     * `create_support_ticket` that ticket runs its own triage completion. So a single
     * account could drive several hundred paid completions a minute — and the monthly
     * token cap would not notice in time, because it is checked once before the turn
     * and its counter is cached for 30 seconds, so concurrent requests all read the
     * same stale under-count.
     *
     * `throttle:sensitive` is 20/minute, the same ceiling already applied to coupon
     * validation, payment proofs, SOS and lost-and-found candidate ranking — the last
     * of which carries a comment describing exactly this bug class. This route simply
     * got missed.
     */
    Route::post('assistant/send', [AssistantController::class, 'send'])
        ->middleware('throttle:sensitive');

    // Admin AI / fraud insights. The risk narrative is a completion per call, so an
    // admin holding down refresh is also spending money.
    Route::prefix('admin/ai')->middleware('permission:analytics.view')->group(function () {
        /*
         * The counts with NO completion behind them — for the sidebar badges.
         *
         * They used to read them out of `insights` below, which meant four integers in
         * the dashboard shell cost a GPT call, and twenty page loads tripped
         * `throttle:sensitive`. The resulting 429 propagated into a forced sign-out.
         *
         * Unthrottled deliberately: it is three `count(*)` queries, the same cost as any
         * other list endpoint on the dashboard, and rate-limiting the shell is what
         * caused the outage this splits apart.
         */
        Route::get('counts', [AiAdminController::class, 'counts']);
        Route::get('insights', [AiAdminController::class, 'insights'])->middleware('throttle:sensitive');
        Route::get('risks', [AiAdminController::class, 'risks']);
        Route::get('risks/{userId}', [AiAdminController::class, 'risk'])->middleware('throttle:sensitive');
    });
});
