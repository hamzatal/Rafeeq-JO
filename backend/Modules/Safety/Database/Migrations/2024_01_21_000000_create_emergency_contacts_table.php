<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emergency_contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('phone', 20);                 // normalized E.164 (+9627XXXXXXXX)
            $table->string('relation', 40)->nullable();  // parent / sibling / friend / other
            $table->boolean('is_primary')->default(false);
            $table->boolean('notify_on_sos')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emergency_contacts');
    }
};
