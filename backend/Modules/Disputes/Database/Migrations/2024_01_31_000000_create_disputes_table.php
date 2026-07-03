<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\RiskSeverity;

/**
 * Dispute / investigation case file. Aggregates anti-fraud evidence
 * (risk flags, cancellation logs, GPS ghost-trip watches) for a subject
 * account and tracks the staff workflow + action taken.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disputes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subject_user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('trip_id')->nullable()->index();
            $table->string('type', 40);                       // risk_threshold | collusion | ghost_trip | sos | manual
            $table->string('status', 20)->default('open')->index(); // open | investigating | resolved | dismissed
            $table->string('severity', 40)->default(RiskSeverity::Medium->value);
            $table->unsignedSmallInteger('risk_score')->nullable();
            $table->text('summary')->nullable();
            $table->foreignUuid('opened_by')->nullable()->constrained('users')->nullOnDelete(); // null = system
            $table->foreignUuid('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action_taken', 20)->nullable();   // frozen | warning | cleared | banned | none
            $table->text('resolution')->nullable();
            $table->foreignUuid('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['subject_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('disputes');
    }
};
