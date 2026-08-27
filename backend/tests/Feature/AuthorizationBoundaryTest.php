<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Permission;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Privilege boundaries, proven rather than assumed.
 *
 * ── Why this file exists ───────────────────────────────────────────────────────
 *
 * `RolesPermissionsSeeder` builds a careful separation: a support supervisor may
 * approve a CliQ receipt (which only confirms a transfer that already happened at
 * a bank) but may NOT manage users, credit a wallet, approve a payout or change
 * settings. The seeder even carries comments explaining why those four are
 * admin-only.
 *
 * Three modules routed around it. They were gated on `role:admin,supervisor` with
 * no permission middleware at all, which meant a supervisor could:
 *
 *   • permanently BAN or FREEZE any account, through the dispute centre
 *   • rewrite the entire (zone ↔ university) FARE MATRIX — the price riders pay
 *   • ACTIVATE a paid subscription for free, and rewrite plan prices
 *
 * A role boundary that one module quietly bypasses is not a boundary, and the
 * only way to keep one is to test it. Every case below fails on the code as it
 * was before these routes were re-gated.
 */
class AuthorizationBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function userWithRole(string $role, UserType $type = UserType::Admin): User
    {
        $this->seq++;
        $u = User::create([
            'full_name' => ucfirst($role).' '.$this->seq,
            'phone' => '079'.str_pad((string) (4000000 + $this->seq), 7, '0', STR_PAD_LEFT),
            'type' => $type,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $u->assignRole($role);

        return $u;
    }

    private function student(): User
    {
        $this->seq++;

        return User::create([
            'full_name' => 'Student '.$this->seq,
            'phone' => '079'.str_pad((string) (5000000 + $this->seq), 7, '0', STR_PAD_LEFT),
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
    }

    /* ─────────────────── disputes: banning is users.manage ─────────────────── */

    private function dispute(string $subjectUserId): string
    {
        $id = (string) Str::uuid();
        DB::table('disputes')->insert([
            'id' => $id,
            'subject_user_id' => $subjectUserId,
            'type' => 'fraud',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    public function test_supervisor_cannot_ban_a_user_through_the_dispute_centre(): void
    {
        $victim = $this->student();
        $dispute = $this->dispute($victim->id);

        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));

        $this->postJson("/api/v1/admin/disputes/{$dispute}/resolve", [
            'action_taken' => 'banned',
            'resolution' => 'x',
        ])->assertStatus(403);

        $this->assertSame(
            UserStatus::Active->value,
            DB::table('users')->where('id', $victim->id)->value('status'),
            'A supervisor must not be able to ban an account — the seeder withholds users.manage.',
        );
    }

    public function test_supervisor_cannot_freeze_an_account(): void
    {
        $victim = $this->student();
        $dispute = $this->dispute($victim->id);

        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));

        $this->postJson("/api/v1/admin/disputes/{$dispute}/freeze")->assertStatus(403);
    }

    /** The supervisor's actual job still works — this is a boundary, not a lockout. */
    public function test_supervisor_can_still_read_and_triage_disputes(): void
    {
        $dispute = $this->dispute($this->student()->id);
        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));

        $this->getJson('/api/v1/admin/disputes')->assertOk();
        $this->getJson("/api/v1/admin/disputes/{$dispute}")->assertOk();
    }

    public function test_admin_can_still_ban_through_the_dispute_centre(): void
    {
        $victim = $this->student();
        $dispute = $this->dispute($victim->id);

        Sanctum::actingAs($this->userWithRole('admin'));

        $this->postJson("/api/v1/admin/disputes/{$dispute}/resolve", [
            'action_taken' => 'banned',
            'resolution' => 'confirmed fraud',
        ])->assertOk();

        $this->assertSame(
            UserStatus::Banned->value,
            DB::table('users')->where('id', $victim->id)->value('status'),
        );
    }

    /* ──────────────── fare matrix + plans are settings.manage ──────────────── */

    public function test_supervisor_cannot_rewrite_the_fare_matrix(): void
    {
        $zone = Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'Irbid',
            'center_lat' => 32.5, 'center_lng' => 35.85, 'radius_km' => 5, 'is_active' => true,
        ]);
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'is_active' => true]);

        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));

        // Setting every fare to zero is the concrete abuse this blocks.
        $this->postJson('/api/v1/admin/zone-prices', [
            'zone_id' => $zone->id,
            'university_id' => $uni->id,
            'fare_fils' => 0,
        ])->assertStatus(403);

        $this->assertDatabaseCount('zone_university_prices', 0);
    }

    /** Reading the tariff is left to supervisors — they answer "why was I charged this?". */
    public function test_supervisor_can_still_read_the_fare_matrix(): void
    {
        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));
        $this->getJson('/api/v1/admin/zone-prices')->assertOk();
    }

    public function test_supervisor_cannot_rewrite_a_subscription_plan_price(): void
    {
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U2', 'is_active' => true]);

        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Supervisor));

        $this->postJson('/api/v1/admin/plans', [
            'university_id' => $uni->id,
            'name' => 'Free money',
            'type' => 'monthly',
            'price_fils' => 0,
            'duration_days' => 30,
        ])->assertStatus(403);
    }

    /* ─────────── lost & found: the cross-user write (the worst one) ─────────── */

    private function item(User $reporter, string $type, string $category = 'general', string $status = 'open'): LostFoundItem
    {
        return LostFoundItem::create([
            'reporter_id' => $reporter->id,
            'type' => $type,
            'category' => $category,
            'title' => 'حقيبة سوداء',
            'status' => $status,
        ]);
    }

    /**
     * THE finding. `matched_with` was read straight off the request with no
     * validation and used as a primary key in an `update()`, so any authenticated
     * user could close any stranger's open report and point it at their own item.
     */
    public function test_a_user_cannot_close_a_strangers_report_by_naming_it_as_a_match(): void
    {
        $attacker = $this->student();
        $victim = $this->student();

        $mine = $this->item($attacker, 'lost');
        // Same type as the attacker's item, so it is not a legitimate counterpart.
        $theirs = $this->item($victim, 'lost');

        Sanctum::actingAs($attacker);

        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve", [
            'matched_with' => $theirs->id,
        ])->assertStatus(422);

        $this->assertSame(
            'open',
            DB::table('lost_found_items')->where('id', $theirs->id)->value('status'),
            "A stranger's report must not be touched.",
        );
    }

    public function test_a_match_must_be_the_opposite_type_and_the_same_category(): void
    {
        $a = $this->student();
        $b = $this->student();
        Sanctum::actingAs($a);

        $mine = $this->item($a, 'lost', 'bags');
        $wrongCategory = $this->item($b, 'found', 'electronics');

        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve", [
            'matched_with' => $wrongCategory->id,
        ])->assertStatus(422);

        $this->assertSame('open', DB::table('lost_found_items')->where('id', $wrongCategory->id)->value('status'));
    }

    public function test_a_nonexistent_match_id_is_rejected_by_validation(): void
    {
        $a = $this->student();
        Sanctum::actingAs($a);
        $mine = $this->item($a, 'lost');

        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve", [
            'matched_with' => (string) Str::uuid(),
        ])->assertStatus(422);
    }

    public function test_an_item_cannot_be_matched_with_itself(): void
    {
        $a = $this->student();
        Sanctum::actingAs($a);
        $mine = $this->item($a, 'lost');

        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve", [
            'matched_with' => $mine->id,
        ])->assertStatus(422);
    }

    /** A genuine match still works, and links BOTH rows. */
    public function test_a_legitimate_match_links_both_reports(): void
    {
        $loser = $this->student();
        $finder = $this->student();

        $lost = $this->item($loser, 'lost', 'bags');
        $found = $this->item($finder, 'found', 'bags');

        Sanctum::actingAs($loser);

        $this->postJson("/api/v1/lost-found/{$lost->id}/resolve", [
            'matched_with' => $found->id,
        ])->assertOk();

        $this->assertSame('matched', DB::table('lost_found_items')->where('id', $lost->id)->value('status'));
        $this->assertSame('matched', DB::table('lost_found_items')->where('id', $found->id)->value('status'));
        $this->assertSame($found->id, DB::table('lost_found_items')->where('id', $lost->id)->value('matched_with'));
        $this->assertSame($lost->id, DB::table('lost_found_items')->where('id', $found->id)->value('matched_with'));
    }

    /** Closing with no counterpart is still allowed — "I found it myself". */
    public function test_closing_without_a_match_still_works(): void
    {
        $a = $this->student();
        Sanctum::actingAs($a);
        $mine = $this->item($a, 'lost');

        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve")->assertOk();

        $this->assertSame('resolved', DB::table('lost_found_items')->where('id', $mine->id)->value('status'));
    }

    public function test_only_the_reporter_or_staff_may_resolve(): void
    {
        $owner = $this->student();
        $stranger = $this->student();
        $mine = $this->item($owner, 'lost');

        Sanctum::actingAs($stranger);
        $this->postJson("/api/v1/lost-found/{$mine->id}/resolve")->assertStatus(403);
    }

    /**
     * The candidates endpoint spends money on a model call per request and had no
     * ownership check at all.
     */
    public function test_a_stranger_cannot_run_the_billed_matcher_on_someone_elses_item(): void
    {
        $owner = $this->student();
        $stranger = $this->student();
        $item = $this->item($owner, 'lost');

        Sanctum::actingAs($stranger);
        $this->getJson("/api/v1/lost-found/{$item->id}/candidates")->assertStatus(403);

        Sanctum::actingAs($owner);
        $this->getJson("/api/v1/lost-found/{$item->id}/candidates")->assertOk();
    }
    /* ────────── the four surfaces that were gated on a ROLE alone ────────── */

    /**
     * The safety centre had NO permission at all.
     *
     * `admin/safety/*` was `role:admin,supervisor` while every comparable surface had
     * already been moved to a permission — disputes to `users.manage`, zone prices to
     * `settings.manage`, payments to `payments.approve`. It was simply missed, and it
     * exposes the most sensitive data in the product: GPS-fraud findings, cancellation
     * patterns, and open SOS incidents naming a rider and their live location.
     *
     * Support is the role that proves the gate: it holds `trips.view` and
     * `complaints.view` but must not hold `safety.view`.
     */
    public function test_support_cannot_read_the_safety_centre(): void
    {
        Sanctum::actingAs($this->userWithRole('support', UserType::Support));

        $this->getJson('/api/v1/admin/safety/risk-flags')->assertForbidden();
        $this->getJson('/api/v1/admin/safety/sos')->assertForbidden();
        $this->getJson('/api/v1/admin/safety/cancellations')->assertForbidden();
    }

    /** Supervisors ARE the safety team, so the rota does not escalate every SOS. */
    public function test_supervisor_can_read_the_safety_centre(): void
    {
        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Support));

        $this->getJson('/api/v1/admin/safety/risk-flags')->assertOk();
        $this->getJson('/api/v1/admin/safety/sos')->assertOk();
    }

    /**
     * Reading a safety queue and CLOSING an open SOS are different powers — the same
     * split as `users.view` versus `users.view_pii`. An incident resolved by mistake
     * is a person nobody is looking for any more.
     */
    public function test_resolving_a_safety_incident_needs_its_own_permission(): void
    {
        $role = Role::where('name', 'supervisor')->firstOrFail();
        $view = Permission::where('name', 'safety.view')->firstOrFail();
        // A staff member holding read but not resolve — the shape a future
        // "safety analyst" role would take.
        $role->permissions()->sync([$view->id]);

        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Support));

        // A REAL incident: route-model binding resolves before the inner permission
        // group, so a made-up id would 404 and prove nothing about authorisation.
        $incident = SosIncident::create([
            'user_id' => $this->student()->id,
            'lat' => 32.55, 'lng' => 35.85, 'status' => 'open',
        ]);

        $this->getJson('/api/v1/admin/safety/sos')->assertOk();
        $this->postJson("/api/v1/admin/safety/sos/{$incident->id}/resolve")->assertForbidden();
    }

    /**
     * Running the matcher CREATES TRIPS AND SETS THEIR FARES, so it belongs with the
     * power to set prices. On `role:admin,supervisor` a supervisor deliberately barred
     * from the pricing screen could still mint priced, money-bearing rows by hand.
     */
    public function test_supervisor_cannot_run_the_matcher(): void
    {
        Sanctum::actingAs($this->userWithRole('supervisor', UserType::Support));

        $this->postJson('/api/v1/admin/matching/run')->assertForbidden();
    }

    /**
     * The admin trip and ride-request lists carry every rider's pickup coordinates
     * and travel history — the same class of PII that `admin/users` already gates on
     * `permission:users.view`. Support legitimately holds `trips.view`, so this
     * asserts the permission is CHECKED, not that support is excluded.
     */
    public function test_the_rider_location_lists_require_trips_view(): void
    {
        $role = Role::where('name', 'support')->firstOrFail();
        $role->permissions()->detach(Permission::where('name', 'trips.view')->firstOrFail()->id);

        Sanctum::actingAs($this->userWithRole('support', UserType::Support));

        $this->getJson('/api/v1/admin/trips')->assertForbidden();
        $this->getJson('/api/v1/admin/ride-requests')->assertForbidden();
    }

    /**
     * An APPROVAL permission was being used as a READ permission: `payments.approve`
     * gated the whole wallet ledger, so anyone who could approve one CliQ transfer
     * could read every user's transaction history. `payments.view` is the consistent
     * choice — it is what the payout queue next door already reads with.
     */
    public function test_reading_the_wallet_ledger_needs_payments_view_not_approve(): void
    {
        $role = Role::where('name', 'supervisor')->firstOrFail();
        // Keep approve, drop view: under the old gate this combination could read.
        $role->permissions()->detach(Permission::where('name', 'payments.view')->firstOrFail()->id);

        $staff = $this->userWithRole('supervisor', UserType::Support);
        Sanctum::actingAs($staff);

        $this->getJson('/api/v1/admin/wallets/transactions?user_id='.$this->student()->id)
            ->assertForbidden();
    }
}
