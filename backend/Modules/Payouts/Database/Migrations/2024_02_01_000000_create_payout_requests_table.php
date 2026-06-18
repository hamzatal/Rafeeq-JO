<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Captain earnings withdrawal ("سحب الأرباح"). On request, the amount is
 * debited from the captain's wallet (reserved) and the platform pays it out
 * via CliQ. Admin marks it paid, or rejects it (funds are credited back).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('captain_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('amount_fils');
            $table->string('method', 20)->default('cliq');
            $table->string('destination', 100)->nullable(); // CliQ alias / phone
            $table->string('status', 20)->default('pending'); // pending / paid / rejected
            $table->string('note', 255)->nullable();
            $table->string('admin_note', 255)->nullable();
            $table->uuid('processed_by')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['captain_user_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_requests');
    }
};
