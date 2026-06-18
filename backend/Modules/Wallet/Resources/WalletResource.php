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
            'currency' => $this->currency,
        ];
    }
}
