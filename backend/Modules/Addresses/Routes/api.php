<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Addresses\Controllers\AddressController;

/*
|--------------------------------------------------------------------------
| Addresses Module Routes  (prefix: /api/v1/student/addresses)
|--------------------------------------------------------------------------
*/

Route::prefix('v1/student/addresses')->middleware(['auth:sanctum', 'role:student'])->group(function () {
    Route::get('/', [AddressController::class, 'index']);
    Route::post('/', [AddressController::class, 'store']);
    Route::patch('{address}', [AddressController::class, 'update']);
    Route::delete('{address}', [AddressController::class, 'destroy']);
    Route::post('{address}/default', [AddressController::class, 'setDefault']);
});
