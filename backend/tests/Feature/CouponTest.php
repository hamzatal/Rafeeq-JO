<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Coupons\Models\CouponRedemption;
use Rafeeq\Modules\Coupons\Services\CouponService;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;
use Tests\TestCase;

class CouponTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'full_name' => 'طالب', 'phone' => '+962790001111', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);
    }

    private function service(): CouponService
    {
        return app(CouponService::class);
    }

    public function test_percentage_coupon_with_cap(): void
    {
        $coupon = Coupon::create([
            'code' => 'SAVE20', 'type' => CouponType::Percentage, 'value' => 20,
            'max_discount_fils' => 1500, 'scope' => CouponScope::Any, 'is_active' => true,
        ]);

        // 20% of 10 JOD = 2 JOD, but capped at 1.5 JOD.
        $this->assertSame(1500, $this->service()->computeDiscount($coupon, 10000));
        // 20% of 5 JOD = 1 JOD (below cap).
        $this->assertSame(1000, $this->service()->computeDiscount($coupon, 5000));
    }

    public function test_fixed_coupon_never_exceeds_amount(): void
    {
        $coupon = Coupon::create([
            'code' => 'FLAT5', 'type' => CouponType::Fixed, 'value' => 5000,
            'scope' => CouponScope::Any, 'is_active' => true,
        ]);

        $this->assertSame(5000, $this->service()->computeDiscount($coupon, 8000));
        $this->assertSame(3000, $this->service()->computeDiscount($coupon, 3000)); // clamped
    }

    public function test_validate_returns_discount_and_final(): void
    {
        Coupon::create([
            'code' => 'WELCOME', 'type' => CouponType::Fixed, 'value' => 2000,
            'scope' => CouponScope::Subscription, 'is_active' => true,
        ]);

        $result = $this->service()->validate('welcome', $this->user(), CouponScope::Subscription, 10000);

        $this->assertSame(2000, $result['discount_fils']);
        $this->assertSame(8000, $result['final_fils']);
    }

    public function test_scope_mismatch_is_rejected(): void
    {
        Coupon::create([
            'code' => 'SUBONLY', 'type' => CouponType::Fixed, 'value' => 1000,
            'scope' => CouponScope::Subscription, 'is_active' => true,
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service()->validate('SUBONLY', $this->user(), CouponScope::WalletTopup, 5000);
    }

    public function test_min_amount_is_enforced(): void
    {
        Coupon::create([
            'code' => 'BIG', 'type' => CouponType::Fixed, 'value' => 1000,
            'min_amount_fils' => 10000, 'scope' => CouponScope::Any, 'is_active' => true,
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service()->validate('BIG', $this->user(), CouponScope::Any, 5000);
    }

    public function test_expired_coupon_is_rejected(): void
    {
        Coupon::create([
            'code' => 'OLD', 'type' => CouponType::Fixed, 'value' => 1000,
            'scope' => CouponScope::Any, 'is_active' => true,
            'expires_at' => now()->subDay(),
        ]);

        $this->expectException(BusinessRuleException::class);
        $this->service()->validate('OLD', $this->user(), CouponScope::Any, 5000);
    }

    public function test_per_user_limit_blocks_second_use(): void
    {
        $user = $this->user();
        $coupon = Coupon::create([
            'code' => 'ONCE', 'type' => CouponType::Fixed, 'value' => 1000,
            'scope' => CouponScope::Any, 'is_active' => true, 'per_user_limit' => 1,
        ]);

        $this->service()->redeem($coupon, $user, 1000);

        $this->expectException(BusinessRuleException::class);
        $this->service()->validate('ONCE', $user, CouponScope::Any, 5000);
    }

    public function test_redeem_increments_usage_and_records_redemption(): void
    {
        $user = $this->user();
        $coupon = Coupon::create([
            'code' => 'GO', 'type' => CouponType::Fixed, 'value' => 1000,
            'scope' => CouponScope::Any, 'is_active' => true, 'usage_limit' => 2,
        ]);

        $this->service()->redeem($coupon, $user, 1000, 'payment_request', 'abc');

        $this->assertSame(1, $coupon->fresh()->used_count);
        $this->assertSame(1, CouponRedemption::where('coupon_id', $coupon->id)->count());
    }

    public function test_total_usage_limit_blocks_redeem(): void
    {
        $user = $this->user();
        $coupon = Coupon::create([
            'code' => 'LIMIT1', 'type' => CouponType::Fixed, 'value' => 1000,
            'scope' => CouponScope::Any, 'is_active' => true, 'usage_limit' => 1,
        ]);

        $this->service()->redeem($coupon, $user, 1000);

        $this->expectException(BusinessRuleException::class);
        $this->service()->redeem($coupon, $user, 1000);
    }
}
