<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cash payment.
 *
 * `payment_method` on both the request and the passenger row. On the request because
 * the rider chooses before a captain is matched and the captain must see it on the
 * offer — a captain who cannot take cash today should be able to decline knowingly.
 * On the passenger row because that row is the accounting record, and how a fare was
 * settled is part of the record, not a lookup through a request that may have been
 * detached.
 *
 * `cash_collected_at` is separate from `paid_at` on purpose. `paid_at` means "the
 * platform has finished billing this seat", which is true for both methods. Cash also
 * needs "the captain confirmed receiving notes", and conflating the two would make it
 * impossible to reconcile a disputed cash trip later.
 *
 * `debt_fils` on the wallet: on cash the captain holds the whole fare and owes us the
 * commission, so the platform becomes a creditor. Tracking that as a positive debt
 * figure rather than letting `balance_fils` go negative keeps "balance" meaning one
 * thing, keeps the existing `availableFils()` arithmetic honest, and makes the debt
 * queryable for the ceiling that blocks going online.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->string('payment_method', 12)->default('wallet')->after('status');
        });

        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->string('payment_method', 12)->default('wallet')->after('status');
            $table->timestamp('cash_collected_at')->nullable()->after('paid_at');

            // Operations asks "which cash trips settled today, and by whom?" — a scan
            // over method plus time.
            $table->index(['payment_method', 'paid_at']);
        });

        Schema::table('wallets', function (Blueprint $table) {
            // What this wallet's owner owes the platform. Always >= 0; a debt is a
            // positive number, never a negative balance.
            $table->unsignedBigInteger('debt_fils')->default(0)->after('held_fils');

            // The ceiling check runs on every availability toggle, so it is indexed.
            $table->index('debt_fils');
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });

        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->dropIndex(['payment_method', 'paid_at']);
            $table->dropColumn(['payment_method', 'cash_collected_at']);
        });

        Schema::table('wallets', function (Blueprint $table) {
            $table->dropIndex(['debt_fils']);
            $table->dropColumn('debt_fils');
        });
    }
};
