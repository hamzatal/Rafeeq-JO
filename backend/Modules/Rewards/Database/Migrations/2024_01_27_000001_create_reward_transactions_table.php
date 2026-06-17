<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reward_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('account_id')->constrained('reward_accounts')->cascadeOnDelete();
            $table->string('type', 10); // earn | redeem
            $table->integer('points');  // signed (+earn / -redeem)
            $table->string('reason');
            $table->string('reference')->nullable();
            $table->timestamps();

            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_transactions');
    }
};
