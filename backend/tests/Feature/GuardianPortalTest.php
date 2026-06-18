<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Guardians\Models\GuardianLink;
use Rafeeq\Modules\Guardians\Services\GuardianService;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Coverage for the Guardian (parent) portal: link management, live-trip
 * visibility, safe-arrival log, SOS relay, authorisation, and the boarding/
 * drop-off guardian alerts wired into the trip flow.
 */
class GuardianPortalTest extends TestCase
{
    use RefreshDatabase;

    private function seedRoles(): void
    {
        foreach ([['student', 'طالب'], ['driver', 'كابتن'], ['guardian', 'ولي أمر']] as [$n, $ar]) {
            Role::firstOrCreate(['name' => $n], ['label_ar' => $ar, 'label_en' => $n]);
        }
    }

    private function makeStudent(string $phone = '0790000010'): User
    {
        $student = User::create([
            'full_name' => 'Student Test',
            'phone' => $phone,
            'type' => UserType::Student,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $student->assignRole('student');

        return $student;
    }

    private function makeDriver(): array
    {
        $user = User::create([
            'full_name' => 'Captain Zaid',
            'phone' => '0790000020',
            'type' => UserType::Driver,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $user->assignRole('driver');

        $driver = DriverProfile::create([
            'user_id' => $user->id,
            'status' => DriverStatus::Approved,
            'verification_level' => 1,
            'rating_avg' => 4.9,
            'total_trips' => 120,
        ]);

        return [$user, $driver];
    }

    private function makeRoute(): Route
    {
        $uni = University::create([
            'name_ar' => 'الجامعة الأردنية',
            'name_en' => 'University of Jordan',
            'code' => 'UJ',
            'city' => 'Amman',
            'is_active' => true,
        ]);

        return Route::create([
            'university_id' => $uni->id,
            'name' => 'خلدا - الجامعة الأردنية',
            'price_fils' => 1000,
            'capacity' => 4,
            'is_active' => true,
        ]);
    }

    private function giveSubscription(User $student, Route $route): void
    {
        $plan = SubscriptionPlan::create([
            'name' => 'Monthly',
            'type' => SubscriptionType::Monthly,
            'price_fils' => 20000,
            'rides_count' => 30,
            'duration_days' => 30,
            'is_active' => true,
        ]);

        Subscription::create([
            'student_id' => $student->id,
            'plan_id' => $plan->id,
            'route_id' => $route->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(29),
            'remaining_rides' => 30,
        ]);
    }

    public function test_student_links_a_guardian_and_guardian_account_is_created(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();

        Sanctum::actingAs($student);
        $res = $this->postJson('/api/v1/student/guardians', [
            'phone' => '0791112222',
            'relation' => 'father',
            'name' => 'أبو أحمد',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['phone' => '0791112222', 'type' => 'guardian']);
        $this->assertDatabaseHas('guardian_links', [
            'student_user_id' => $student->id,
            'relation' => 'father',
            'status' => 'active',
        ]);

        $guardian = User::where('phone', '0791112222')->first();
        $this->assertTrue($guardian->hasRole('guardian'));
    }

    public function test_guardian_sees_their_children(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();
        $guardian = (app(GuardianService::class))->linkByStudent($student, '0791112222', 'mother')->guardian;

        Sanctum::actingAs($guardian);
        $this->getJson('/api/v1/guardian/children')
            ->assertOk()
            ->assertJsonFragment(['student_user_id' => $student->id]);
    }

    public function test_guardian_can_track_active_trip_and_sees_captain(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();

        $guardian = app(GuardianService::class)->linkByStudent($student, '0791112222')->guardian;
        $this->giveSubscription($student, $route);

        /** @var TripService $service */
        $service = app(TripService::class);
        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $passenger = $service->book($student, $trip);
        $service->start($trip->fresh());
        $service->confirmBoarding($trip->fresh(), $passenger->boarding_code);
        $service->pushLocation($trip->fresh(), 31.95, 35.91, 40.0);

        Sanctum::actingAs($guardian);
        $this->getJson("/api/v1/guardian/students/{$student->id}/live")
            ->assertOk()
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.captain.name', 'Captain Zaid')
            ->assertJsonPath('data.captain.rating', 4.9);
    }

    public function test_boarding_and_dropoff_notify_the_guardian(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();

        $guardian = app(GuardianService::class)->linkByStudent($student, '0791112222')->guardian;
        $this->giveSubscription($student, $route);

        /** @var TripService $service */
        $service = app(TripService::class);
        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $passenger = $service->book($student, $trip);
        $service->start($trip->fresh());
        $boarded = $service->confirmBoarding($trip->fresh(), $passenger->boarding_code);

        // Guardian gets a departure alert on boarding.
        $this->assertDatabaseHas('rafeeq_notifications', [
            'user_id' => $guardian->id,
            'type' => 'boarding_confirmed',
        ]);

        $service->confirmDropoff($trip->fresh(), $boarded->dropoff_code);

        // Guardian gets a safe-arrival alert on drop-off.
        $this->assertDatabaseHas('rafeeq_notifications', [
            'user_id' => $guardian->id,
            'type' => 'dropoff_confirmed',
        ]);
    }

    public function test_guardian_can_relay_sos_for_linked_student(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();
        $guardian = app(GuardianService::class)->linkByStudent($student, '0791112222')->guardian;

        Sanctum::actingAs($guardian);
        $this->postJson("/api/v1/guardian/students/{$student->id}/sos", ['note' => 'لا يرد على الهاتف'])
            ->assertCreated();

        $this->assertDatabaseHas('sos_incidents', [
            'user_id' => $student->id,
            'status' => 'open',
        ]);
    }

    public function test_guardian_cannot_track_an_unlinked_student(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent('0790000010');
        $other = $this->makeStudent('0790000011');
        $guardian = app(GuardianService::class)->linkByStudent($student, '0791112222')->guardian;

        Sanctum::actingAs($guardian);
        $this->getJson("/api/v1/guardian/students/{$other->id}/live")
            ->assertStatus(403);
    }

    public function test_student_can_revoke_a_guardian(): void
    {
        $this->seedRoles();
        $student = $this->makeStudent();
        $link = app(GuardianService::class)->linkByStudent($student, '0791112222');

        Sanctum::actingAs($student);
        $this->deleteJson("/api/v1/student/guardians/{$link->id}")->assertOk();

        $this->assertDatabaseHas('guardian_links', ['id' => $link->id, 'status' => 'revoked']);
    }
}
