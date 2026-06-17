<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_request_id')->constrained('payment_requests')->cascadeOnDelete();

            $table->string('method', 20)->default('cliq');

            // Uploaded CliQ transfer notification (proof of payment) on the secure disk.
            $table->string('proof_path')->nullable();

            // Structured data extracted from the proof image (by GPT Vision or admin).
            $table->json('extracted')->nullable(); // {amount_fils, transferred_at, reference, beneficiary}
            $table->unsignedTinyInteger('ai_confidence')->nullable(); // 0..100
            $table->string('verified_by', 10)->nullable(); // ai | admin | null

            // pending | verifying | matched | mismatch | approved | rejected
            $table->string('status', 20)->default('pending');
            $table->text('notes')->nullable();

            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index('payment_request_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
