<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_found_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 10); // lost | found
            $table->string('category', 40)->default('general');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->foreignUuid('trip_id')->nullable();
            $table->json('images')->nullable();
            $table->string('status', 12)->default('open'); // open | matched | resolved
            $table->foreignUuid('matched_with')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('reporter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_found_items');
    }
};
