<?php

namespace Rafeeq\Modules\Auth\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Modules\Auth\Models\OtpCode;
use Rafeeq\Shared\Enums\OtpChannel;
use Rafeeq\Shared\Enums\OtpPurpose;

/**
 * Generates, sends, and verifies one-time passwords.
 *
 * Security properties:
 *  - codes are stored hashed (never in plaintext)
 *  - short TTL + max attempts + resend cooldown
 *  - previous active codes are invalidated when a new one is issued
 */
class OtpService extends BaseService
{
    public function __construct(private readonly SmsGateway $sms) {}

    /**
     * Issue a new OTP for an identifier/purpose. Returns the plaintext
     * code only in non-production for QA (see config/otp.php).
     */
    public function issue(
        string $identifier,
        OtpPurpose $purpose,
        OtpChannel $channel = OtpChannel::Sms,
        ?Request $request = null,
    ): ?string {
        $this->enforceCooldown($identifier, $purpose);

        // Invalidate prior active codes for this identifier+purpose.
        OtpCode::forRequest($identifier, $purpose)->active()->update(['consumed_at' => now()]);

        $code = $this->generateCode();

        OtpCode::create([
            'identifier' => $identifier,
            'channel' => $channel,
            'purpose' => $purpose,
            'code_hash' => Hash::make($code),
            'max_attempts' => config('otp.max_attempts'),
            'expires_at' => now()->addSeconds(config('otp.ttl_seconds')),
            'ip' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 500) : null,
        ]);

        // Sending is best-effort: a missing/failing provider (e.g. no WhatsApp
        // gateway yet) must never block sign-in. In non-production the code is
        // returned in the API response and auto-filled by the apps.
        try {
            $this->dispatch($identifier, $channel, $code, $purpose);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('otp.dispatch_failed', [
                'purpose' => $purpose->value,
                'error' => $e->getMessage(),
            ]);
        }

        return config('otp.debug_return_code') ? $code : null;
    }

    /**
     * Verify a submitted code. Consumes the code on success.
     *
     * @throws BusinessRuleException
     */
    public function verify(string $identifier, OtpPurpose $purpose, string $code): void
    {
        // Universal test code (non-production QA only).
        $universal = config('otp.universal_code');
        if ($universal && config('otp.debug_return_code') && hash_equals((string) $universal, $code)) {
            OtpCode::forRequest($identifier, $purpose)->active()->update(['consumed_at' => now()]);

            return;
        }

        $otp = OtpCode::forRequest($identifier, $purpose)
            ->whereNull('consumed_at')
            ->latest('created_at')
            ->first();

        if (! $otp) {
            throw new BusinessRuleException('لا يوجد رمز تحقق فعّال. أعد الطلب.', 'OTP_NOT_FOUND');
        }

        if ($otp->isExpired()) {
            throw new BusinessRuleException('انتهت صلاحية رمز التحقق. أعد الطلب.', 'OTP_EXPIRED');
        }

        if (! $otp->hasAttemptsLeft()) {
            throw new BusinessRuleException('تجاوزت عدد المحاولات المسموح بها.', 'OTP_TOO_MANY_ATTEMPTS');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            throw new BusinessRuleException('رمز التحقق غير صحيح.', 'OTP_INVALID');
        }

        $otp->forceFill(['consumed_at' => now()])->save();
    }

    private function enforceCooldown(string $identifier, OtpPurpose $purpose): void
    {
        $cooldown = (int) config('otp.resend_cooldown_seconds');

        $last = OtpCode::forRequest($identifier, $purpose)->latest('created_at')->first();

        if ($last && $last->created_at instanceof Carbon
            && $last->created_at->diffInSeconds(now()) < $cooldown) {
            $wait = $cooldown - (int) $last->created_at->diffInSeconds(now());
            throw new BusinessRuleException(
                "يرجى الانتظار {$wait} ثانية قبل إعادة الطلب.",
                'OTP_COOLDOWN',
            );
        }
    }

    private function generateCode(): string
    {
        $length = (int) config('otp.length');
        $max = (10 ** $length) - 1;

        return str_pad((string) random_int(0, $max), $length, '0', STR_PAD_LEFT);
    }

    private function dispatch(string $identifier, OtpChannel $channel, string $code, OtpPurpose $purpose): void
    {
        $message = "رفيق: رمز التحقق الخاص بك هو {$code}. صالح لمدة "
            .(int) (config('otp.ttl_seconds') / 60).' دقائق. لا تشاركه مع أحد.';

        if ($channel === OtpChannel::Sms) {
            $this->sms->send($identifier, $message);
        }
        // Email/WhatsApp channels handled in later phases.
    }
}
