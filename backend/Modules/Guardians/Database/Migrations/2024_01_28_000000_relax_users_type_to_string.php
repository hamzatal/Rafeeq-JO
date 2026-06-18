<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Guardian role introduces a new `UserType::Guardian`. The original
 * `users.type` column was a DB enum, which is brittle to extend portably
 * across PostgreSQL and SQLite. We relax it to a plain string (still guarded
 * at the application layer by the UserType enum) so new actor types can be
 * added without fragile enum-alter migrations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('type', 20)->default('student')->change();
        });
    }

    public function down(): void
    {
        // Intentionally not reverting to a DB enum: a string column is a safe
        // superset, and reverting could fail for rows using newer types.
    }
};
