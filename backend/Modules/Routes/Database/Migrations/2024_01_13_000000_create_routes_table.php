<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('university_id')->constrained('universities')->cascadeOnDelete();
            $table->foreignUuid('from_area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->string('name', 150);
            $table->unsignedInteger('price_fils')->default(0); // price in fils
            $table->unsignedSmallInteger('capacity')->default(4); // private car
            $table->json('days')->nullable();            // e.g. [0,1,2,3,4] (Sun..Thu)
            $table->string('departure_time', 5)->nullable(); // "07:30"
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
