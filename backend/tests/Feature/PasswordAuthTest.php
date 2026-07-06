<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Modules\Auth\Models\User;
use Tests\TestCase;

/**
 * Password is a first-class auth method (works even if OTP/SMS is down).
 * Registration sets a password; login accepts phone + password.
 */
class PasswordAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
    }

    public function test_registration_stores_a_password(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'طالب بكلمة مرور',
            'phone' => '+962790005551',
            'password' => 'Secret@2026',
            'type' => 'student',
        ]);

        $res->assertCreated();
        $user = User::where('phone', '+962790005551')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->password);
        $this->assertTrue(Hash::check('Secret@2026', $user->password));
    }

    public function test_login_with_correct_password_returns_a_token(): void
    {
        $user = User::create([
            'full_name' => 'طالب', 'phone' => '+962790005552', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar', 'password' => 'Secret@2026',
        ]);
        $user->forceFill(['phone_verified_at' => now()])->save();
        $user->syncRoles(['student']);

        $this->postJson('/api/v1/auth/login', [
            'phone' => '+962790005552',
            'password' => 'Secret@2026',
        ])->assertOk()->assertJsonStructure(['data' => ['token']]);
    }

    public function test_login_with_wrong_password_is_rejected(): void
    {
        $user = User::create([
            'full_name' => 'طالب', 'phone' => '+962790005553', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar', 'password' => 'Secret@2026',
        ]);
        $user->forceFill(['phone_verified_at' => now()])->save();
        $user->syncRoles(['student']);

        $this->postJson('/api/v1/auth/login', [
            'phone' => '+962790005553',
            'password' => 'WrongPass@1',
        ])->assertStatus(422);
    }
}
