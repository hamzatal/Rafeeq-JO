<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a guardian (parent) user to a student they are authorised to follow.
 * A student manages their own guardians, so a link created by the student is
 * active immediately; guardians may also be invited (pending) and accept.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardian_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('guardian_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('relation', 30)->default('parent'); // parent / father / mother / sibling / other
            $table->string('status', 20)->default('active');   // active / pending / revoked
            $table->boolean('notify_on_board')->default(true);
            $table->boolean('notify_on_dropoff')->default(true);
            $table->boolean('notify_on_sos')->default(true);
            $table->timestamps();

            $table->unique(['guardian_user_id', 'student_user_id']);
            $table->index(['student_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guardian_links');
    }
};
