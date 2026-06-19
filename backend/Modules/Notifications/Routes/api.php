<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Notifications\Controllers\AdminNotificationController;
use Rafeeq\Modules\Notifications\Controllers\NotificationController;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Preferences
    Route::get('notifications/preferences', [NotificationController::class, 'preferences']);
    Route::patch('notifications/preferences', [NotificationController::class, 'updatePreferences']);

    // Device tokens (push)
    Route::post('notifications/devices', [NotificationController::class, 'registerDevice']);
    Route::delete('notifications/devices', [NotificationController::class, 'unregisterDevice']);
});

// ── Admin: broadcast notifications to user segments (permission: users.manage) ──
Route::prefix('v1/admin/notifications')->middleware(['auth:sanctum', 'permission:users.manage'])->group(function () {
    Route::get('audience', [AdminNotificationController::class, 'audience']);
    Route::post('send', [AdminNotificationController::class, 'send']);
});
