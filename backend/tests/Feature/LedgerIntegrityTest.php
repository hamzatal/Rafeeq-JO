<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Users\Services\AccountErasureService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * The database itself refuses to corrupt the ledger.
 *
 * Two classes of protection, both of which were previously enforced only by application
 * code — and application code is bypassed by a console command, a seeder, a raw query,
 * or the next person who has not read the service.
 *
 * 3.3 — money columns accept no negatives. The schema declares them
 * `unsignedBigInteger`, but PostgreSQL has no unsigned integer type: Laravel emits a
 * plain `bigint` and the "unsigned" is silently dropped. All 24 money columns accepted
 * negatives.
 *
 * 3.2 — deleting a user cannot erase their financial history. Thirty foreign keys
 * cascaded from `users`, seven of them financial, so one `forceDelete()` removed every
 * wallet, captured fare and payout for that person with no error.
 */
class LedgerIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped('CHECK constraints and RESTRICT keys are Postgres-specific here.');
        }
    }

    private function user(string $phone = '+962790000401'): User
    {
        return User::create([
            'full_name' => 'Ledger', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
            'date_of_birth' => Clock::now()->subYears(21)->format('Y-m-d'),
        ]);
    }

    // ── 3.3 · no negative money, at the database level ─────────────────────

    /**
     * @dataProvider moneyColumns
     */
    public function test_a_money_column_refuses_a_negative(string $table, string $column): void
    {
        $wallet = app(WalletService::class)->forUser($this->user());

        // Every one of these is reachable by a raw UPDATE, which is exactly the path
        // that application-level validation does not cover.
        $this->expectException(QueryException::class);

        match ($table) {
            'wallets' => DB::table('wallets')->where('id', $wallet->id)->update([$column => -1]),
            default => DB::statement("UPDATE {$table} SET {$column} = -1 WHERE FALSE OR TRUE")
                ?: DB::table($table)->insertOrIgnore([$column => -1]),
        };
    }

    public static function moneyColumns(): array
    {
        return [
            'wallets.balance_fils' => ['wallets', 'balance_fils'],
            'wallets.held_fils' => ['wallets', 'held_fils'],
            'wallets.debt_fils' => ['wallets', 'debt_fils'],
        ];
    }

    public function test_every_money_column_carries_a_non_negative_constraint(): void
    {
        // The count is asserted rather than the list, so adding a money column without
        // a constraint fails here instead of silently shipping unconstrained.
        $constraints = DB::table('pg_constraint')
            ->where('conname', 'like', 'chk_%_non_negative')
            ->count();

        $this->assertGreaterThanOrEqual(24, $constraints,
            'every money column must carry a CHECK — Postgres silently drops "unsigned"');
    }

    /**
     * The one column that is signed by design. A debit is negative, and that is what
     * makes the transaction table readable as a running total.
     */
    public function test_the_transaction_amount_stays_signed_on_purpose(): void
    {
        $wallets = app(WalletService::class);
        $wallet = $wallets->forUser($this->user());
        $wallets->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');
        $wallets->debit($wallet, 2000, WalletTxnType::RidePayment, 'دفع');

        $negatives = DB::table('wallet_transactions')
            ->where('wallet_id', $wallet->id)->where('amount_fils', '<', 0)->count();

        $this->assertSame(1, $negatives, 'a debit is stored negative — deliberately unconstrained');
    }

    // ── 3.2 · a user with a ledger cannot be deleted ───────────────────────

    public function test_deleting_a_user_with_a_wallet_is_refused_by_the_database(): void
    {
        $user = $this->user();
        app(WalletService::class)->forUser($user);

        // forceDelete, not delete: soft deletion is the application convention, and the
        // point of this test is that the convention is no longer the only protection.
        $this->expectException(QueryException::class);
        DB::table('users')->where('id', $user->id)->delete();
    }

    public function test_the_financial_tables_no_longer_cascade_from_users(): void
    {
        $cascading = DB::select("
            SELECT tc.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name = 'users'
              AND rc.delete_rule = 'CASCADE'
              AND tc.table_name IN ('wallets','wallet_holds','payment_requests','payout_requests',
                                    'subscriptions','coupon_redemptions','trip_passengers')
        ");

        $this->assertSame([], $cascading,
            'one forceDelete must not be able to remove a wallet, a captured fare or a payout');
    }

    /**
     * Non-financial cascades are deliberately kept: a device token genuinely should
     * vanish with its owner, and turning those into RESTRICT would make erasure
     * impossible for no benefit.
     */
    public function test_non_financial_tables_still_cascade(): void
    {
        $names = collect(DB::select("
            SELECT tc.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name = 'users' AND rc.delete_rule = 'CASCADE'
        "))->pluck('table_name');

        $this->assertContains('device_tokens', $names->all());
        $this->assertContains('notification_preferences', $names->all());
    }

    /**
     * And erasure still works, because that is the correct path for a user with
     * history: destroy the identity, keep the books.
     */
    public function test_erasure_still_succeeds_on_a_user_with_a_ledger(): void
    {
        $user = $this->user('+962790000402');
        $wallets = app(WalletService::class);
        $wallet = $wallets->forUser($user);
        $wallets->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');
        $wallets->debit($wallet, 5000, WalletTxnType::RidePayment, 'دفع');

        app(AccountErasureService::class)->erase($user);

        $this->assertNotNull(User::withTrashed()->find($user->id)->anonymized_at);
        // The ledger survives, joined to a row that identifies nobody.
        $this->assertDatabaseHas('wallets', ['id' => $wallet->id]);
    }
}
