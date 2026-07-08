<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unified fare matrix: a fixed per-seat fare for the (residential zone ↔
 * university) pair. Because Rafeeq is campus-centric, a student living inside a
 * known zone pays the same fair, predictable price to/from their university
 * regardless of GPS micro-distance. When no matrix row exists, the app falls
 * back to distance-based pricing (PricingService).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_university_prices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('zone_id')->constrained('zones')->cascadeOnDelete();
            $table->foreignUuid('university_id')->constrained('universities')->cascadeOnDelete();
            // Fixed one-way per-seat fare (symmetric: home→university and back).
            $table->unsignedInteger('fare_fils');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique(['zone_id', 'university_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_university_prices');
    }
};
