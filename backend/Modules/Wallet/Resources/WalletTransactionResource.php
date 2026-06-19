<?php

namespace Rafeeq\Modules\Wallet\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Wallet\Models\WalletTransaction;

/**
 * @mixin WalletTransaction
 */
class WalletTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'amount_fils' => $this->amount_fils,
            'amount_jod' => round($this->amount_fils / 1000, 3),
            'balance_after' => $this->balance_after,
            'reference' => $this->reference,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
