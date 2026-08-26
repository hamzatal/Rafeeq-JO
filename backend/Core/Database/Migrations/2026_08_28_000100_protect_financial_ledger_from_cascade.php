<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Stop a single user deletion from erasing the ledger.
 *
 * Thirty foreign keys point at `users` with `ON DELETE CASCADE`, and seven of them are
 * financial tables: wallets, wallet_holds, payment_requests, payout_requests,
 * subscriptions, coupon_redemptions, trip_passengers.
 *
 * So one `User::forceDelete()` — from a console command, a cleanup script, a seeder, or
 * a future "GDPR delete" someone writes without reading this — silently removes every
 * wallet, every captured fare and every payout for that person. Not marks them: removes
 * the rows. The accounting record and the only evidence in a dispute both disappear,
 * and nothing errors.
 *
 * The current protection is that the application always soft-deletes. That is
 * protection by CONVENTION, and a convention is not a constraint.
 *
 * `RESTRICT` instead: the delete fails while ledger rows exist. Which is correct —
 * a user with financial history is not deletable, they are ERASABLE, and
 * AccountErasureService already does exactly that: destroy the identity, keep the
 * books, joined to a row that identifies nobody.
 *
 * Non-financial cascades are left alone. Device tokens and notification preferences
 * genuinely should vanish with their owner.
 */
return new class extends Migration
{
    /**
     * Financial tables and their FK column into `users`.
     *
     * @return array<int, array{0:string,1:string}>
     */
    private function ledgerKeys(): array
    {
        return [
            ['wallets', 'user_id'],
            ['wallet_holds', 'user_id'],
            ['payment_requests', 'user_id'],
            ['payout_requests', 'captain_user_id'],
            ['subscriptions', 'student_id'],
            ['coupon_redemptions', 'user_id'],
            ['trip_passengers', 'student_id'],
        ];
    }

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->ledgerKeys() as [$table, $column]) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
                continue;
            }

            foreach ($this->constraintNames($table, $column) as $name) {
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$name}");
            }

            $new = "{$table}_{$column}_foreign";
            DB::statement(
                "ALTER TABLE {$table} ADD CONSTRAINT {$new} "
                ."FOREIGN KEY ({$column}) REFERENCES users(id) ON DELETE RESTRICT"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->ledgerKeys() as [$table, $column]) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($this->constraintNames($table, $column) as $name) {
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$name}");
            }
            DB::statement(
                "ALTER TABLE {$table} ADD CONSTRAINT {$table}_{$column}_foreign "
                ."FOREIGN KEY ({$column}) REFERENCES users(id) ON DELETE CASCADE"
            );
        }
    }

    /**
     * Existing FK constraint names for a column.
     *
     * Looked up rather than assumed: Laravel's naming is conventional but a constraint
     * added by hand or renamed by a restore would be missed, and a missed one means the
     * cascade survives while the migration reports success.
     *
     * @return array<int, string>
     */
    private function constraintNames(string $table, string $column): array
    {
        return DB::table('information_schema.table_constraints as tc')
            ->join('information_schema.key_column_usage as kcu', 'tc.constraint_name', '=', 'kcu.constraint_name')
            ->where('tc.constraint_type', 'FOREIGN KEY')
            ->where('tc.table_name', $table)
            ->where('kcu.column_name', $column)
            ->pluck('tc.constraint_name')
            ->unique()
            ->all();
    }
};
