<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Guarantees a single CliQ transfer (bank_reference) can only fund ONE *approved*
 * payment — a partial unique index. Pending / under-review duplicates are still
 * allowed (so the anti-fraud flow can flag them for manual review); only approval
 * is constrained. Uses a partial index (Postgres + SQLite support `WHERE`).
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['pgsql', 'sqlite'], true)) {
            return; // partial indexes unsupported (e.g. MySQL) — app-level guard still applies
        }

        DB::statement(
            "CREATE UNIQUE INDEX IF NOT EXISTS payments_bank_reference_approved_unique
             ON payments (bank_reference)
             WHERE status = 'approved' AND bank_reference IS NOT NULL"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS payments_bank_reference_approved_unique');
    }
};
