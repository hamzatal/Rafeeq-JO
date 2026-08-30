<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `vehicles.deleted_at` — so removing a car does not rewrite the trips it drove.
 *
 * ── Why this arrives with the delete button and not before ──────────────────────
 *
 * `DELETE /driver/vehicles/{id}` has existed since the Drivers module did, and no
 * client could reach it — so `VehicleService::delete()` being a bare `$vehicle->delete()`
 * had never mattered. Phase 9 added the button (a mistyped plate used to be permanent,
 * and a trip will not start with a car whose plate is not the authorised one), and a
 * destructive endpoint nothing could call is a guard nobody had written yet.
 *
 * `trips.vehicle_id` is `nullOnDelete`. A hard delete therefore strips the car out of
 * every trip that used it, including completed ones — and which vehicle served a ride
 * is evidence the dispute centre needs, months later, about a trip nobody remembers.
 *
 * The alternative to soft-deleting was refusing to delete any car that had ever driven,
 * which is defensible and useless: a captain who sells their car would carry it in their
 * profile forever. Soft delete keeps the history and clears the list.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
