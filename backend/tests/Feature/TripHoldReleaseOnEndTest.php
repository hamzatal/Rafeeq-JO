<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Enums\WalletTxnType;
use Tests\TestCase;

/**
 * Regression: a rider who booked a wallet-paid seat, the trip started (fare
 * held), but never boarded must NOT have their funds locked forever once the
 * trip ends. The hold must be released and the rider marked no-show.
 */
class TripHoldReleaseOnEndTest extends TestCase
{
    use RefreshDatabase;

    public function test_ending_a_trip_releases_holds_for_unboarded_riders(): void
    {
        $wallets = app(WalletService::class);

        $student = User::create([
            'full_name' => 'Rider', 'phone' => '0790000301', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $wallet = $wallets->forUser($student);
        $wallets->credit($wallet, 5000, WalletTxnType::Topup, 'شحن');

        $captainUser = User::create([
            'full_name' => 'Cap', 'phone' => '0790000302', 'password' => 'secret-pass',
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
        $passenger = TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $student->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '2222',
            'pickup_lat' => 32.5, 'pickup_lng' => 35.85,
        ]);

        /** @var TripService $service */
        $service = app(TripService::class);

        $service->start($trip);
        $this->assertSame(1000, $wallet->fresh()->held_fils, 'Fare held at start.');

        // Trip ends WITHOUT the rider ever boarding.
        $service->end($trip->fresh());

        $fresh = $wallet->fresh();
        $this->assertSame(0, $fresh->held_fils, 'Hold must be released on trip completion.');
        $this->assertSame(5000, $fresh->balance_fils, 'No money should have moved.');
        $this->assertSame(TripPassengerStatus::NoShow, $passenger->fresh()->status, 'Unboarded rider marked no-show.');
    }
}
