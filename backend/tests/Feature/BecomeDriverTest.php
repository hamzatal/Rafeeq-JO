<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Tests\TestCase;

/**
 * "One phone = student + captain": a user with an existing Rafeeq account can
 * gain the captain (driver) capability without creating a second account.
 */
class BecomeDriverTest extends TestCase
{
    use RefreshDatabase;

    private function student(string $phone = '+962790007777'): User
    {
        $this->seed(\Database\Seeders\RolesPermissionsSeeder::class);

        $user = User::create([
            'full_name' => 'طالب وكابتن',
            'phone' => $phone,
            'type' => 'student',
            'status' => 'active',
            'locale' => 'ar',
        ]);
        $user->syncRoles(['student']);

        return $user;
    }

    public function test_student_can_become_a_captain_with_same_account(): void
    {
        $user = $this->student();

        // Initially has no captain capability.
        $this->assertFalse($user->hasRole('driver'));
        $this->assertNull(DriverProfile::where('user_id', $user->id)->first());

        // Add captain capability to the SAME account.
        $this->actingAs($user)
            ->postJson('/api/v1/auth/become-driver')
            ->assertOk()
            ->assertJsonPath('data.phone', '+962790007777');

        $user->refresh();
        // Keeps the student role AND gains the driver role + a driver profile.
        $this->assertTrue($user->hasRole('student'));
        $this->assertTrue($user->hasRole('driver'));
        $this->assertNotNull(DriverProfile::where('user_id', $user->id)->first());

        // Can now reach captain-only endpoints with the same token/session.
        $this->actingAs($user)
            ->getJson('/api/v1/driver/profile')
            ->assertOk();
    }

    public function test_become_driver_is_idempotent(): void
    {
        $user = $this->student('+962790008888');

        $this->actingAs($user)->postJson('/api/v1/auth/become-driver')->assertOk();
        $this->actingAs($user)->postJson('/api/v1/auth/become-driver')->assertOk();

        // Exactly one driver profile is created, no duplicates.
        $this->assertSame(1, DriverProfile::where('user_id', $user->id)->count());
    }
}
