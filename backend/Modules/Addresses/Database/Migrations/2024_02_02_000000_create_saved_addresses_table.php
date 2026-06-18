<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Student saved places (Home / University / custom) used to pre-fill pickup
 * points when requesting a ride — matches the "العناوين المحفوظة" screen.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label', 30)->default('other'); // home / university / other
            $table->string('title', 120)->nullable();
            $table->string('address_text', 255);
            $table->double('lat')->nullable();
            $table->double('lng')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_addresses');
    }
};
