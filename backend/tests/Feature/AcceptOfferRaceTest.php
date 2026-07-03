<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class AcceptOfferRaceTest extends TestCase
{
    use RefreshDatabase;

    private function captain(string $phone): User
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);
        $user = User::create([
            'full_name' => 'Cap', 'phone' => $phone, 'password' => 'secret-pass',
            'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $user->assignRole('driver');
        DriverProfile::create(['user_id' => $user->id, 'status' => DriverStatus::Approved, 'verification_level' => 1]);

        return $user;
    }

    public function test_only_one_captain_can_claim_a_pooled_offer(): void
    {
        $capA = $this->captain('0790000041');
        $capB = $this->captain('0790000042');

        $trip = Trip::create([
            'driver_id' => null, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'base_fare_fils' => 1000,
            'scheduled_at' => now()->addHour(), 'status' => TripStatus::PendingDriver, 'capacity' => 4,
        ]);

        // First captain claims it → success.
        $this->actingAs($capA)
            ->postJson("/api/v1/driver/trips/offers/{$trip->id}/accept")
            ->assertOk();

        // Second captain tries the same offer → rejected (already taken).
        $this->actingAs($capB)
            ->postJson("/api/v1/driver/trips/offers/{$trip->id}/accept")
            ->assertStatus(422);

        // The trip belongs to captain A only.
        $this->assertSame($capA->driverProfile->id, $trip->fresh()->driver_id);
    }
}
