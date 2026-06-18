<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * GPS-based anti-fraud (ghost-trip detection).
 *
 * - driver_locations: captain device pings (independent of a specific trip),
 *   so we can keep watching a captain right AFTER they cancel a trip.
 * - ghost_trip_watches: when a captain cancels a trip that had riders, we open
 *   a time-boxed "watch" snapshotting the pickup points. If the captain is then
 *   seen lingering near those same pickups, it's a strong signal they cancelled
 *   on-platform but drove the students off-platform (commission leakage).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('driver_id')->constrained('driver_profiles')->cascadeOnDelete();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->decimal('speed', 6, 2)->nullable();
            $table->timestamp('recorded_at')->index();

            $table->index(['driver_id', 'recorded_at']);
        });

        Schema::create('ghost_trip_watches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignUuid('driver_id')->constrained('driver_profiles')->cascadeOnDelete();
            // Snapshot of pickup points to watch: [{lat,lng,student_id}, ...]
            $table->json('pickups');
            $table->boolean('resolved')->default(false)->index();
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->index(['driver_id', 'resolved']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ghost_trip_watches');
        Schema::dropIfExists('driver_locations');
    }
};
