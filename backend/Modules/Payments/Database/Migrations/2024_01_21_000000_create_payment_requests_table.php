<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Human-readable reference shown to the user: RFQ-YYYY-#####
            $table->string('number', 20)->unique();

            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();

            // What is being paid for (polymorphic): subscription | wallet_topup | parcel ...
            $table->string('payable_type')->nullable();
            $table->uuid('payable_id')->nullable();
            $table->string('purpose', 30); // subscription | wallet_topup

            $table->bigInteger('amount_fils'); // expected amount in fils
            $table->string('currency', 3)->default('JOD');
            $table->string('method', 20)->default('cliq');

            // pending | submitted | under_review | approved | rejected | expired
            $table->string('status', 20)->default('pending');

            $table->text('reject_reason')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['payable_type', 'payable_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_requests');
    }
};
