<?php

namespace Rafeeq\Modules\Auth\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Rafeeq\Core\Permissions\HasRoles;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $full_name
 * @property string $phone
 * @property \Illuminate\Support\Carbon|null $phone_verified_at
 * @property string|null $email
 * @property string|null $password
 * @property UserType $type
 * @property UserStatus $status
 * @property string $locale
 * @property array|null $metadata
 */
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens;
    use HasRoles;
    use HasUuid;
    use Notifiable;
    use SoftDeletes;

    protected $fillable = [
        'full_name', 'phone', 'email', 'password',
        'type', 'status', 'locale', 'avatar_path', 'metadata',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'type' => UserType::class,
            'status' => UserStatus::class,
            'metadata' => 'array',
        ];
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
}
