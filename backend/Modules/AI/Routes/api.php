<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\AI\Controllers\AiAdminController;
use Rafeeq\Modules\AI\Controllers\AssistantController;
use Rafeeq\Modules\AI\Controllers\SmartSuggestionsController;

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

    // Context-aware smart ride suggestions (student home). Also billed — the headline
    // is GPT-personalised — and polled on a screen the student returns to constantly.
    Route::get('assistant/suggestions', [SmartSuggestionsController::class, 'index'])
        ->middleware(['role:student', 'throttle:sensitive']);

    // Admin AI / fraud insights. The risk narrative is a completion per call, so an
    // admin holding down refresh is also spending money.
    Route::prefix('admin/ai')->middleware('permission:analytics.view')->group(function () {
        Route::get('insights', [AiAdminController::class, 'insights'])->middleware('throttle:sensitive');
        Route::get('risks', [AiAdminController::class, 'risks']);
        Route::get('risks/{userId}', [AiAdminController::class, 'risk'])->middleware('throttle:sensitive');
    });
});
