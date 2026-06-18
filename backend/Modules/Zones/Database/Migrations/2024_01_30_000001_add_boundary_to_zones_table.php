<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional polygon boundary for a zone (geofence). When present it takes
 * precedence over the center+radius circle for "which zone is this point in?".
 * Stored as a JSON array of [lat, lng] vertices. Radius stays as a fallback.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->json('boundary')->nullable()->after('radius_km');
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            $table->dropColumn('boundary');
        });
    }
};
