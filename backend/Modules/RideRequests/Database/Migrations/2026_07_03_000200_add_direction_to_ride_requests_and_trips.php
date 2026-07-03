<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\RideDirection;

/**
 * Adds ride direction (home → university / university → home) to ride requests
 * and trips, so return trips can be pooled separately and a captain can pick up
 * students heading home on the way back instead of driving back empty.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ride_requests', 'direction')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                $table->string('direction', 20)->default(RideDirection::ToUniversity->value)->after('type')->index();
            });
        }

        if (Schema::hasTable('trips') && ! Schema::hasColumn('trips', 'direction')) {
            Schema::table('trips', function (Blueprint $table) {
                $table->string('direction', 20)->default(RideDirection::ToUniversity->value)->after('type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ride_requests', 'direction')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                $table->dropColumn('direction');
            });
        }
        if (Schema::hasColumn('trips', 'direction')) {
            Schema::table('trips', function (Blueprint $table) {
                $table->dropColumn('direction');
            });
        }
    }
};
