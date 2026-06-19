<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;
use Tests\TestCase;

/**
 * End-to-end smoke of the core platform flows over the real HTTP stack
 * (router + middleware + auth + RBAC + security headers). Complements the
 * live PostgreSQL E2E run documented in docs/LAUNCH_CHECKLIST.md.
 */
class EndToEndFlowTest extends TestCase
{
    use RefreshDatabase;

    private function seedRolesAndAdmin(): User
    {
        $this->seed(\Database\Seeders\RolesPermissionsSeeder::class);

        $admin = User::create([
            'full_name' => 'مدير', 'phone' => '+962790000001', 'type' => 'admin',
            'status' => 'active', 'locale' => 'ar', 'password' => bcrypt('Secret@123'),
        ]);
        $admin->syncRoles(['admin']);

        return $admin;
    }

    public function test_student_registration_otp_and_protected_access(): void
    {
        // Register → returns debug OTP in testing.
        $reg = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'طالب E2E',
            'phone' => '+962790004444',
            'type' => 'student',
        ])->assertCreated();

        $otp = (string) $reg->json('data.otp_debug');
        $this->assertNotEmpty($otp);

        // Verify OTP → returns a bearer token.
        $verify = $this->postJson('/api/v1/auth/verify-otp', [
            'phone' => '+962790004444',
            'code' => $otp,
            'purpose' => 'register',
            'device_name' => 'e2e',
        ])->assertOk();

        $token = (string) $verify->json('data.token');
        $this->assertNotEmpty($token);

        // Unauthenticated access is rejected.
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();

        // Protected endpoint works with the token.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.phone', '+962790004444');
    }

    public function test_admin_can_manage_a_coupon_and_student_can_validate_it(): void
    {
        $admin = $this->seedRolesAndAdmin();

        // Admin creates a coupon.
        $this->actingAs($admin)
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'E2E50',
                'type' => CouponType::Percentage->value,
                'value' => 50,
                'max_discount_fils' => 3000,
                'scope' => CouponScope::Subscription->value,
                'is_active' => true,
            ])->assertCreated();

        // A student validates it: 50% of 10 JOD = 5 JOD, capped at 3 JOD.
        $student = User::create([
            'full_name' => 'طالب', 'phone' => '+962790005555', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);

        $this->actingAs($student)
            ->postJson('/api/v1/coupons/validate', [
                'code' => 'E2E50',
                'scope' => CouponScope::Subscription->value,
                'amount_fils' => 10000,
            ])
            ->assertOk()
            ->assertJsonPath('data.discount_fils', 3000)
            ->assertJsonPath('data.final_fils', 7000);
    }

    public function test_admin_insights_endpoint_returns_metrics(): void
    {
        $admin = $this->seedRolesAndAdmin();

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/ai/insights')
            ->assertOk()
            ->assertJsonStructure(['data' => ['metrics' => ['users', 'finance', 'safety'], 'analysis', 'recommendations']]);
    }

    public function test_rbac_blocks_non_staff_from_admin_endpoints(): void
    {
        $student = User::create([
            'full_name' => 'طالب', 'phone' => '+962790006666', 'type' => 'student',
            'status' => 'active', 'locale' => 'ar',
        ]);

        $this->actingAs($student)
            ->getJson('/api/v1/admin/coupons')
            ->assertForbidden();
    }
}
