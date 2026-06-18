<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Chat\Controllers\ChatController;

/*
|--------------------------------------------------------------------------
| Chat Module Routes  (prefix: /api/v1/chat)
| Both students and captains use these; access is authorised per-conversation.
|--------------------------------------------------------------------------
*/

Route::prefix('v1/chat')->middleware(['auth:sanctum'])->group(function () {
    Route::get('conversations', [ChatController::class, 'conversations']);
    Route::post('trips/{trip}/open', [ChatController::class, 'openForTrip']);
    Route::get('conversations/{conversation}/messages', [ChatController::class, 'messages']);
    Route::post('conversations/{conversation}/messages', [ChatController::class, 'send']);
    Route::post('conversations/{conversation}/read', [ChatController::class, 'read']);
});
