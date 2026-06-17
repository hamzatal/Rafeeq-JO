<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number', 20)->unique(); // TKT-YYYY-#####
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('subject');
            $table->string('status', 20)->default('open');
            $table->string('priority', 10)->default('normal');
            $table->unsignedTinyInteger('level')->default(1); // 1=AI, 2=agent, 3=supervisor, 4=admin
            $table->foreignUuid('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'level']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
