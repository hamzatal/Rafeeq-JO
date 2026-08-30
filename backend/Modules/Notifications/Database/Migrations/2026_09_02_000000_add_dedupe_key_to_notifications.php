<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Make a re-delivered notification impossible, at the database.
 *
 * ── The bug ────────────────────────────────────────────────────────────────
 *
 * `BroadcastNotificationJob` declares `tries = 3` and is not idempotent. It walks the
 * audience with `chunkById` and calls `notify()` per user, and `notify()` is an
 * unconditional `Notification::create`. So a job that dies at user 6,000 of 10,000 —
 * a worker restart, a Redis blip, an FCM timeout that exhausts the 600s budget — is
 * retried **from the beginning**, and the first 6,000 students get the same
 * announcement a second time. Then a third.
 *
 * The job's own `failed()` docblock admits this ("a retry can re-notify the chunks
 * that already succeeded, so an operator has to know a failure happened before they
 * press send again"), which documents the hazard rather than removing it — and it only
 * runs after the LAST attempt, so nobody learns about the duplicates until after
 * they have been delivered.
 *
 * ── Why a unique index rather than "just set tries = 1" ────────────────────
 *
 * `tries = 1` trades duplicate delivery for silent partial delivery: a broadcast that
 * dies at 6,000 simply never reaches the other 4,000, and the operator sees one log
 * line. Retrying is the right behaviour; retrying WITHOUT re-inserting is what was
 * missing. A unique `(user_id, dedupe_key)` makes the second attempt skip exactly the
 * users it already reached and finish the rest.
 *
 * ── Why the key is nullable ────────────────────────────────────────────────
 *
 * Ordinary per-event notifications ("your captain has arrived") are not deduplicated
 * and must not be: the same user can legitimately receive the same title twice for
 * two different trips. Only senders that can be retried set a key. In Postgres a
 * `UNIQUE` index treats each NULL as distinct, so the nullable column costs those
 * rows nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rafeeq_notifications', function (Blueprint $table) {
            $table->string('dedupe_key', 80)->nullable()->after('type');
            $table->unique(['user_id', 'dedupe_key'], 'notifications_user_dedupe_unique');
        });
    }

    public function down(): void
    {
        Schema::table('rafeeq_notifications', function (Blueprint $table) {
            $table->dropUnique('notifications_user_dedupe_unique');
            $table->dropColumn('dedupe_key');
        });
    }
};
