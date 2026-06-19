<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A guardian / emergency contact a student can reach in an emergency.
 *
 * @property string $id
 * @property string $user_id
 * @property string $name
 * @property string $phone
 * @property string|null $relation
 * @property bool $is_primary
 * @property bool $notify_on_sos
 */
class EmergencyContact extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'name', 'phone', 'relation', 'is_primary', 'notify_on_sos',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'notify_on_sos' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
