<?php

namespace Rafeeq\Modules\Auth\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Repositories\UserRepository;
use Rafeeq\Shared\Enums\OtpChannel;
use Rafeeq\Shared\Enums\OtpPurpose;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

class AuthService extends BaseService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly OtpService $otp,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Step 1 of registration: create a pending user and send a verification OTP.
     *
     * @return array{user: User, otp_debug: ?string}
     */
    public function register(array $data, ?Request $request = null): array
    {
        return $this->transaction(function () use ($data, $request) {
            $type = UserType::from($data['type'] ?? UserType::Student->value);

            /** @var User $user */
            $user = $this->users->create([
                'full_name' => $data['full_name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'password' => ! empty($data['password']) ? $data['password'] : null,
                'type' => $type,
                'status' => UserStatus::Pending,
                'locale' => $data['locale'] ?? 'ar',
            ]);

            $code = $this->otp->issue($user->phone, OtpPurpose::Register, OtpChannel::Sms, $request);

            $this->audit->log('auth.register', $user, $request, $user);

            return ['user' => $user, 'otp_debug' => $code];
        });
    }

    /**
     * Verify a register/login OTP, activate the account, and issue an access token.
     *
     * @return array{user: User, token: string}
     */
    public function verifyOtp(string $phone, string $code, OtpPurpose $purpose, ?string $deviceName = null, ?Request $request = null): array
    {
        $user = $this->users->findByPhone($phone);

        if (! $user) {
            throw new BusinessRuleException('المستخدم غير موجود.', 'USER_NOT_FOUND');
        }

        $this->otp->verify($phone, $purpose, $code);

        return $this->transaction(function () use ($user, $deviceName, $request) {
            $user->markPhoneVerified();

            if ($user->status === UserStatus::Pending) {
                $user->status = UserStatus::Active;
                $user->save();
            }

            $this->guardCanLogin($user);
            $this->ensureRoleForType($user);

            $token = $this->issueToken($user, $deviceName, $request);

            $this->audit->log('auth.otp_verified', $user, $request, $user);

            return ['user' => $user->fresh('roles'), 'token' => $token];
        });
    }

    /**
     * Request a passwordless login OTP for an existing, login-able user.
     */
    public function requestLoginOtp(string $phone, ?Request $request = null): ?string
    {
        $user = $this->users->findByPhone($phone);

        if (! $user) {
            throw new BusinessRuleException('لا يوجد حساب بهذا الرقم.', 'USER_NOT_FOUND');
        }

        $this->guardCanLogin($user);

        return $this->otp->issue($phone, OtpPurpose::Login, OtpChannel::Sms, $request);
    }

    /**
     * Password login (mainly for staff/admin).
     *
     * @return array{user: User, token: string}
     */
    public function login(string $phone, string $password, ?string $deviceName = null, ?Request $request = null): array
    {
        $user = $this->users->findByPhone($phone);

        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            throw new BusinessRuleException('بيانات الدخول غير صحيحة.', 'INVALID_CREDENTIALS');
        }

        $this->guardCanLogin($user);

        $token = $this->issueToken($user, $deviceName, $request);

        $this->audit->log('auth.login', $user, $request, $user);

        return ['user' => $user->fresh('roles'), 'token' => $token];
    }

    public function logout(User $user, ?int $currentTokenId = null): void
    {
        if ($currentTokenId) {
            $user->tokens()->where('id', $currentTokenId)->delete();
        }
    }

    public function logoutAll(User $user): void
    {
        $user->tokens()->delete();
    }

    /**
     * Send a password-reset OTP. Does not reveal whether the account exists.
     */
    public function forgotPassword(string $phone, ?Request $request = null): ?string
    {
        $user = $this->users->findByPhone($phone);

        if (! $user) {
            return null; // silent — avoid user enumeration
        }

        return $this->otp->issue($phone, OtpPurpose::ResetPassword, OtpChannel::Sms, $request);
    }

    public function resetPassword(string $phone, string $code, string $password, ?Request $request = null): void
    {
        $user = $this->users->findByPhone($phone);

        if (! $user) {
            throw new BusinessRuleException('المستخدم غير موجود.', 'USER_NOT_FOUND');
        }

        $this->otp->verify($phone, OtpPurpose::ResetPassword, $code);

        $user->forceFill(['password' => Hash::make($password)])->save();
        $user->tokens()->delete(); // invalidate all sessions

        $this->audit->log('auth.password_reset', $user, $request, $user);
    }

    private function issueToken(User $user, ?string $deviceName, ?Request $request): string
    {
        $user->forceFill(['last_login_at' => now()])->save();

        $name = $deviceName ?: ($request?->userAgent() ? substr((string) $request->userAgent(), 0, 60) : 'mobile');

        return $user->createToken($name)->plainTextToken;
    }

    private function guardCanLogin(User $user): void
    {
        if (! $user->canLogin()) {
            throw new BusinessRuleException(
                'حسابك '.$user->status->labelAr().'. تواصل مع الدعم.',
                'ACCOUNT_'.strtoupper($user->status->value),
            );
        }
    }

    private function ensureRoleForType(User $user): void
    {
        if (! $user->hasRole($user->type->value)) {
            $user->assignRole($user->type->value);
        }
    }
}
