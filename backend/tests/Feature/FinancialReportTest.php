<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Permission;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        // 'admin' role is a permission superuser (bypasses analytics.view check).
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = User::create(['full_name' => 'Admin', 'phone' => '0790000002', 'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('admin');

        return $u;
    }

    private function seedPaidRide(): string
    {
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UJ', 'city' => 'Amman', 'is_active' => true]);
        $route = Route::create(['university_id' => $uni->id, 'name' => 'R', 'price_fils' => 5000, 'capacity' => 4, 'is_active' => true]);

        $driverUser = User::create(['full_name' => 'Cap', 'phone' => '0790000050', 'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $driver = DriverProfile::create(['user_id' => $driverUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1]);

        $student = User::create(['full_name' => 'Stu', 'phone' => '0790000051', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);

        $zoneId = (string) \Illuminate\Support\Str::uuid();
        $trip = Trip::create([
            'route_id' => $route->id,
            'driver_id' => $driver->id,
            'zone_id' => $zoneId,
            'scheduled_at' => now(),
            'status' => TripStatus::Completed,
            'capacity' => 4,
            'fare_fils' => 5000,
        ]);

        TripPassenger::create([
            'trip_id' => $trip->id,
            'student_id' => $student->id,
            'status' => TripPassengerStatus::Dropped,
            'boarding_code' => '1234',
            'fare_fils' => 5000,
            'commission_fils' => 500,
            'captain_share_fils' => 4500,
            'paid_at' => now(),
        ]);

        // A paid payout to the captain.
        PayoutRequest::create([
            'captain_user_id' => $driverUser->id,
            'amount_fils' => 4000,
            'method' => 'cliq',
            'status' => PayoutRequest::STATUS_PAID,
            'processed_at' => now(),
        ]);

        return $zoneId;
    }

    public function test_financial_summary_aggregates_rides_and_payouts(): void
    {
        $zoneId = $this->seedPaidRide();
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);
        $res = $this->getJson('/api/v1/admin/reports/financial')->assertOk();

        $res->assertJsonPath('data.rides_count', 1)
            ->assertJsonPath('data.gross_fare_fils', 5000)
            ->assertJsonPath('data.commission_fils', 500)
            ->assertJsonPath('data.captain_earnings_fils', 4500)
            ->assertJsonPath('data.payouts_paid_fils', 4000);

        $this->assertNotEmpty($res->json('data.by_zone'));
        $this->assertSame($zoneId, $res->json('data.by_zone.0.zone_id'));
    }

    public function test_zone_filter_excludes_other_zones(): void
    {
        $this->seedPaidRide();
        $admin = $this->makeAdmin();

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/reports/financial?zone_id='.\Illuminate\Support\Str::uuid())
            ->assertOk()
            ->assertJsonPath('data.rides_count', 0)
            ->assertJsonPath('data.commission_fils', 0);
    }

    public function test_requires_analytics_permission(): void
    {
        // A plain student has no analytics.view permission.
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create(['full_name' => 'S', 'phone' => '0790000060', 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $student->assignRole('student');

        Sanctum::actingAs($student);
        $this->getJson('/api/v1/admin/reports/financial')->assertStatus(403);
    }
}
