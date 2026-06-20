<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Rafeeq\Shared\Enums\WalletTxnType;

/**
 * Widen the wallet_transactions.type CHECK constraint to include the new
 * 'subscription_payment' type (paying for a subscription from wallet balance).
 *
 * Postgres enforces enum columns via a CHECK constraint, so we rebuild it to
 * include all current enum values. On sqlite (test env) this is a no-op —
 * RefreshDatabase rebuilds the column from the up-to-date enum definition.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $values = implode("','", WalletTxnType::values());
        DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');
        DB::statement("ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type::text IN ('{$values}'))");
    }

    public function down(): void
    {
        // Constraint widening is backward-compatible; nothing to revert.
    }
};
