<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_points', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->foreignUuid('university_id')->nullable()->constrained('universities')->nullOnDelete();
            $table->string('name_ar', 120);
            $table->string('name_en', 120);
            $table->string('landmark', 200)->nullable();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_points');
    }
};
