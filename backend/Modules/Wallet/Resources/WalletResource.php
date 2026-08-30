<?php

namespace Rafeeq\Modules\Wallet\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Wallet\Models\Wallet;

/**
 * @mixin Wallet
 */
class WalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'balance_fils' => $this->balance_fils,
            'balance_jod' => round($this->balance_fils / 1000, 3),
            'held_fils' => (int) ($this->held_fils ?? 0),
            'available_fils' => $this->availableFils(),
            'available_jod' => round($this->availableFils() / 1000, 3),
            /*
             * Outstanding cash commission — the number the captain is JUDGED by and
             * could not see.
             *
             * A captain working cash holds the whole fare and owes us the commission
             * (`CaptainDebtService`). Past `rafeeq.max_captain_debt_fils` they stop
             * receiving trips altogether. That ceiling has been enforced since the cash
             * flow existed, and no endpoint ever reported the balance being measured
             * against it — so a captain went quiet with no way to find out why.
             *
             * Zero for a student wallet, which is the honest answer there.
             */
            'debt_fils' => $this->debtFils(),
            'currency' => $this->currency,
        ];
    }
}
