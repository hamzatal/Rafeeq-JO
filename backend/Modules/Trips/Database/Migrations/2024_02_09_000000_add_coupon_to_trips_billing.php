<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->string('coupon_code', 40)->nullable()->after('notes');
        });

        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->string('coupon_code', 40)->nullable()->after('captain_share_fils');
            $table->integer('coupon_discount_fils')->nullable()->after('coupon_code');
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropColumn('coupon_code');
        });
        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->dropColumn(['coupon_code', 'coupon_discount_fils']);
        });
    }
};
