<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Coupons\Models\Coupon;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Regression: a ride coupon whose discount exceeds the platform commission must
 * NOT mint wallet money. The discount is capped at the commission so the amount
 * debited from the student always equals the amount credited to the captain
 * (the wallet ledger stays zero-sum; the platform simply earns no commission).
 */
class CouponLedgerZeroSumTest extends TestCase
{
    use RefreshDatabase;

    public function test_ride_coupon_over_commission_does_not_mint_balance(): void
    {
        $wallets = app(WalletService::class);

        $student = User::create([
            'full_name' => 'Rider', 'phone' => '0790000501', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $wallet = $wallets->forUser($student);
        $wallets->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');

        $captainUser = User::create([
            'full_name' => 'Cap', 'phone' => '0790000502', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create([
            'user_id' => $captainUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1,
        ]);

        // 100%-off ride coupon (far larger than the 15% commission).
        Coupon::create([
            'code' => 'FREERIDE', 'type' => CouponType::Percentage, 'value' => 100,
            'min_amount_fils' => 0, 'scope' => CouponScope::Ride,
            'first_order_only' => false, 'used_count' => 0, 'is_active' => true,
        ]);

        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'base_fare_fils' => 1000,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '3333',
            'coupon_code' => 'FREERIDE', 'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        /** @var TripService $service */
        $service = app(TripService::class);
        $service->start($trip);
        $service->confirmBoarding($trip->fresh(), '3333');

        // fare=1000, commission=15%=150. Discount capped at 150 → student pays 850.
        $studentWallet = $wallet->fresh();
        $captainWallet = Wallet::where('user_id', $captainUser->id)->first();

        $studentPaid = 5000 - $studentWallet->balance_fils;
        $this->assertSame(850, $studentPaid, 'Student pays fare minus the capped discount.');
        $this->assertSame(850, $captainWallet->balance_fils, 'Captain credited fare minus commission.');

        // Zero-sum: what left the student equals what reached the captain — no
        // unbacked balance was created anywhere in the ledger.
        $this->assertSame($studentPaid, $captainWallet->balance_fils, 'Wallet ledger stays zero-sum.');
    }
}
