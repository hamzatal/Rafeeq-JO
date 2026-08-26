<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Three compliance columns the schema had no way to express.
 *
 * `date_of_birth` — the minimum age is 18, Jordan's age of majority, and the code
 * had no field to enforce it with. A platform that moves money and puts a minor in
 * a stranger's vehicle cannot treat age as unknown.
 *
 * `terms_version` / `terms_accepted_at` — every fare, commission and no-show fee in
 * this codebase needs a contractual basis, and "the user must have agreed at some
 * point" is not one. Recording WHICH version was accepted and WHEN is what makes a
 * later dispute answerable, and it is what forces re-consent when the terms change.
 *
 * `anonymized_at` — a soft delete leaves the name, phone and email in place, so
 * "delete my account" did not delete anything. This marks the row as erased so the
 * erasure is auditable and cannot be silently skipped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('date_of_birth')->nullable()->after('email');
            $table->string('terms_version', 20)->nullable()->after('locale');
            $table->timestamp('terms_accepted_at')->nullable()->after('terms_version');
            $table->timestamp('anonymized_at')->nullable()->after('terms_accepted_at');

            // Retention reporting asks "which erasures are still pending?", which is a
            // scan over this column.
            $table->index('anonymized_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['anonymized_at']);
            $table->dropColumn(['date_of_birth', 'terms_version', 'terms_accepted_at', 'anonymized_at']);
        });
    }
};
