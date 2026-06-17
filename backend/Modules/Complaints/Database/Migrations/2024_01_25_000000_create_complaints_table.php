<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number', 20)->unique(); // CMP-YYYY-#####
            $table->foreignUuid('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('against_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('against_type', 10)->nullable(); // driver | student
            $table->foreignUuid('trip_id')->nullable();
            $table->string('category', 30);
            $table->string('severity', 10)->default('low'); // low|medium|high|critical
            $table->string('status', 20)->default('open');
            $table->text('description');
            $table->json('ai_report')->nullable();
            $table->text('resolution')->nullable();
            $table->foreignUuid('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'severity']);
            $table->index('against_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
