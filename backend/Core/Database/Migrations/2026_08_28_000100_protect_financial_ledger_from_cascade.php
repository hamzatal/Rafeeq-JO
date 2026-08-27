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

    /**
     * Deliberately NOT a rollback to `ON DELETE CASCADE`.
     *
     * This migration exists because thirty foreign keys cascaded from `users` and
     * seven of them were financial, so one `forceDelete()` erased a person's entire
     * ledger with no error. A faithful `down()` would restore that — it would take a
     * routine `migrate:rollback`, run by an operator who wanted to undo the migration
     * AFTER it, and quietly re-arm the single most destructive footgun in the schema.
     *
     * Reversibility is a property worth having right up to the point where the thing
     * being reversed is data loss. `RESTRICT` is left in place, and the reason is
     * stated rather than silently omitted so the next reader knows this is a decision
     * and not an oversight.
     *
     * If a cascade is genuinely wanted, it has to be written as a new migration by
     * someone who has read this paragraph.
     */
    public function down(): void
    {
        // Intentionally empty. See the note above.
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
