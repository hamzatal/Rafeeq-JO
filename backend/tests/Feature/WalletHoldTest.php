<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Models\Wallet;
use Rafeeq\Modules\Wallet\Models\WalletHold;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

class WalletHoldTest extends TestCase
{
    use RefreshDatabase;

    private function wallets(): WalletService
    {
        return app(WalletService::class);
    }

    private function fundedStudent(int $balanceFils): array
    {
        $user = User::create([
            'full_name' => 'Rider', 'phone' => '0790000010', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $wallet = $this->wallets()->forUser($user);
        $this->wallets()->credit($wallet, $balanceFils, WalletTxnType::Topup, 'شحن');

        return [$user, $wallet->fresh()];
    }

    public function test_hold_reserves_funds_without_moving_money(): void
    {
        [, $wallet] = $this->fundedStudent(5000);

        $hold = $this->wallets()->hold($wallet, 1000, 'trip-x', 'حجز رحلة');

        $this->assertSame(WalletHold::STATUS_ACTIVE, $hold->status);
        $fresh = $wallet->fresh();
        $this->assertSame(5000, $fresh->balance_fils, 'Balance must not change on hold.');
        $this->assertSame(1000, $fresh->held_fils);
        $this->assertSame(4000, $this->wallets()->availableBalance($fresh));
    }

    public function test_capture_debits_balance_and_clears_reservation(): void
    {
        [, $wallet] = $this->fundedStudent(5000);
        $hold = $this->wallets()->hold($wallet, 1000, 'trip-x');

        $this->wallets()->capture($hold, 1000, WalletTxnType::RidePayment, 'دفع رحلة', 'trip-x');

        $fresh = $wallet->fresh();
        $this->assertSame(4000, $fresh->balance_fils);
        $this->assertSame(0, $fresh->held_fils);
        $this->assertSame(WalletHold::STATUS_CAPTURED, $hold->fresh()->status);
    }

    public function test_release_frees_reserved_funds(): void
    {
        [, $wallet] = $this->fundedStudent(5000);
        $hold = $this->wallets()->hold($wallet, 1000, 'trip-x');

        $this->wallets()->release($hold);

        $fresh = $wallet->fresh();
        $this->assertSame(5000, $fresh->balance_fils);
        $this->assertSame(0, $fresh->held_fils);
        $this->assertSame(WalletHold::STATUS_RELEASED, $hold->fresh()->status);
    }

    public function test_hold_fails_when_available_balance_is_insufficient(): void
    {
        [, $wallet] = $this->fundedStudent(1000);

        $this->expectException(BusinessRuleException::class);
        $this->wallets()->hold($wallet, 1500, 'trip-x');
    }

    public function test_trip_start_holds_fare_and_boarding_captures_it(): void
    {
        [$student, $wallet] = $this->fundedStudent(5000);

        $captainUser = User::create([
            'full_name' => 'Cap', 'phone' => '0790000011', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create([
            'user_id' => $captainUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1,
        ]);

        // Wallet-paying pooled trip (no subscription covering the ride).
        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'base_fare_fils' => 1000,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1234',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        /** @var TripService $service */
        $service = app(TripService::class);

        // Start the trip → fare is reserved.
        $service->start($trip);
        $afterStart = $wallet->fresh();
        $this->assertSame(1000, $afterStart->held_fils, 'Fare must be held at trip start.');
        $this->assertSame(4000, $this->wallets()->availableBalance($afterStart));

        // Boarding → hold captured (student debited, captain paid their share).
        $service->confirmBoarding($trip->fresh(), '1234');

        $afterBoard = $wallet->fresh();
        $this->assertSame(4000, $afterBoard->balance_fils, 'Student debited the fare.');
        $this->assertSame(0, $afterBoard->held_fils, 'Hold cleared after capture.');

        $captainWallet = Wallet::where('user_id', $captainUser->id)->first();
        $this->assertNotNull($captainWallet);
        $this->assertSame(850, $captainWallet->balance_fils, 'Captain credited fare minus 15% commission.');

        $this->assertNotNull($passenger->fresh()->paid_at);
    }

    public function test_cancelling_a_trip_releases_the_hold(): void
    {
        [$student, $wallet] = $this->fundedStudent(5000);

        $captainUser = User::create([
            'full_name' => 'Cap2', 'phone' => '0790000012', 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $driver = DriverProfile::create([
            'user_id' => $captainUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1,
        ]);

        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'base_fare_fils' => 1000,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::Scheduled, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '4321',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        /** @var TripService $service */
        $service = app(TripService::class);
        $service->start($trip);
        $this->assertSame(1000, $wallet->fresh()->held_fils);

        $service->cancel($trip->fresh(), $captainUser, 'driver', 'test');

        $this->assertSame(0, $wallet->fresh()->held_fils, 'Hold released on cancellation.');
        $this->assertSame(5000, $wallet->fresh()->balance_fils);
    }
}
