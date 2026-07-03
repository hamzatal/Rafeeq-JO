<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the CHECK constraint on wallet_transactions.type (stores it as a plain
 * string instead). The enum grew over time (reward_redemption, subscription_payment,
 * adjustment), and incrementally-migrated dev DBs kept a STALE check that rejected
 * the newer values ("CHECK constraint failed: type"). Validation is enforced in the
 * app via the WalletTxnType cast; the DB check just caused breakage on every new
 * value. This repairs existing DBs (sqlite + pgsql) idempotently.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check');

            return;
        }

        // sqlite (and others): rebuild the column as a plain string — this drops
        // the CHECK that Laravel emitted for the original enum() definition.
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->string('type', 40)->change();
        });
    }

    public function down(): void
    {
        // Re-adding the (fragile) CHECK is intentionally skipped — string is safer.
    }
};
