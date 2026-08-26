<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Rafeeq\Core\Retention\RetentionPolicy;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Data retention: the promises, enforced.
 *
 * ── Why these tests are the point of Phase 3 ───────────────────────────────────
 *
 * The privacy notice promised six retention periods. Four had no implementation at
 * all, and `driver_locations` — a captain's movement history outside any trip — had
 * none whatsoever, so it grew forever. Nobody noticed for five rounds of audit,
 * because a promise written in Markdown and a promise enforced by code look identical
 * from the outside.
 *
 * So the periods live in one table (`RetentionPolicy`), one command reads it, and
 * these tests assert the command actually deletes. Without the last part the first
 * two are just a better-organised claim.
 */
class RetentionPolicyTest extends TestCase
{
    use RefreshDatabase;

    private function prune(array $options = []): void
    {
        $this->artisan('rafeeq:prune-retention', $options)->assertSuccessful();
    }

    /* ─────────────────────── the policy table itself ─────────────────────── */

    /**
     * Every policy must name a table and column that exist.
     *
     * This is the drift check. A policy referring to `trip_tracking_points` (the name
     * the audit document used) or `driver_locations.created_at` (the column it does
     * not have) would silently prune nothing, and the retention report would show a
     * clean table because the query matched no rows.
     */
    public function test_every_policy_points_at_a_real_table_and_column(): void
    {
        foreach (RetentionPolicy::all() as $key => $policy) {
            $this->assertTrue(
                Schema::hasTable($policy['table']),
                "Policy '{$key}' names table '{$policy['table']}', which does not exist.",
            );
            $this->assertTrue(
                Schema::hasColumn($policy['table'], $policy['column']),
                "Policy '{$key}' names column '{$policy['table']}.{$policy['column']}', which does not exist.",
            );
        }
    }

    /** Every policy must state a reason. A period with no justification gets raised the first time it inconveniences someone. */
    public function test_every_policy_states_a_period_and_a_reason(): void
    {
        foreach (RetentionPolicy::all() as $key => $policy) {
            $this->assertGreaterThan(0, $policy['days'], "Policy '{$key}' has no period.");
            $this->assertGreaterThan(60, strlen($policy['reason']), "Policy '{$key}' has no real justification.");
        }
    }

    /**
     * The six commitments the privacy notice makes, by name. If one is dropped from
     * the policy table, the document becomes a lie and this test says so.
     */
    public function test_all_six_published_commitments_have_a_policy(): void
    {
        $policies = RetentionPolicy::all();

        foreach ([
            'otp_codes', 'trip_tracking', 'driver_locations',
            'chat_messages', 'support_tickets', 'audit_logs',
        ] as $promised) {
            $this->assertArrayHasKey($promised, $policies, "No policy enforces the published '{$promised}' commitment.");
        }
    }

    /* ────────────────────────────── pruning ─────────────────────────────── */

    public function test_stale_rows_go_and_fresh_rows_stay(): void
    {
        $days = RetentionPolicy::days('driver_locations');
        $driver = $this->driver();

        $this->location($driver->id, Clock::now()->subDays($days + 5));   // stale
        $this->location($driver->id, Clock::now()->subDays(1));           // fresh

        $this->prune(['--only' => 'driver_locations']);

        $this->assertSame(1, DB::table('driver_locations')->count());
        $this->assertTrue(
            DB::table('driver_locations')->where('recorded_at', '>', Clock::now()->subDays($days))->exists(),
            'The surviving row must be the fresh one.',
        );
    }

    public function test_dry_run_reports_without_deleting(): void
    {
        $driver = $this->driver();
        $this->location($driver->id, Clock::now()->subDays(90));

        $this->prune(['--only' => 'driver_locations', '--dry-run' => true]);

        $this->assertSame(1, DB::table('driver_locations')->count(), 'A dry run must not delete.');
    }

    public function test_an_unknown_policy_name_fails_loudly(): void
    {
        $this->artisan('rafeeq:prune-retention', ['--only' => 'nope'])->assertFailed();
    }

    /**
     * The bug the old `rafeeq:prune-tracking` had: it filtered on
     * `Completed|Cancelled`, so a trip a captain abandoned in `started` kept its GPS
     * trail permanently. That is the case where the data is least justified and most
     * sensitive, and it was the one case excluded.
     */
    public function test_tracking_is_pruned_for_trips_stranded_mid_journey(): void
    {
        $old = Clock::now()->subDays(RetentionPolicy::days('trip_tracking') + 10);

        $stranded = $this->trip('started', $old);
        $finished = $this->trip('completed', $old);
        $recent = $this->trip('started', Clock::now()->subDay());

        foreach ([$stranded, $finished, $recent] as $tripId) {
            DB::table('trip_tracking')->insert([
                'id' => (string) Str::uuid(), 'trip_id' => $tripId,
                'lat' => 31.9, 'lng' => 35.9, 'recorded_at' => $old,
            ]);
        }

        $this->prune(['--only' => 'trip_tracking']);

        $this->assertFalse($this->hasTracking($stranded), 'A stranded trip must not keep its GPS trail forever.');
        $this->assertFalse($this->hasTracking($finished), 'A finished trip past the window must be pruned.');
        $this->assertTrue($this->hasTracking($recent), 'A recent trip keeps its trail — it is dispute evidence.');
    }

    /**
     * Audit entries that document MONEY survive the window. Pruning the trail of a
     * wallet movement would destroy the only defence in a later dispute, and the
     * statutory period for accounting records is longer than this policy.
     */
    public function test_money_audit_entries_are_exempt_from_pruning(): void
    {
        $old = Clock::now()->subDays(RetentionPolicy::days('audit_logs') + 30);

        $this->audit('wallet.credited', $old);
        $this->audit('payout.approved', $old);
        $this->audit('trip.boarded', $old);
        $this->audit('account.erased', $old);
        $this->audit('user.viewed', $old);        // not money — should go
        $this->audit('zone.updated', $old);       // not money — should go

        $this->prune(['--only' => 'audit_logs']);

        $surviving = DB::table('audit_logs')->pluck('action')->all();

        foreach (['wallet.credited', 'payout.approved', 'trip.boarded', 'account.erased'] as $action) {
            $this->assertContains($action, $surviving, "'{$action}' documents money and must survive.");
        }
        foreach (['user.viewed', 'zone.updated'] as $action) {
            $this->assertNotContains($action, $surviving, "'{$action}' is past its window and should be gone.");
        }
    }

    /**
     * An open fraud case must not be closed by timeout. Deleting an unresolved flag
     * because it aged is an investigation abandoned silently.
     */
    public function test_unresolved_risk_flags_are_exempt(): void
    {
        $old = Clock::now()->subDays(RetentionPolicy::days('risk_flags') + 30);
        $user = $this->driverUser('+962790000801');

        $this->riskFlag($user->id, $old, resolved: true);
        $this->riskFlag($user->id, $old, resolved: false);

        $this->prune(['--only' => 'risk_flags']);

        $this->assertSame(1, DB::table('risk_flags')->count());
        $this->assertTrue(
            DB::table('risk_flags')->whereNull('resolved_at')->exists(),
            'The surviving flag must be the unresolved one.',
        );
    }

    /**
     * Rejected identity documents: the FILE goes, not only the row.
     *
     * These are the most sensitive files in the system — national ID, licence,
     * insurance, criminal record certificate — and they were never deleted, not on
     * rejection and not on resignation. A deleted row with the file still on disk is
     * the worst outcome: the data is retained and nothing knows where.
     */
    public function test_rejected_documents_delete_the_file_as_well_as_the_row(): void
    {
        Storage::fake('local');
        $driver = $this->driver();
        $old = Clock::now()->subDays(RetentionPolicy::days('driver_documents_rejected') + 5);

        Storage::disk('local')->put('docs/rejected.jpg', 'x');
        Storage::disk('local')->put('docs/approved.jpg', 'x');

        $this->document($driver->id, 'rejected', 'docs/rejected.jpg', $old);
        $this->document($driver->id, 'approved', 'docs/approved.jpg', $old);

        $this->prune(['--only' => 'driver_documents_rejected']);

        $this->assertSame(1, DB::table('driver_documents')->count());
        Storage::disk('local')->assertMissing('docs/rejected.jpg');
        Storage::disk('local')->assertExists('docs/approved.jpg');
    }

    /** A full run must touch every policy without error, on an empty and a populated database. */
    public function test_a_full_run_succeeds_and_leaves_nothing_overdue(): void
    {
        $driver = $this->driver();
        $this->location($driver->id, Clock::now()->subDays(400));
        $this->audit('user.viewed', Clock::now()->subDays(900));

        $this->prune();

        // The report is the independent check: it recounts from the policy table.
        $this->artisan('rafeeq:retention-report', ['--fail-on-overdue' => true])->assertSuccessful();
    }

    public function test_the_report_runs_on_an_empty_database(): void
    {
        $this->artisan('rafeeq:retention-report')->assertSuccessful();
    }

    /* ───────────────────────────── fixtures ─────────────────────────────── */

    private function driverUser(string $phone): User
    {
        return User::create([
            'full_name' => 'Cap', 'phone' => $phone,
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    private function driver(): DriverProfile
    {
        return DriverProfile::create([
            'user_id' => $this->driverUser('+962790000800')->id,
            'status' => DriverStatus::Approved,
            'verification_level' => 1,
        ]);
    }

    private function location(string $driverId, \DateTimeInterface $at): void
    {
        DB::table('driver_locations')->insert([
            'id' => (string) Str::uuid(), 'driver_id' => $driverId,
            'lat' => 31.9, 'lng' => 35.9, 'recorded_at' => $at,
        ]);
    }

    private function trip(string $status, \DateTimeInterface $updatedAt): string
    {
        $id = (string) Str::uuid();
        DB::table('trips')->insert([
            'id' => $id, 'status' => $status, 'capacity' => 4, 'fare_fils' => 1000,
            'scheduled_at' => $updatedAt, 'created_at' => $updatedAt, 'updated_at' => $updatedAt,
        ]);

        return $id;
    }

    private function hasTracking(string $tripId): bool
    {
        return DB::table('trip_tracking')->where('trip_id', $tripId)->exists();
    }

    private function audit(string $action, \DateTimeInterface $at): void
    {
        DB::table('audit_logs')->insert([
            'id' => (string) Str::uuid(), 'action' => $action, 'created_at' => $at,
        ]);
    }

    private function riskFlag(string $userId, \DateTimeInterface $at, bool $resolved): void
    {
        DB::table('risk_flags')->insert([
            'id' => (string) Str::uuid(), 'user_id' => $userId,
            'type' => 'gps_jump', 'severity' => 'medium',
            'resolved_at' => $resolved ? $at : null,
            'created_at' => $at,
        ]);
    }

    private function document(string $driverId, string $status, string $path, \DateTimeInterface $at): void
    {
        DB::table('driver_documents')->insert([
            'id' => (string) Str::uuid(), 'driver_id' => $driverId,
            'type' => 'license', 'file_path' => $path, 'status' => $status,
            'created_at' => $at, 'updated_at' => $at,
        ]);
    }
}
