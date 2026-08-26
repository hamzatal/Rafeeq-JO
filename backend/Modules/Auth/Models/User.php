<?php

namespace Rafeeq\Modules\Auth\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;
use Rafeeq\Core\Permissions\HasRoles;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $full_name
 * @property string $phone
 * @property Carbon|null $phone_verified_at
 * @property string|null $email
 * @property string|null $password
 * @property UserType $type
 * @property UserStatus $status
 * @property string $locale
 * @property string|null $avatar_path
 * @property Carbon|null $date_of_birth Minimum age is 18 — Jordan's age of majority.
 * @property string|null $terms_version Which terms version was accepted; bumping the
 *                                      configured version invalidates every stored acceptance.
 * @property Carbon|null $terms_accepted_at
 * @property Carbon|null $anonymized_at Set by AccountErasureService once the
 *                                      identifying fields have been replaced with placeholders.
 * @property array|null $metadata
 * @property string|null $mfa_secret
 * @property Carbon|null $mfa_enabled_at
 * @property array|null $mfa_recovery_codes
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens;
    use HasRoles;
    use HasUuid;
    use Notifiable;
    use SoftDeletes;

    protected $fillable = [
        'full_name', 'phone', 'email', 'password', 'date_of_birth',
        'type', 'status', 'locale', 'avatar_path', 'metadata',
        'terms_version', 'terms_accepted_at',
    ];

    protected $hidden = [
        'password', 'remember_token',
        'mfa_secret', 'mfa_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'mfa_enabled_at' => 'datetime',
            'password' => 'hashed',
            'mfa_secret' => 'encrypted',
            'mfa_recovery_codes' => 'encrypted:array',
            'type' => UserType::class,
            'status' => UserStatus::class,
            'metadata' => 'array',
            'date_of_birth' => 'date',
            'terms_accepted_at' => 'datetime',
            'anonymized_at' => 'datetime',
        ];
    }

    /**
     * Age in whole years, or null when unknown.
     *
     * Compared against the start of today, so a birthday later today still counts as
     * the younger age — the conservative direction for a minimum-age rule. The `(int)`
     * cast is required: Carbon's diffInYears returns a float, and truncating it errs
     * the same safe way.
     */
    public function age(): ?int
    {
        if ($this->date_of_birth === null) {
            return null;
        }

        return (int) $this->date_of_birth->diffInYears(Clock::now()->startOfDay());
    }

    /** Has this account been erased? Its identifying fields are placeholders. */
    public function isAnonymized(): bool
    {
        return $this->anonymized_at !== null;
    }

    /** Has this user accepted the current terms version? */
    public function hasAcceptedCurrentTerms(): bool
    {
        return $this->terms_accepted_at !== null
            && $this->terms_version === (string) config('rafeeq.terms.version');
    }

    /** Whether two-factor authentication is active for this account. */
    public function hasMfaEnabled(): bool
    {
        return $this->mfa_enabled_at !== null;
    }

    public function isPhoneVerified(): bool
    {
        return $this->phone_verified_at !== null;
    }

    public function markPhoneVerified(): void
    {
        if (! $this->isPhoneVerified()) {
            $this->forceFill(['phone_verified_at' => now()])->save();
        }
    }

    public function isStaff(): bool
    {
        return $this->type->isStaff();
    }

    public function canLogin(): bool
    {
        return $this->status->canLogin();
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function driverProfile(): HasOne
    {
        return $this->hasOne(DriverProfile::class);
    }
}
