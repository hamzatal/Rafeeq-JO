<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin top-up idempotency de-dupes by (wallet_id, type, reference) via a
 * locked lookup. Without an index that lookup scans the wallet's whole
 * transaction history; this composite index keeps it O(log n).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->index(['wallet_id', 'type', 'reference'], 'wallet_txns_wallet_type_reference_index');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropIndex('wallet_txns_wallet_type_reference_index');
        });
    }
};
