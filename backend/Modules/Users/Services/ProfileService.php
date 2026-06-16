<?php

namespace Rafeeq\Modules\Users\Services;

use Illuminate\Support\Facades\Hash;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Repositories\UserRepository;
use Rafeeq\Modules\Auth\Services\OtpService;
use Rafeeq\Shared\Enums\OtpChannel;
use Rafeeq\Shared\Enums\OtpPurpose;
use Rafeeq\Shared\Support\Phone;

class ProfileService extends BaseService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly OtpService $otp,
        private readonly AuditLogger $audit,
    ) {}

    public function update(User $user, array $data): User
    {
        $user->fill(array_filter([
            'full_name' => $data['full_name'] ?? null,
            'email' => $data['email'] ?? null,
            'locale' => $data['locale'] ?? null,
        ], fn ($v) => $v !== null));

        $user->save();
        $this->audit->log('profile.update', $user, auditable: $user);

        return $user->fresh('roles');
    }

    public function changePassword(User $user, ?string $current, string $new): void
    {
        if ($user->password && (! $current || ! Hash::check($current, $user->password))) {
            throw new BusinessRuleException('كلمة المرور الحالية غير صحيحة.', 'INVALID_CURRENT_PASSWORD');
        }

        $user->forceFill(['password' => Hash::make($new)])->save();
        $this->audit->log('profile.password_changed', $user, auditable: $user);
    }

    /** Step 1: send an OTP to the NEW phone number. */
    public function requestPhoneChange(User $user, string $newPhone): ?string
    {
        $normalized = Phone::normalize($newPhone) ?? $newPhone;

        if ($normalized === $user->phone) {
            throw new BusinessRuleException('هذا هو رقمك الحالي.', 'SAME_PHONE');
        }

        if ($this->users->phoneExists($normalized)) {
            throw new BusinessRuleException('هذا الرقم مستخدم من حساب آخر.', 'PHONE_TAKEN');
        }

        return $this->otp->issue($normalized, OtpPurpose::ChangePhone, OtpChannel::Sms);
    }

    /** Step 2: verify the OTP and apply the new phone. */
    public function confirmPhoneChange(User $user, string $newPhone, string $code): User
    {
        $normalized = Phone::normalize($newPhone) ?? $newPhone;

        if ($this->users->phoneExists($normalized)) {
            throw new BusinessRuleException('هذا الرقم مستخدم من حساب آخر.', 'PHONE_TAKEN');
        }

        $this->otp->verify($normalized, OtpPurpose::ChangePhone, $code);

        $user->forceFill([
            'phone' => $normalized,
            'phone_verified_at' => now(),
        ])->save();

        $this->audit->log('profile.phone_changed', $user, auditable: $user);

        return $user->fresh('roles');
    }

    public function deleteAccount(User $user): void
    {
        $this->audit->log('profile.deleted', $user, auditable: $user);
        $user->tokens()->delete();
        $user->delete(); // soft delete
    }
}
