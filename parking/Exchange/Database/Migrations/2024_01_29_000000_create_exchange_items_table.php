<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exchange_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20)->default('book'); // book | notes | tool | other
            $table->string('title');
            $table->string('condition', 10)->default('good'); // new | good | fair
            $table->text('description')->nullable();
            $table->json('images')->nullable();
            $table->bigInteger('price_fils')->nullable(); // null = free/swap
            $table->string('status', 12)->default('available'); // available | reserved | closed
            $table->foreignUuid('reserved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('owner_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_items');
    }
};
