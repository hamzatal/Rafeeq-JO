<?php

namespace Rafeeq\Modules\Wallet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property int $balance_fils
 * @property int $held_fils
 * @property string $currency
 */
class Wallet extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'balance_fils', 'held_fils', 'currency'];

    protected function casts(): array
    {
        return [
            'balance_fils' => 'integer',
            'held_fils' => 'integer',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class)->latest('created_at');
    }

    public function holds(): HasMany
    {
        return $this->hasMany(WalletHold::class);
    }

    /** Spendable balance after subtracting active pre-authorisation holds. */
    public function availableFils(): int
    {
        return (int) $this->balance_fils - (int) $this->held_fils;
    }
}
