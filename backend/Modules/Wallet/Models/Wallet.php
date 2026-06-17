<?php

namespace Rafeeq\Modules\Wallet\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property int $balance_fils
 * @property string $currency
 */
class Wallet extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'balance_fils', 'currency'];

    protected function casts(): array
    {
        return ['balance_fils' => 'integer'];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class)->latest('created_at');
    }
}
