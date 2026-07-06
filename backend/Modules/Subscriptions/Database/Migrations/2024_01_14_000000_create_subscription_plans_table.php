<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('university_id')->nullable()->constrained('universities')->nullOnDelete();
            $table->foreignUuid('route_id')->nullable()->constrained('routes')->nullOnDelete();
            $table->string('name', 150);
            $table->string('type', 40);
            $table->unsignedInteger('price_fils')->default(0);
            $table->unsignedInteger('rides_count')->nullable(); // null = unlimited
            $table->unsignedSmallInteger('duration_days');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
