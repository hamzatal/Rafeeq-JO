<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Tests\TestCase;

/** Paying for a subscription directly from wallet balance (instant activation). */
class WalletSubscriptionPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function student(string $phone): User
    {
        $this->seed(\Database\Seeders\RolesPermissionsSeeder::class);
        $user = User::create([
            'full_name' => 'طالب', 'phone' => $phone, 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);
        $user->syncRoles(['student']);

        return $user;
    }

    private function plan(int $priceFils = 5000): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => 'باقة شهرية', 'type' => 'monthly',
            'price_fils' => $priceFils, 'rides_count' => 40, 'duration_days' => 30, 'is_active' => true,
        ]);
    }

    private function pendingSub(User $u, SubscriptionPlan $p): Subscription
    {
        return Subscription::create([
            'student_id' => $u->id, 'plan_id' => $p->id, 'status' => 'pending', 'remaining_rides' => $p->rides_count,
        ]);
    }

    public function test_pays_from_wallet_and_activates_when_balance_is_enough(): void
    {
        $user = $this->student('+962790001111');
        $plan = $this->plan(5000);
        $sub = $this->pendingSub($user, $plan);
        Wallet::create(['user_id' => $user->id, 'balance_fils' => 8000]);

        $this->actingAs($user)
            ->postJson("/api/v1/subscriptions/{$sub->id}/pay-wallet")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertSame('active', $sub->fresh()->status->value);
        // 8000 - 5000 = 3000 fils remaining.
        $this->assertSame(3000, Wallet::where('user_id', $user->id)->value('balance_fils'));
    }

    public function test_rejects_when_balance_is_insufficient(): void
    {
        $user = $this->student('+962790002222');
        $plan = $this->plan(5000);
        $sub = $this->pendingSub($user, $plan);
        Wallet::create(['user_id' => $user->id, 'balance_fils' => 1000]);

        $this->actingAs($user)
            ->postJson("/api/v1/subscriptions/{$sub->id}/pay-wallet")
            ->assertStatus(422);

        // Unchanged: still pending, balance intact.
        $this->assertSame('pending', $sub->fresh()->status->value);
        $this->assertSame(1000, Wallet::where('user_id', $user->id)->value('balance_fils'));
    }
}
