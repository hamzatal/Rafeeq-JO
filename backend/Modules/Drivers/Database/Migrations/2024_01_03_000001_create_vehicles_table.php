<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('driver_id')->constrained('driver_profiles')->cascadeOnDelete();
            $table->string('make', 60);
            $table->string('model', 60);
            $table->unsignedSmallInteger('year');
            $table->string('color', 40);
            $table->string('plate_number', 30)->unique();
            $table->unsignedSmallInteger('seats')->default(4);
            $table->string('status', 30)->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
