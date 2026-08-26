<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * 3.11 — foreign keys for references that were only conventions.
 * 3.7  — the index that makes subscription expiry a lookup instead of a scan.
 *
 * ── 3.11 ───────────────────────────────────────────────────────────────────────
 *
 * Ten `uuid` columns named `*_id` pointed at another table with nothing enforcing
 * that the row was there. `trips.zone_id` is the one the audit named, and it is
 * the worst of them: it is the grouping key of the financial report, so a zone id
 * that no longer resolves does not raise an error — it silently produces a
 * revenue row for a zone that does not exist, and nobody reconciling the report
 * can tell that from a zone with no name.
 *
 * The others follow the same pattern. A complaint or a dispute referencing a trip
 * that is gone is an investigation whose evidence has evaporated; a coupon scoped
 * to a deleted university is a discount with undefined eligibility.
 *
 * ON DELETE, chosen per relationship rather than uniformly:
 *
 *   RESTRICT — where the referenced row is EVIDENCE. A zone with trips, or a trip
 *   with a complaint, a dispute or a lost-property report against it, is not
 *   deletable. `zones` already has `deleted_at` and `is_active`, so deactivating
 *   is the supported path and this constraint makes it the only one. Consistent
 *   with the financial ledger (`2026_08_28_000100`): a row with history is not
 *   deletable, it is retirable.
 *
 *   SET NULL — where the reference is a PREFERENCE or a SCOPE, and losing it
 *   degrades gracefully. A student whose saved university is removed should still
 *   have a profile; a coupon whose scope is removed becomes unscoped, and
 *   `CouponService` re-validates scope on every redemption.
 *
 * `payment_requests.coupon_id` is RESTRICT and not SET NULL: that row is an
 * approved payment, and the coupon is how its `discount_fils` is explained.
 * Nulling it would leave a discount on the ledger with no stated reason.
 *
 * Deliberately NOT constrained:
 *   • audit_logs.auditable_id, coupon_redemptions.context_id,
 *     payment_requests.payable_id, personal_access_tokens.tokenable_id —
 *     polymorphic. The target table is a sibling column; no single FK can express
 *     that, and faking one would be worse than the honest absence.
 *   • sessions.user_id — the session driver is Redis in every environment
 *     (`config/session.php`, both env examples). The table is vestigial; putting a
 *     constraint on it would imply it is load-bearing.
 */
return new class extends Migration
{
    /**
     * table => [column, referenced table, on-delete]
     *
     * @var list<array{0:string,1:string,2:string,3:string}>
     */
    private array $keys = [
        // Evidence — the referenced row must outlive the reference.
        ['trips', 'zone_id', 'zones', 'restrict'],
        ['complaints', 'trip_id', 'trips', 'restrict'],
        ['disputes', 'trip_id', 'trips', 'restrict'],
        ['lost_found_items', 'trip_id', 'trips', 'restrict'],
        ['payment_requests', 'coupon_id', 'coupons', 'restrict'],

        // Preference / scope — degrade to "unset" rather than block a cleanup.
        ['coupons', 'plan_id', 'subscription_plans', 'set null'],
        ['coupons', 'university_id', 'universities', 'set null'],
        ['student_profiles', 'university_id', 'universities', 'set null'],
        ['student_profiles', 'default_pickup_point_id', 'pickup_points', 'set null'],
    ];

    public function up(): void
    {
        foreach ($this->keys as [$table, $column, $references, $onDelete]) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column) || ! Schema::hasTable($references)) {
                continue;
            }

            if ($this->hasForeignKey($table, $column)) {
                continue;
            }

            /*
             * Orphans are nulled before the constraint goes on.
             *
             * Not because any are expected — the check that found these columns
             * reported zero — but because ADD CONSTRAINT is all-or-nothing: one
             * stale row from a since-fixed bug fails the whole migration, in
             * production, at deploy time, with no way to see which row without a
             * shell. A reference that already points at nothing is already
             * broken; making it explicitly NULL loses no information.
             */
            $orphans = DB::table($table)
                ->whereNotNull($column)
                ->whereNotIn($column, fn ($q) => $q->select('id')->from($references))
                ->update([$column => null]);

            if ($orphans > 0) {
                // Logged, not written to audit_logs: a migration that depends on
                // another table's column layout is a migration that breaks the next
                // time that table changes.
                Log::warning('schema.orphans_nulled', [
                    'table' => $table,
                    'column' => $column,
                    'references' => $references,
                    'rows' => $orphans,
                ]);
            }

            Schema::table($table, function (Blueprint $t) use ($column, $references, $onDelete) {
                $fk = $t->foreign($column)->references('id')->on($references);
                $onDelete === 'restrict' ? $fk->restrictOnDelete() : $fk->nullOnDelete();
            });
        }

        /*
         * 3.7 — `ExpireSubscriptions` asks for rows where `status = 'active'` AND
         * `ends_at < now()`. There was an index on `status` alone, which on a table
         * where nearly every row is active selects nearly every row and then filters
         * in memory. The composite is ordered (status, ends_at) because status is the
         * equality predicate and ends_at the range one.
         */
        if (Schema::hasTable('subscriptions') && ! $this->hasIndex('subscriptions', 'subscriptions_status_ends_at_index')) {
            Schema::table('subscriptions', function (Blueprint $t) {
                $t->index(['status', 'ends_at'], 'subscriptions_status_ends_at_index');
            });
        }
    }

    public function down(): void
    {
        if ($this->hasIndex('subscriptions', 'subscriptions_status_ends_at_index')) {
            Schema::table('subscriptions', fn (Blueprint $t) => $t->dropIndex('subscriptions_status_ends_at_index'));
        }

        foreach (array_reverse($this->keys) as [$table, $column, $references, $onDelete]) {
            if (! Schema::hasTable($table) || ! $this->hasForeignKey($table, $column)) {
                continue;
            }

            Schema::table($table, fn (Blueprint $t) => $t->dropForeign([$column]));
        }
    }

    /** Postgres catalogue lookup — Laravel has no portable "does this FK exist". */
    private function hasForeignKey(string $table, string $column): bool
    {
        return DB::table('information_schema.key_column_usage as k')
            ->join('information_schema.table_constraints as t', function ($j) {
                $j->on('t.constraint_name', '=', 'k.constraint_name')
                    ->on('t.table_schema', '=', 'k.table_schema');
            })
            ->where('t.constraint_type', 'FOREIGN KEY')
            ->where('k.table_schema', 'public')
            ->where('k.table_name', $table)
            ->where('k.column_name', $column)
            ->exists();
    }

    private function hasIndex(string $table, string $index): bool
    {
        return DB::table('pg_indexes')
            ->where('schemaname', 'public')
            ->where('tablename', $table)
            ->where('indexname', $index)
            ->exists();
    }
};
