<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name_ar', 120);
            $table->string('name_en', 120);
            $table->string('city', 80)->default('إربد')->index();
            $table->decimal('center_lat', 10, 7);
            $table->decimal('center_lng', 10, 7);
            $table->decimal('radius_km', 5, 2)->default(3.0); // grouping radius
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
