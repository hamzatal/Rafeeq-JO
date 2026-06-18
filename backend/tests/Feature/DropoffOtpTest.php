<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * End-to-end coverage for the drop-off OTP (both-ends confirmation) anti-fraud
 * control: boarding issues a drop-off code, the captain confirms the drop-off
 * with it, and ending a trip with unconfirmed riders raises a risk flag.
 */
class DropoffOtpTest extends TestCase
{
    use RefreshDatabase;

    private function makeDriver(): array
    {
        Role::firstOrCreate(['name' => 'driver'], ['label_ar' => 'كابتن', 'label_en' => 'Driver']);

        $user = User::create([
            'full_name' => 'Captain Test',
            'phone' => '0790000001',
            'password' => 'secret-pass',
            'type' => UserType::Driver,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $user->assignRole('driver');

        $driver = DriverProfile::create([
            'user_id' => $user->id,
            'status' => DriverStatus::Approved,
            'verification_level' => 1,
        ]);

        return [$user, $driver];
    }

    private function makeStudentWithSubscription(Route $route): array
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);

        $student = User::create([
            'full_name' => 'Student Test',
            'phone' => '0790000002',
            'password' => 'secret-pass',
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $student->assignRole('student');

        $plan = SubscriptionPlan::create([
            'name' => 'Monthly',
            'type' => SubscriptionType::Monthly,
            'price_fils' => 20000,
            'rides_count' => 30,
            'duration_days' => 30,
            'is_active' => true,
        ]);

        $sub = Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $plan->id,
            'route_id' => $route->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(29),
            'remaining_rides' => 30,
        ]);

        return [$student, $sub];
    }

    private function makeRoute(): Route
    {
        $uni = University::create([
            'name_ar' => 'جامعة اختبار',
            'name_en' => 'Test University',
            'code' => 'TST',
            'city' => 'Irbid',
            'is_active' => true,
        ]);

        return Route::create([
            'university_id' => $uni->id,
            'name' => 'Test Route',
            'price_fils' => 1000,
            'capacity' => 4,
            'is_active' => true,
        ]);
    }

    public function test_boarding_issues_dropoff_code_and_captain_confirms_dropoff(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();
        [$student, $sub] = $this->makeStudentWithSubscription($route);

        /** @var TripService $service */
        $service = app(TripService::class);

        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $passenger = $service->book($student, $trip);

        // Boarding issues the drop-off OTP.
        $service->start($trip->fresh());
        $boarded = $service->confirmBoarding($trip->fresh(), $passenger->boarding_code);

        $this->assertSame(TripPassengerStatus::Onboard, $boarded->status);
        $this->assertNotNull($boarded->dropoff_code, 'A drop-off code must be issued on boarding.');
        $this->assertNull($boarded->dropoff_confirmed_at);

        // Captain confirms the drop-off through the HTTP endpoint.
        Sanctum::actingAs($driverUser);
        $this->postJson("/api/v1/driver/trips/{$trip->id}/dropoff", ['code' => $boarded->dropoff_code])
            ->assertOk();

        $after = TripPassenger::find($boarded->id);
        $this->assertSame(TripPassengerStatus::Dropped->value, $after->status->value);
        $this->assertNotNull($after->dropoff_confirmed_at, 'Drop-off must be timestamped on confirmation.');
    }

    public function test_wrong_dropoff_code_is_rejected(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();
        [$student] = $this->makeStudentWithSubscription($route);

        /** @var TripService $service */
        $service = app(TripService::class);
        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $passenger = $service->book($student, $trip);
        $service->start($trip->fresh());
        $service->confirmBoarding($trip->fresh(), $passenger->boarding_code);

        Sanctum::actingAs($driverUser);
        $this->postJson("/api/v1/driver/trips/{$trip->id}/dropoff", ['code' => '0000'])
            ->assertStatus(422);
    }

    public function test_ending_trip_with_unconfirmed_dropoff_raises_risk_flag(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();
        [$student] = $this->makeStudentWithSubscription($route);

        /** @var TripService $service */
        $service = app(TripService::class);
        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $passenger = $service->book($student, $trip);
        $service->start($trip->fresh());
        $service->confirmBoarding($trip->fresh(), $passenger->boarding_code);

        // Captain ends the trip WITHOUT confirming the drop-off OTP.
        $service->end($trip->fresh());

        $this->assertDatabaseHas('risk_flags', [
            'user_id' => $driverUser->id,
            'type' => 'trip_ended_without_dropoff_otp',
        ]);

        $after = TripPassenger::find($passenger->id);
        $this->assertSame(TripPassengerStatus::Dropped->value, $after->status->value);
        $this->assertNull($after->dropoff_confirmed_at, 'Auto-dropped riders must not be marked OTP-confirmed.');
    }
}
