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
 * @property int $debt_fils What this wallet's owner owes the platform. Always >= 0.
 * @property string $currency
 */
class Wallet extends Model
{
    use HasUuid;

    protected $fillable = ['user_id', 'balance_fils', 'held_fils', 'debt_fils', 'currency'];

    protected function casts(): array
    {
        return [
            'balance_fils' => 'integer',
            'held_fils' => 'integer',
            'debt_fils' => 'integer',
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

    /**
     * What this wallet's owner owes the platform, in fils. Never negative.
     *
     * Debt arises from cash trips: the captain collects the whole fare in the vehicle
     * and therefore owes the commission. Held as a separate positive figure rather
     * than as a negative balance, so `balance_fils` keeps meaning exactly one thing
     * and `availableFils()` stays correct without special cases.
     */
    public function debtFils(): int
    {
        return (int) $this->debt_fils;
    }

    /** Is the owner over the debt ceiling that blocks accepting new trips? */
    public function isOverDebtCeiling(): bool
    {
        return $this->debtFils() > (int) config('rafeeq.captain_debt_ceiling_fils', 10000);
    }

    /** How much more cash the owner may collect before the ceiling stops them. */
    public function debtHeadroomFils(): int
    {
        return max(0, (int) config('rafeeq.captain_debt_ceiling_fils', 10000) - $this->debtFils());
    }
}
