<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ride requests carry an optional coupon code from the request through matching
 * into the trip passenger billing. The column was missing from the original
 * create migration (coupons were only added to trips/trip_passengers), which
 * broke door-to-door ride requests. This backfills it for fresh + existing DBs.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('ride_requests', 'coupon_code')) {
            return;
        }

        Schema::table('ride_requests', function (Blueprint $table) {
            $table->string('coupon_code', 40)->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('ride_requests', 'coupon_code')) {
            return;
        }

        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropColumn('coupon_code');
        });
    }
};
