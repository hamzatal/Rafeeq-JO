<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Services\AuthService;
use Rafeeq\Modules\Auth\Services\MfaService;
use Rafeeq\Modules\Auth\Services\OtpService;
use Rafeeq\Modules\Auth\Services\TotpService;
use Rafeeq\Shared\Enums\OtpPurpose;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\Support\OtpProbe;
use Tests\TestCase;

/**
 * Regression: the passwordless SMS-OTP login path must NOT bypass MFA. An
 * MFA-enabled account completing an OTP login must receive a second-factor
 * challenge, not an access token.
 */
class OtpLoginMfaTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $u = User::create([
            'full_name' => 'Admin', 'phone' => '+962790000401', 'email' => 'a@rafeeq.jo',
            'password' => Hash::make('secret123'), 'type' => UserType::Admin,
            'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $u->assignRole('admin');
        $u->markPhoneVerified();

        return $u;
    }

    private function enableMfa(User $user): void
    {
        $mfa = app(MfaService::class);
        $mfa->beginSetup($user);
        $user->refresh();
        $code = app(TotpService::class)->codeAt($user->mfa_secret, (int) floor(time() / 30));
        $mfa->confirmSetup($user, $code);
        $user->refresh();
    }

    public function test_otp_login_challenges_mfa_and_issues_no_token(): void
    {
        $admin = $this->makeAdmin();
        $this->enableMfa($admin);

        app(OtpService::class)->issue($admin->phone, OtpPurpose::Login);
        // issue() deliberately returns null now: the plaintext never leaves the
        // service. Recover it the way a real client does — see OtpProbe.
        $code = OtpProbe::latestCodeFor($admin->phone, OtpPurpose::Login->value);

        $result = app(AuthService::class)->verifyOtp($admin->phone, $code, OtpPurpose::Login);

        $this->assertTrue($result['mfa_required'], 'MFA must be required on OTP login.');
        $this->assertNull($result['token'], 'No token may be issued before the second factor.');
        $this->assertNotEmpty($result['mfa_token']);
    }

    public function test_otp_login_without_mfa_issues_token(): void
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $student = User::create([
            'full_name' => 'Stu', 'phone' => '+962790000402', 'password' => null,
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        app(OtpService::class)->issue($student->phone, OtpPurpose::Login);
        $code = OtpProbe::latestCodeFor($student->phone, OtpPurpose::Login->value);
        $result = app(AuthService::class)->verifyOtp($student->phone, $code, OtpPurpose::Login);

        $this->assertFalse($result['mfa_required']);
        $this->assertNotEmpty($result['token']);
    }
}
