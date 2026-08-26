<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Make every money column refuse a negative at the DATABASE level.
 *
 * The bug this closes: the schema declares these columns `unsignedBigInteger`, and on
 * MySQL that is enforced. On PostgreSQL there is no unsigned integer type — Laravel
 * emits a plain `bigint` and the "unsigned" is silently dropped. So all 23 money
 * columns in this project accept negative values, and the only thing standing between
 * a sign error and a corrupted ledger is application code.
 *
 * That is the wrong place for this rule. A `CHECK` cannot be bypassed by a raw query,
 * a seeder, a console command, a future developer, or a bug in the service layer.
 *
 * Two columns are deliberately EXCLUDED and it matters why:
 *
 *   `wallet_transactions.amount_fils` is signed by design — a debit is negative, and
 *   that is what makes the ledger readable as a running total.
 *
 *   `trip_passengers.coupon_discount_fils` is nullable and only ever positive when set,
 *   so it gets `>= 0 OR NULL` rather than a bare `>= 0`.
 */
return new class extends Migration
{
    /**
     * Every money column, and whether it may be null.
     *
     * @return array<int, array{0:string,1:string}>
     */
    private function columns(): array
    {
        return [
            ['wallets', 'balance_fils'],
            ['wallets', 'held_fils'],
            ['wallets', 'debt_fils'],
            ['wallet_holds', 'amount_fils'],
            ['payment_requests', 'amount_fils'],
            ['payout_requests', 'amount_fils'],
            ['trips', 'fare_fils'],
            ['trip_passengers', 'fare_fils'],
            ['trip_passengers', 'commission_fils'],
            ['trip_passengers', 'captain_share_fils'],
            ['trip_passengers', 'coupon_discount_fils'],
            ['ride_requests', 'express_fee_fils'],
            ['subscription_plans', 'price_fils'],
            ['routes', 'price_fils'],
            ['zone_university_prices', 'fare_fils'],
            ['coupons', 'value'],
            ['coupons', 'max_discount_fils'],
            ['coupons', 'min_amount_fils'],
            ['coupon_redemptions', 'discount_fils'],
            ['payment_requests', 'discount_fils'],
            ['trips', 'base_fare_fils'],
            ['trips', 'express_fee_fils'],
            ['exchange_items', 'price_fils'],
            ['parcels', 'fee_fils'],
        ];
    }

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            // SQLite cannot ADD a CHECK to an existing table, and MySQL enforces
            // unsigned natively. This constraint is Postgres-specific by necessity.
            return;
        }

        foreach ($this->columns() as [$table, $column]) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }

            $name = "chk_{$table}_{$column}_non_negative";

            // Any pre-existing negative would make the ADD fail, so it is surfaced
            // rather than silently skipped — a negative already in a money column is a
            // finding, not something to work around.
            $negatives = DB::table($table)->where($column, '<', 0)->count();
            if ($negatives > 0) {
                throw new RuntimeException(
                    "Cannot add {$name}: {$table}.{$column} already holds {$negatives} negative "
                    .'row(s). Investigate before constraining — a negative in a money column '
                    .'means the ledger is already wrong.'
                );
            }

            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$name}");
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$column} >= 0)");
        }

        // The one signed column, asserted rather than constrained, so a future reader
        // sees it was considered and excluded on purpose.
        DB::statement('COMMENT ON COLUMN wallet_transactions.amount_fils IS '
            ."'Signed by design: a debit is negative. Deliberately has no non-negative CHECK.'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->columns() as [$table, $column]) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS chk_{$table}_{$column}_non_negative");
        }
    }
};
