<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * 5.5 — give the platform a wallet, because the commission was going nowhere.
 *
 * ── The hole this closes ───────────────────────────────────────────────────────
 *
 * Follow one band-C seat through the ledger as it stood. The student is debited
 * 1500. The captain is credited 1275. Nothing is written for the remaining 225.
 * The commission is not moved, not recorded, not held — it is simply the gap
 * between two entries, and it leaves the books entirely.
 *
 * Two consequences, and the second is the dangerous one.
 *
 * **Revenue is unrecorded.** "How much did the platform earn last month" cannot be
 * answered from the ledger. It has to be re-derived by summing
 * `trip_passengers.commission_fils`, a column written by the same code path whose
 * correctness you were trying to check. The books do not balance and cannot be made
 * to: total credits minus total debits is not zero and not meaningful.
 *
 * **A subsidy has nothing to come from.** The captain guarantee (5.6) pays a captain
 * the difference between what an under-filled trip earned and a promised floor, and
 * that money is supposed to come out of commission. With no account holding the
 * commission, `credit(captain, shortfall)` creates balance backed by nothing — the
 * exact defect `RideBillingService` already guards against for coupons by capping a
 * discount at the commission, with the comment "there is no funded treasury wallet".
 * This migration is that treasury wallet.
 *
 * ── Why a wallet and not a counter ─────────────────────────────────────────────
 *
 * A `platform_revenue_fils` column somewhere would record the total, but the point
 * is not the total — it is that every movement has two sides. Making the platform an
 * ordinary account means commission arrives as a normal credit, subsidies leave as
 * normal debits, both appear in `wallet_transactions` with a trip reference, and the
 * whole ledger becomes checkable by one statement: the sum of every signed amount
 * equals the money paid in from outside. `LedgerZeroSumTest` asserts precisely that.
 *
 * It also buys a property worth more than the bookkeeping. `WalletService::apply()`
 * refuses to take a balance below zero. So the treasury CANNOT be overdrawn, which
 * means the platform can only ever subsidise out of commission it has actually
 * earned. PRICING.md §3 warns «الدعم وحده يُفلس المنصّة» — the subsidy alone will
 * bankrupt the platform. That warning is now enforced by the same code that stops a
 * student spending money they do not have, rather than by three policy caps and the
 * hope that they were configured correctly.
 *
 * ── Shape ──────────────────────────────────────────────────────────────────────
 *
 * `kind` distinguishes the one platform row from every user row. `user_id` becomes
 * nullable because the platform is not a person, and a CHECK ties the two together
 * so neither a user wallet without an owner nor a platform wallet with one can
 * exist. A partial unique index permits exactly one platform wallet — a second one
 * would silently split the treasury in half.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wallets', function (Blueprint $table) {
            // 'user' | 'platform'. Indexed because resolving the treasury happens on
            // every billed seat.
            $table->string('kind', 16)->default('user')->after('id')->index();
        });

        // The platform is not a person. Postgres treats NULLs as distinct, so the
        // existing unique on user_id keeps protecting user wallets untouched.
        DB::statement('ALTER TABLE wallets ALTER COLUMN user_id DROP NOT NULL');

        /*
         * A user wallet must have an owner; the platform wallet must not have one.
         * Without this, `kind` is a label that application code is trusted to keep
         * consistent, and the whole point of the treasury is that it is not
         * trusted — it is constrained.
         */
        DB::statement("ALTER TABLE wallets ADD CONSTRAINT chk_wallets_kind_owner CHECK (
            (kind = 'user' AND user_id IS NOT NULL)
            OR (kind = 'platform' AND user_id IS NULL)
        )");

        // Exactly one treasury. A second row would divide the commission between two
        // accounts and every balance check would quietly read the wrong half.
        DB::statement("CREATE UNIQUE INDEX wallets_single_platform ON wallets (kind) WHERE kind = 'platform'");

        // Created here rather than lazily so the row exists before the first trip is
        // billed, and so a fresh database is never one race away from two of them.
        if (! DB::table('wallets')->where('kind', 'platform')->exists()) {
            DB::table('wallets')->insert([
                'id' => (string) Str::uuid7(),
                'kind' => 'platform',
                'user_id' => null,
                'balance_fils' => 0,
                'held_fils' => 0,
                'debt_fils' => 0,
                'currency' => 'JOD',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // The treasury holds real money, so refuse to drop it while it does. A
        // rollback that silently deletes recorded revenue is not a rollback.
        $balance = (int) DB::table('wallets')->where('kind', 'platform')->sum('balance_fils');
        if ($balance !== 0) {
            throw new RuntimeException(
                "Refusing to roll back: the platform treasury holds {$balance} fils. "
                .'Reconcile and withdraw it before dropping the wallet.'
            );
        }

        DB::table('wallets')->where('kind', 'platform')->delete();

        DB::statement('DROP INDEX IF EXISTS wallets_single_platform');
        DB::statement('ALTER TABLE wallets DROP CONSTRAINT IF EXISTS chk_wallets_kind_owner');
        DB::statement('ALTER TABLE wallets ALTER COLUMN user_id SET NOT NULL');

        Schema::table('wallets', function (Blueprint $table) {
            $table->dropIndex(['kind']);
            $table->dropColumn('kind');
        });
    }
};
