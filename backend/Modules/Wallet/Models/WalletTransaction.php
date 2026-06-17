<?php

namespace Rafeeq\Modules\Wallet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Enums\WalletTxnType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $wallet_id
 * @property WalletTxnType $type
 * @property int $amount_fils
 * @property int $balance_after
 */
class WalletTransaction extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = [
        'wallet_id', 'type', 'amount_fils', 'balance_after',
        'reference', 'description', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'type' => WalletTxnType::class,
            'amount_fils' => 'integer',
            'balance_after' => 'integer',
            'meta' => 'array',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
