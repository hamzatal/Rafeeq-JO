<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\AI\Controllers\AiAdminController;
use Rafeeq\Modules\AI\Controllers\AssistantController;
use Rafeeq\Modules\AI\Controllers\SmartSuggestionsController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Rafeeq Assistant (any authenticated user)
    Route::get('assistant/conversations', [AssistantController::class, 'conversations']);
    Route::get('assistant/conversations/{conversation}', [AssistantController::class, 'messages']);
    Route::post('assistant/send', [AssistantController::class, 'send']);

    // Context-aware smart ride suggestions (student home)
    Route::get('assistant/suggestions', [SmartSuggestionsController::class, 'index'])->middleware('role:student');

    // Admin AI / fraud insights
    Route::prefix('admin/ai')->middleware('permission:analytics.view')->group(function () {
        Route::get('insights', [AiAdminController::class, 'insights']);
        Route::get('risks', [AiAdminController::class, 'risks']);
        Route::get('risks/{userId}', [AiAdminController::class, 'risk']);
    });
});
