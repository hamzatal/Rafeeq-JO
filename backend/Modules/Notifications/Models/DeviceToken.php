<?php

namespace Rafeeq\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $user_id
 * @property string $token
 * @property string $platform
 */
class DeviceToken extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'token', 'platform', 'last_used_at'];

    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }
}
