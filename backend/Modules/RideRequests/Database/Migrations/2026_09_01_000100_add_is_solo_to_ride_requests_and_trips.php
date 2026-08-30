<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The whole-car product becomes orderable.
 *
 * ── The gap this closes ────────────────────────────────────────────────────
 *
 * Phase 5 put `solo_fare_fils` in the tariff matrix and phase 5's `/estimate`
 * returns it, so the app could already SHOW a student the price of taking the car
 * alone. Nothing could accept that order: `ride_requests` had no way to express
 * "do not pool me", the matcher had no branch for it, and the fare it charged was
 * always the shared seat.
 *
 * A price quoted for something that cannot be bought is worse than no price. It
 * appears in the same list, with the same confidence, as the product that works.
 *
 * ── Why it is a column on both tables ─────────────────────────────────────
 *
 * On `ride_requests` because it is the rider's CHOICE, made before matching, and
 * the matcher must partition on it — a solo rider pooled with anyone is the one
 * outcome that makes the product a lie.
 *
 * On `trips` because the captain has to see it. A whole-car trip pays differently
 * and has one passenger by construction; a captain who cannot tell it apart from a
 * one-rider pooled car that failed to fill would read the fare as an error.
 *
 * ── Why the index is composite ────────────────────────────────────────────
 *
 * `MatchingService::corridors()` groups by (zone, university, direction) filtered
 * on status and now on `is_solo` and `is_express`. Postgres will not use a
 * standalone boolean index for that — the selectivity is too low — so the column
 * joins the existing status index rather than getting one of its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->boolean('is_solo')->default(false)->after('is_express');
        });

        Schema::table('trips', function (Blueprint $table) {
            $table->boolean('is_solo')->default(false)->after('is_express');
        });

        /*
         * The matcher's hot path: pending requests for one corridor, partitioned by
         * both product flags. Without `is_solo` in the index every pass would filter
         * it in memory after reading every pending row for the corridor.
         */
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->index(
                ['status', 'is_solo', 'is_express', 'zone_id', 'university_id', 'direction'],
                'ride_requests_matcher_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropIndex('ride_requests_matcher_idx');
            $table->dropColumn('is_solo');
        });

        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn('is_solo');
        });
    }
};
