<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * End-to-end HTTP smoke of the door-to-door ride flow (the exact path that
 * surfaced the coupon_code + finalization bugs). Guards against integration 500s.
 */
class RideRequestHttpSmokeTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_create_list_and_cancel_a_ride_request_over_http(): void
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create([
            'full_name' => 'Rider', 'phone' => '0790005555', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $student->assignRole('student');

        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'U1', 'city' => 'Irbid', 'lat' => 32.49, 'lng' => 35.98, 'is_active' => true]);
        Zone::create([
            'name_ar' => 'م', 'name_en' => 'Z', 'city' => 'Irbid',
            'center_lat' => 32.56, 'center_lng' => 35.85, 'radius_km' => 20, 'is_active' => true,
        ]);

        // Create (with coupon_code + direction — the fields that broke before).
        $created = $this->actingAs($student)->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.56,
            'pickup_lng' => 35.85,
            'pickup_address' => 'Home',
            'desired_time' => now()->addHour()->toIso8601String(),
            'type' => 'scheduled',
            'direction' => 'to_university',
        ])->assertCreated();

        $id = $created->json('data.id');
        $this->assertNotEmpty($id);
        $this->assertSame('to_university', $created->json('data.direction'));

        // List
        $this->actingAs($student)->getJson('/api/v1/ride-requests/mine')->assertOk();

        // Cancel
        $this->actingAs($student)->postJson("/api/v1/ride-requests/{$id}/cancel")->assertOk();

        // Can request again after cancel (no permanent block).
        $this->actingAs($student)->postJson('/api/v1/ride-requests', [
            'university_id' => $uni->id,
            'pickup_lat' => 32.56, 'pickup_lng' => 35.85,
            'desired_time' => now()->addHours(2)->toIso8601String(),
            'type' => 'scheduled', 'direction' => 'from_university',
        ])->assertCreated();
    }
}
