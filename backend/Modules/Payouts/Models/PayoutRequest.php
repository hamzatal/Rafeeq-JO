<?php

namespace Rafeeq\Modules\Payouts\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $captain_user_id
 * @property int $amount_fils
 * @property string $method
 * @property string|null $destination
 * @property string $status
 */
class PayoutRequest extends Model
{
    use HasUuid;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'captain_user_id', 'amount_fils', 'method', 'destination',
        'status', 'note', 'admin_note', 'processed_by', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fils' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(User::class, 'captain_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
