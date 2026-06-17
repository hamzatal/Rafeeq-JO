<?php

namespace Rafeeq\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $user_id
 * @property bool $push_enabled
 * @property bool $sms_enabled
 * @property bool $payments
 * @property bool $trips
 * @property bool $ratings
 * @property bool $safety
 * @property bool $general
 */
class NotificationPreference extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'push_enabled', 'sms_enabled',
        'payments', 'trips', 'ratings', 'safety', 'general',
    ];

    protected function casts(): array
    {
        return [
            'push_enabled' => 'boolean',
            'sms_enabled' => 'boolean',
            'payments' => 'boolean',
            'trips' => 'boolean',
            'ratings' => 'boolean',
            'safety' => 'boolean',
            'general' => 'boolean',
        ];
    }

    /** Whether a given category is enabled for in-app/push delivery. */
    public function allows(string $category): bool
    {
        return (bool) ($this->{$category} ?? true);
    }
}
