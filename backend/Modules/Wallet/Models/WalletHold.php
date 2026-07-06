<?php

namespace Rafeeq\Modules\Wallet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A pre-authorisation hold on a wallet. Lifecycle: active → captured | released.
 *
 * @property string $id
 * @property string $wallet_id
 * @property string $user_id
 * @property int $amount_fils
 * @property string $status
 * @property string|null $reason
 * @property string|null $reference
 */
class WalletHold extends Model
{
    use HasUuid;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_CAPTURED = 'captured';

    public const STATUS_RELEASED = 'released';

    protected $fillable = [
        'wallet_id', 'user_id', 'amount_fils', 'status', 'reason', 'reference',
        'captured_at', 'released_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fils' => 'integer',
            'captured_at' => 'datetime',
            'released_at' => 'datetime',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
