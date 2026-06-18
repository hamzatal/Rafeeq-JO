<?php

namespace Rafeeq\Modules\Auth\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;

/**
 * Two-factor (TOTP) lifecycle for staff/admin accounts:
 *  - enrollment (begin → confirm) with recovery codes,
 *  - the short-lived login "MFA challenge" handed out after a valid password,
 *  - verifying a TOTP / recovery code to complete login,
 *  - disabling 2FA.
 */
class MfaService extends BaseService
{
    /** MFA login challenge lifetime (seconds). */
    private const CHALLENGE_TTL = 300;

    private const CHALLENGE_PREFIX = 'mfa:challenge:';

    public function __construct(
        private readonly TotpService $totp,
        private readonly AuditLogger $audit,
    ) {}

    /* ── Enrollment ─────────────────────────────────────────────────── */

    /**
     * Begin enrollment: generate (but do not yet enable) a secret and return
     * the provisioning URI so the user can scan it with an authenticator app.
     *
     * @return array{secret: string, otpauth_uri: string}
     */
    public function beginSetup(User $user): array
    {
        $this->assertStaff($user);

        $secret = $this->totp->generateSecret();
        // Stage the secret; it only becomes active once confirmed.
        $user->forceFill(['mfa_secret' => $secret])->save();

        return [
            'secret' => $secret,
            'otpauth_uri' => $this->totp->provisioningUri($secret, $user->email ?: $user->phone),
        ];
    }

    /**
     * Confirm enrollment by validating the first code, then enable 2FA and
     * return one-time recovery codes (shown once).
     *
     * @return array<int, string> plaintext recovery codes
     */
    public function confirmSetup(User $user, string $code): array
    {
        $this->assertStaff($user);

        if (! $user->mfa_secret) {
            throw new BusinessRuleException('ابدأ إعداد المصادقة الثنائية أولاً.', 'MFA_NOT_STARTED');
        }

        if (! $this->totp->verify($user->mfa_secret, $code)) {
            throw new BusinessRuleException('رمز التحقق غير صحيح.', 'MFA_CODE_INVALID');
        }

        $plain = $this->totp->generateRecoveryCodes();

        $user->forceFill([
            'mfa_enabled_at' => now(),
            'mfa_recovery_codes' => array_map(fn ($c) => Hash::make($c), $plain),
        ])->save();

        $this->audit->log('auth.mfa_enabled', $user, null, $user);

        return $plain;
    }

    /** Disable 2FA after re-verifying a current code (or recovery code). */
    public function disable(User $user, string $code): void
    {
        if (! $user->hasMfaEnabled()) {
            throw new BusinessRuleException('المصادقة الثنائية غير مُفعّلة.', 'MFA_NOT_ENABLED');
        }

        if (! $this->verifyCode($user, $code)) {
            throw new BusinessRuleException('رمز التحقق غير صحيح.', 'MFA_CODE_INVALID');
        }

        $user->forceFill([
            'mfa_secret' => null,
            'mfa_enabled_at' => null,
            'mfa_recovery_codes' => null,
        ])->save();

        $this->audit->log('auth.mfa_disabled', $user, null, $user);
    }

    /* ── Login challenge ────────────────────────────────────────────── */

    /** Issue a short-lived challenge token bound to a user after password auth. */
    public function issueChallenge(User $user): string
    {
        $token = (string) Str::uuid();
        Cache::put(self::CHALLENGE_PREFIX.$token, $user->id, self::CHALLENGE_TTL);

        return $token;
    }

    /** Resolve a challenge token to its user, or throw if expired/invalid. */
    public function resolveChallenge(string $token): User
    {
        $userId = Cache::get(self::CHALLENGE_PREFIX.$token);

        if (! $userId) {
            throw new BusinessRuleException('انتهت صلاحية جلسة التحقق. سجّل الدخول من جديد.', 'MFA_CHALLENGE_EXPIRED');
        }

        $user = User::find($userId);
        if (! $user) {
            throw new BusinessRuleException('المستخدم غير موجود.', 'USER_NOT_FOUND');
        }

        return $user;
    }

    public function consumeChallenge(string $token): void
    {
        Cache::forget(self::CHALLENGE_PREFIX.$token);
    }

    /* ── Verification ───────────────────────────────────────────────── */

    /**
     * Verify a TOTP code or, failing that, a single-use recovery code
     * (which is consumed on success).
     */
    public function verifyCode(User $user, string $code): bool
    {
        if ($user->mfa_secret && $this->totp->verify($user->mfa_secret, $code)) {
            return true;
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $codes = $user->mfa_recovery_codes ?? [];
        $normalized = strtoupper(trim($code));

        foreach ($codes as $index => $hash) {
            if (Hash::check($normalized, $hash)) {
                unset($codes[$index]);
                $user->forceFill(['mfa_recovery_codes' => array_values($codes)])->save();
                $this->audit->log('auth.mfa_recovery_used', $user, null, $user);

                return true;
            }
        }

        return false;
    }

    private function assertStaff(User $user): void
    {
        if (! $user->isStaff()) {
            throw new BusinessRuleException('المصادقة الثنائية متاحة لحسابات الإدارة فقط.', 'MFA_STAFF_ONLY');
        }
    }
}
