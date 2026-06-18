<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Services\MfaService;
use Rafeeq\Modules\Auth\Services\TotpService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class MfaTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(string $phone = '+962790000001'): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = User::create([
            'full_name' => 'Admin',
            'phone' => $phone,
            'email' => 'admin@rafeeq.jo',
            'password' => Hash::make('secret123'),
            'type' => UserType::Admin,
            'status' => UserStatus::Active,
            'locale' => 'ar',
        ]);
        $u->assignRole('admin');
        $u->markPhoneVerified();

        return $u;
    }

    private function currentCode(string $secret): string
    {
        return app(TotpService::class)->codeAt($secret, (int) floor(time() / 30));
    }

    public function test_staff_can_enroll_and_enable_mfa(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin);

        $setup = $this->postJson('/api/v1/auth/mfa/setup')->assertOk();
        $secret = $setup->json('data.secret');
        $this->assertNotEmpty($secret);
        $this->assertStringContainsString('otpauth://totp/', $setup->json('data.otpauth_uri'));

        $confirm = $this->postJson('/api/v1/auth/mfa/confirm', ['code' => $this->currentCode($secret)])->assertOk();
        $this->assertCount(8, $confirm->json('data.recovery_codes'));

        $this->assertTrue($admin->fresh()->hasMfaEnabled());
    }

    public function test_login_with_mfa_enabled_returns_challenge_not_token(): void
    {
        $admin = $this->makeAdmin();
        $secret = $this->enableMfa($admin);

        $res = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->assertOk();

        $res->assertJsonPath('data.mfa_required', true);
        $this->assertNotEmpty($res->json('data.mfa_token'));
        $this->assertNull($res->json('data.token'));
    }

    public function test_mfa_verify_with_correct_code_issues_token(): void
    {
        $admin = $this->makeAdmin();
        $secret = $this->enableMfa($admin);

        $mfaToken = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->json('data.mfa_token');

        $res = $this->postJson('/api/v1/auth/mfa/verify', [
            'mfa_token' => $mfaToken,
            'code' => $this->currentCode($secret),
        ])->assertOk();

        $this->assertNotEmpty($res->json('data.token'));
        $res->assertJsonPath('data.user.mfa_enabled', true);
    }

    public function test_mfa_verify_with_wrong_code_is_rejected(): void
    {
        $admin = $this->makeAdmin();
        $this->enableMfa($admin);

        $mfaToken = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->json('data.mfa_token');

        $this->postJson('/api/v1/auth/mfa/verify', [
            'mfa_token' => $mfaToken,
            'code' => '000000',
        ])->assertStatus(422);
    }

    public function test_recovery_code_works_once(): void
    {
        $admin = $this->makeAdmin();
        $mfa = app(MfaService::class);
        $mfa->beginSetup($admin);
        $admin->refresh();
        $codes = $mfa->confirmSetup($admin, $this->currentCode($admin->mfa_secret));
        $recovery = $codes[0];

        $mfaToken = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->json('data.mfa_token');

        // First use succeeds.
        $this->postJson('/api/v1/auth/mfa/verify', [
            'mfa_token' => $mfaToken,
            'code' => $recovery,
        ])->assertOk();

        // Re-using the same recovery code fails on a fresh challenge.
        $mfaToken2 = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->json('data.mfa_token');

        $this->postJson('/api/v1/auth/mfa/verify', [
            'mfa_token' => $mfaToken2,
            'code' => $recovery,
        ])->assertStatus(422);
    }

    public function test_login_without_mfa_returns_token_directly(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->postJson('/api/v1/auth/login', [
            'phone' => $admin->phone,
            'password' => 'secret123',
        ])->assertOk();

        $res->assertJsonPath('data.mfa_required', false);
        $this->assertNotEmpty($res->json('data.token'));
    }

    public function test_non_staff_cannot_enable_mfa(): void
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create([
            'full_name' => 'Stu', 'phone' => '+962799999999', 'password' => Hash::make('secret123'),
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        Sanctum::actingAs($student);

        $this->postJson('/api/v1/auth/mfa/setup')->assertStatus(422);
    }

    private function enableMfa(User $user): string
    {
        $mfa = app(MfaService::class);
        $mfa->beginSetup($user);
        $user->refresh();
        $mfa->confirmSetup($user, $this->currentCode($user->mfa_secret));
        $user->refresh();

        return $user->mfa_secret;
    }
}
