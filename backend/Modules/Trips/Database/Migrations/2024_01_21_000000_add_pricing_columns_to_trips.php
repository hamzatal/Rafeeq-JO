<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persist the fare breakdown computed by PricingService at trip-formation time
 * so pooled/express fares are transparent and auditable (no flat-rate guessing):
 *  - is_express        : urgent ride with surcharge + priority matching
 *  - base_fare_fils    : per-seat base before surge/express
 *  - express_fee_fils  : flat express surcharge (0 for scheduled/pooled)
 *  - surge_multiplier  : bounded dynamic multiplier for under-filled trips
 * `fare_fils` (existing) remains the final per-seat fare actually charged.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->boolean('is_express')->default(false)->after('type');
            $table->unsignedInteger('base_fare_fils')->default(0)->after('fare_fils');
            $table->unsignedInteger('express_fee_fils')->default(0)->after('base_fare_fils');
            $table->decimal('surge_multiplier', 4, 2)->default(1.00)->after('express_fee_fils');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn(['is_express', 'base_fare_fils', 'express_fee_fils', 'surge_multiplier']);
        });
    }
};
