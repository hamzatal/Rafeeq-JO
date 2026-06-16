<?php

use Illuminate\Support\Facades\Route as Router;
use Rafeeq\Modules\Routes\Controllers\RouteController;

Router::prefix('v1')->middleware('auth:sanctum')->group(function () {
    // Public (authenticated) read
    Router::get('routes', [RouteController::class, 'index']);
    Router::get('routes/{route}', [RouteController::class, 'show']);

    // Admin management
    Router::middleware('role:admin,supervisor')->group(function () {
        Router::post('admin/routes', [RouteController::class, 'store']);
        Router::patch('admin/routes/{route}', [RouteController::class, 'update']);
        Router::delete('admin/routes/{route}', [RouteController::class, 'destroy']);
    });
});
