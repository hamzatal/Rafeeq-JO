<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\RiskSeverity;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risk_flags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 80)->index();        // e.g. driver_cancel_with_passengers
            $table->enum('severity', RiskSeverity::values())->index();
            $table->string('description', 255)->nullable();
            $table->jsonb('meta')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'resolved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('risk_flags');
    }
};
