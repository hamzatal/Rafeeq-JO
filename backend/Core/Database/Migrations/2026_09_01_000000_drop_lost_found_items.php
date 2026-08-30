<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Drop `lost_found_items`, retiring the LostFound module.
 *
 * ── Why it goes ────────────────────────────────────────────────────────────
 *
 * The phase 4 decision recorded in `docs/design/SCREENS.md` marked it for deletion
 * and it survived that phase: a module with its own table, six routes, a screen and
 * two assistant tools, to do what `Support` already does with a ticket. Keeping a
 * feature that has been decided against is not free — between the decision and now
 * it acquired a foreign key in the phase 6 integrity migration and an AI tool that
 * could CREATE rows on the model's own judgement.
 *
 * ── Why `rewards` does NOT go, though it was marked the same way ────────────
 *
 * The 🔴 on `rewards` conflated two different things that happen to share a table.
 * The student-facing points UI is indeed outside the core of a transport product,
 * and its screen and its chip on the home screen are gone. But
 * `reward_accounts.tier` is the source of truth for the CAPTAIN TIER, read by
 * `Payouts/Controllers/DriverPerformanceController` and rendered on the captain
 * dashboard — a live feature. Dropping the table would have broken it.
 *
 * That is worth writing down because the marking looked safe: two grep passes over
 * the student app and the api-client both came back clean, and the coupling only
 * appears when you look at who reads the `tier` COLUMN rather than who calls the
 * module.
 *
 * ── `down()` ───────────────────────────────────────────────────────────────
 *
 * Recreates the table so a rollback leaves the schema the earlier migrations
 * expect. It cannot restore rows and does not pretend to; the table has never held
 * one outside seeded demo data.
 */
return new class extends Migration
{
    public function up(): void
    {
        /*
         * The restrict-on-delete key to `trips` added by
         * `2026_08_28_000200_add_missing_foreign_keys_and_indexes` is dropped with the
         * table, so no explicit `dropForeign` is needed. That migration also guards
         * every constraint behind a `Schema::hasTable`, so a fresh database — where
         * this table is never created at all — skips it rather than failing.
         */
        Schema::dropIfExists('lost_found_items');
    }

    public function down(): void
    {
        Schema::create('lost_found_items', function ($table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('trip_id')->nullable()->index();
            $table->string('type', 20);
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->index(['type', 'status']);
        });
    }
};
