<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Rewards\Services\RewardService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Tests\TestCase;

class RewardsTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'full_name' => 'طالب', 'phone' => '+962790002222', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);
    }

    private function rewards(): RewardService
    {
        return app(RewardService::class);
    }

    public function test_first_ride_grants_base_points_plus_one_time_bonus(): void
    {
        $user = $this->user();
        $svc = $this->rewards();

        $svc->grantForRide($user, 'trip-1');
        // 10 (ride) + 50 (first-ride bonus)
        $this->assertSame(60, $svc->account($user)->points);

        // Second ride: only base points, no second bonus.
        $svc->grantForRide($user, 'trip-2');
        $this->assertSame(70, $svc->account($user)->points);
    }

    public function test_redeem_for_wallet_credits_balance_and_deducts_points(): void
    {
        $user = $this->user();
        $svc = $this->rewards();
        $svc->earn($user, 250, 'seed');

        // 250 points → redeem: 2 JOD chunks (200 points) → 2000 fils, 50 points remain.
        $result = $svc->redeemForWallet($user, 250);

        $this->assertSame(200, $result['points_used']);
        $this->assertSame(2000, $result['credited_fils']);
        $this->assertSame(50, $svc->account($user)->points);

        $wallet = app(WalletService::class)->forUser($user);
        $this->assertSame(2000, $wallet->balance_fils);
    }

    public function test_redeem_below_minimum_is_rejected(): void
    {
        $user = $this->user();
        $this->rewards()->earn($user, 50, 'seed');

        $this->expectException(BusinessRuleException::class);
        $this->rewards()->redeemForWallet($user, 50);
    }

    public function test_redeem_more_than_balance_is_rejected(): void
    {
        $user = $this->user();
        $this->rewards()->earn($user, 100, 'seed');

        $this->expectException(BusinessRuleException::class);
        $this->rewards()->redeemForWallet($user, 200);
    }

    public function test_redemption_options_are_in_jod_chunks(): void
    {
        $options = $this->rewards()->redemptionOptions();
        $this->assertSame(100, $options[0]['points']);
        $this->assertSame(1000, $options[0]['credit_fils']);
    }

    public function test_new_account_has_valid_default_tier(): void
    {
        // Regression: a freshly-created reward account must expose a non-null tier
        // (previously firstOrCreate left tier null → /rewards 500'd for new users).
        $account = $this->rewards()->account($this->user());

        $this->assertNotNull($account->tier);
        $this->assertSame('bronze', $account->tier->value);
        $this->assertSame(0, $account->points);
    }
}
