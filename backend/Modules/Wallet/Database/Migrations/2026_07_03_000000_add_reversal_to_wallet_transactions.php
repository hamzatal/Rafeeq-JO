<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets admins reverse a manual wallet top-up (or adjustment) that was entered by
 * mistake. The reversal is itself a transaction (an Adjustment debit); the
 * original credit is flagged with `reversed_at`, and the reversal debit points
 * back to it via `reversal_of` — giving a clean, auditable, non-destructive trail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('wallet_transactions', 'reversed_at')) {
                $table->timestamp('reversed_at')->nullable()->after('description');
            }
            if (! Schema::hasColumn('wallet_transactions', 'reversal_of')) {
                $table->uuid('reversal_of')->nullable()->after('reversed_at')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('wallet_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('wallet_transactions', 'reversal_of')) {
                $table->dropColumn('reversal_of');
            }
            if (Schema::hasColumn('wallet_transactions', 'reversed_at')) {
                $table->dropColumn('reversed_at');
            }
        });
    }
};
