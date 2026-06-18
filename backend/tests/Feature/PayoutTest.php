<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

class PayoutTest extends TestCase
{
    use RefreshDatabase;

    private function makeCaptain(int $earningsFils = 20000): User
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);
        $u = User::create(['full_name' => 'Captain Zaid', 'phone' => '0790000001', 'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('driver');
        DriverProfile::create(['user_id' => $u->id, 'status' => DriverStatus::Approved, 'verification_level' => 1, 'rating_avg' => 4.8, 'total_trips' => 30]);

        if ($earningsFils > 0) {
            $wallets = app(WalletService::class);
            $wallets->credit($wallets->forUser($u), $earningsFils, WalletTxnType::Adjustment, 'seed earnings');
        }

        return $u;
    }

    private function makeAdmin(): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = User::create(['full_name' => 'Admin', 'phone' => '0790000002', 'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('admin');

        return $u;
    }

    public function test_captain_requests_payout_and_wallet_is_debited(): void
    {
        $captain = $this->makeCaptain(20000);

        Sanctum::actingAs($captain);
        $this->postJson('/api/v1/driver/wallet/withdrawals', ['amount_fils' => 10000, 'destination' => '0790000001'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('wallets', ['user_id' => $captain->id, 'balance_fils' => 10000]);
        $this->assertDatabaseHas('payout_requests', ['captain_user_id' => $captain->id, 'amount_fils' => 10000, 'status' => 'pending']);
    }

    public function test_payout_below_minimum_is_rejected(): void
    {
        $captain = $this->makeCaptain(20000);

        Sanctum::actingAs($captain);
        $this->postJson('/api/v1/driver/wallet/withdrawals', ['amount_fils' => 1000])->assertStatus(422);
    }

    public function test_payout_exceeding_earnings_is_rejected(): void
    {
        $captain = $this->makeCaptain(20000);

        Sanctum::actingAs($captain);
        $this->postJson('/api/v1/driver/wallet/withdrawals', ['amount_fils' => 50000])->assertStatus(422);

        // Wallet untouched.
        $this->assertDatabaseHas('wallets', ['user_id' => $captain->id, 'balance_fils' => 20000]);
    }

    public function test_admin_approves_payout(): void
    {
        $captain = $this->makeCaptain(20000);
        $admin = $this->makeAdmin();

        Sanctum::actingAs($captain);
        $id = $this->postJson('/api/v1/driver/wallet/withdrawals', ['amount_fils' => 8000])->json('data.id');

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/withdrawals/{$id}/approve")->assertOk()->assertJsonPath('data.status', 'paid');

        // Funds stay debited after payment.
        $this->assertDatabaseHas('wallets', ['user_id' => $captain->id, 'balance_fils' => 12000]);
    }

    public function test_admin_rejects_payout_and_credits_back(): void
    {
        $captain = $this->makeCaptain(20000);
        $admin = $this->makeAdmin();

        Sanctum::actingAs($captain);
        $id = $this->postJson('/api/v1/driver/wallet/withdrawals', ['amount_fils' => 8000])->json('data.id');
        $this->assertDatabaseHas('wallets', ['user_id' => $captain->id, 'balance_fils' => 12000]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/withdrawals/{$id}/reject", ['reason' => 'بيانات CliQ ناقصة'])
            ->assertOk()->assertJsonPath('data.status', 'rejected');

        // Reserved funds returned.
        $this->assertDatabaseHas('wallets', ['user_id' => $captain->id, 'balance_fils' => 20000]);
        $this->assertSame('rejected', PayoutRequest::find($id)->status);
    }

    public function test_captain_performance_returns_tier_and_earnings(): void
    {
        $captain = $this->makeCaptain(15000);

        Sanctum::actingAs($captain);
        $this->getJson('/api/v1/driver/performance')
            ->assertOk()
            ->assertJsonPath('data.tier', 'bronze')
            ->assertJsonPath('data.available_earnings_fils', 15000)
            ->assertJsonPath('data.total_trips', 30);
    }
}
