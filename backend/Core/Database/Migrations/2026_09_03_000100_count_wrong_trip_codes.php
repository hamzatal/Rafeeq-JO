<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `trips.code_attempts` — how many wrong confirmation codes this trip has absorbed.
 *
 * `throttle:trip-code` bounds the RATE of guesses (6 a minute per captain and trip).
 * It does not bound the TOTAL, so nothing stopped a captain from spending an entire
 * 30-minute trip guessing — ~180 attempts, which against the old 4-digit code was a
 * 1.8% chance of confirming a drop-off for a rider who never got out. And because the
 * only record of a miss was an audit row, nobody was counting.
 *
 * A counter on the trip is the right home for it rather than a cache key: it survives
 * a worker restart, it is visible to the dispute centre next to the trip it belongs
 * to, and it resets on the next SUCCESSFUL confirmation — so honest typing never
 * accumulates toward the cap across a whole shift.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->unsignedSmallInteger('code_attempts')->default(0)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn('code_attempts');
        });
    }
};
