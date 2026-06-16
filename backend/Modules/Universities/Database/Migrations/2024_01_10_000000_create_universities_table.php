<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('universities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name_ar', 150);
            $table->string('name_en', 150);
            $table->string('code', 20)->unique();
            $table->string('city', 80)->nullable();
            // Plain lat/lng (decimal) — works on SQLite & Postgres. PostGIS later if needed.
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('logo_path')->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('universities');
    }
};
