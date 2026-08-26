<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * A support supervisor legitimately approves CliQ receipts — that only confirms
 * a transfer the bank already made. It must NOT be able to mint balance out of
 * nothing, reverse the ledger, or pay money out.
 *
 * Before the split these three lived behind `payments.approve`, which the
 * supervisor role holds, so one non-admin role could credit a wallet and then
 * approve its withdrawal: a complete cash-extraction loop with no admin
 * involved and no second pair of eyes.
 */
class FinancialDutySeparationTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        // The duty split lives in the roles/permissions seeder, so it must run.
        $this->seed(RolesPermissionsSeeder::class);
    }

    private function make(UserType $type, string $role): User
    {
        $user = User::create([
            'full_name' => 'Test '.$role,
            'phone' => '07900001'.str_pad((string) ++$this->seq, 2, '0', STR_PAD_LEFT),
            'type' => $type,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $user->assignRole($role);

        return $user->fresh('roles');
    }

    private function staff(string $role): User
    {
        return $this->make(UserType::from($role), $role);
    }

    private function student(): User
    {
        return $this->make(UserType::Student, 'student');
    }

    public function test_supervisor_cannot_credit_a_wallet(): void
    {
        Sanctum::actingAs($this->staff('supervisor'));

        $this->postJson('/api/v1/admin/wallets/credit', [
            'user_id' => $this->student()->id,
            'amount_fils' => 5000,
            'reason' => 'attempting a manual credit',
        ])
            ->assertForbidden();
    }

    public function test_supervisor_cannot_reverse_a_wallet_entry(): void
    {
        $student = $this->student();
        $wallet = app(WalletService::class)->forUser($student);
        $txn = app(WalletService::class)->adminTopup($wallet, 5000, 'SEED-1', 'seeded for the test', null);

        Sanctum::actingAs($this->staff('supervisor'));

        $this->postJson('/api/v1/admin/wallets/reverse', [
            'transaction_id' => $txn->id,
            'reason' => 'attempting a reversal',
        ])
            ->assertForbidden();
    }

    public function test_admin_can_credit_a_wallet(): void
    {
        Sanctum::actingAs($this->staff('admin'));

        $this->postJson('/api/v1/admin/wallets/credit', [
            'user_id' => $this->student()->id,
            'amount_fils' => 5000,
            'reason' => 'verified CliQ transfer 8837201',
        ])
            ->assertOk();
    }

    /** The manual credit path used to accept min:1 with no ceiling at all. */
    public function test_manual_credit_is_capped(): void
    {
        $over = (int) config('rafeeq.admin_credit_max_fils', 50000) + 1;

        Sanctum::actingAs($this->staff('admin'));

        $this->postJson('/api/v1/admin/wallets/credit', [
            'user_id' => $this->student()->id,
            'amount_fils' => $over,
            'reason' => 'attempting to exceed the ceiling',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('amount_fils');
    }

    public function test_manual_credit_requires_a_reason(): void
    {
        Sanctum::actingAs($this->staff('admin'));

        $this->postJson('/api/v1/admin/wallets/credit', [
            'user_id' => $this->student()->id,
            'amount_fils' => 5000,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');
    }

    public function test_manual_credit_is_recorded_in_the_audit_trail(): void
    {
        $admin = $this->staff('admin');
        $student = $this->student();

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/admin/wallets/credit', [
            'user_id' => $student->id,
            'amount_fils' => 7000,
            'reason' => 'verified CliQ transfer 8837202',
        ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'wallet.admin_credit',
            'user_id' => $admin->id,
        ]);
    }
}
