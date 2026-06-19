<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_requests', function (Blueprint $table) {
            $table->uuid('coupon_id')->nullable()->after('payable_id');
            $table->integer('discount_fils')->default(0)->after('amount_fils');
        });
    }

    public function down(): void
    {
        Schema::table('payment_requests', function (Blueprint $table) {
            $table->dropColumn(['coupon_id', 'discount_fils']);
        });
    }
};
