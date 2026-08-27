<?php

use Illuminate\Support\Facades\Route;
use Rafeeq\Modules\Disputes\Controllers\DisputeAdminController;

/*
 * Dispute / investigation centre.
 *
 * ── Why the write routes are split off ─────────────────────────────────────────
 *
 * The whole module used to sit behind `role:admin,supervisor` with no permission
 * middleware anywhere. `resolve` accepts `action_taken=banned`, and
 * `DisputeService::resolve()` then executes `setStatus(..., UserStatus::Banned)`
 * or `freezeSubject()` on `subject_user_id`.
 *
 * That handed a support supervisor the power to permanently ban or freeze ANY
 * account — including another staff account, since the subject is not constrained
 * — while `RolesPermissionsSeeder` deliberately withholds `users.manage` from
 * that role, with a comment explaining that managing users is admin-only. A role
 * boundary that one module quietly routes around is not a boundary.
 *
 * So: reading, opening and triaging a case stays with supervisors (that is their
 * job). Anything that changes a USER's standing needs `users.manage`.
 */
Route::prefix('v1/admin/disputes')->middleware(['auth:sanctum', 'role:admin,supervisor'])->group(function () {
    // Read + triage — a supervisor's actual work.
    Route::get('/', [DisputeAdminController::class, 'index']);
    Route::post('/', [DisputeAdminController::class, 'store']);
    Route::post('investigate', [DisputeAdminController::class, 'investigate']);
    Route::get('{dispute}', [DisputeAdminController::class, 'show']);
    Route::post('{dispute}/assign', [DisputeAdminController::class, 'assign']);
    // Closing a case with no action taken against anyone.
    Route::post('{dispute}/dismiss', [DisputeAdminController::class, 'dismiss']);

    // Acts on a USER's standing — ban, freeze, unfreeze. Admin-only in effect.
    Route::middleware('permission:users.manage')->group(function () {
        Route::post('{dispute}/resolve', [DisputeAdminController::class, 'resolve']);
        Route::post('{dispute}/freeze', [DisputeAdminController::class, 'freeze']);
        Route::post('{dispute}/unfreeze', [DisputeAdminController::class, 'unfreeze']);
    });
});
