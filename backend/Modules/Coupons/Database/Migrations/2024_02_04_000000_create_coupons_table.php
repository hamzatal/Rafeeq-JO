<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 40)->unique();
            $table->string('description', 255)->nullable();
            $table->string('type', 12);                 // percentage | fixed
            $table->integer('value');                   // percent (1-100) or fils (fixed)
            $table->integer('max_discount_fils')->nullable(); // cap for percentage
            $table->integer('min_amount_fils')->default(0);
            $table->string('scope', 20)->default('any'); // any|subscription|wallet_topup|ride
            $table->uuid('university_id')->nullable();
            $table->uuid('plan_id')->nullable();
            $table->boolean('first_order_only')->default(false);
            $table->integer('usage_limit')->nullable();  // total redemptions (null = unlimited)
            $table->integer('per_user_limit')->nullable();
            $table->integer('used_count')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'scope']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
