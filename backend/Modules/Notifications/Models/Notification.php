<?php

namespace Rafeeq\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string $type
 * @property string $category
 * @property string $title
 * @property string $body
 * @property array|null $data
 * @property array|null $channels
 * @property bool $is_critical
 * @property Carbon|null $read_at
 */
class Notification extends Model
{
    use HasUuid;

    protected $table = 'rafeeq_notifications';

    protected $fillable = [
        'user_id', 'type', 'category', 'title', 'body',
        'data', 'channels', 'is_critical', 'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'channels' => 'array',
            'is_critical' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
