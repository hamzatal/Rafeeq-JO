<?php

namespace Rafeeq\Modules\Payouts\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;

/**
 * @mixin PayoutRequest
 */
class PayoutResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount_fils' => $this->amount_fils,
            'method' => $this->method,
            'destination' => $this->destination,
            'status' => $this->status,
            'note' => $this->note,
            'admin_note' => $this->admin_note,
            'processed_at' => $this->processed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'captain' => $this->whenLoaded('captain', fn () => [
                'id' => $this->captain->id,
                'name' => $this->captain->full_name,
                'phone' => $this->captain->phone,
            ]),
        ];
    }
}
