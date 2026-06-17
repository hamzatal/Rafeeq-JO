<?php

namespace Rafeeq\Modules\Payments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Payments\Models\PaymentRequest;

/**
 * @mixin PaymentRequest
 */
class PaymentRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'purpose' => $this->purpose->value,
            'purpose_label' => $this->purpose->labelAr(),
            'amount_fils' => $this->amount_fils,
            'amount_jod' => round($this->amount_fils / 1000, 3),
            'currency' => $this->currency,
            'method' => $this->method,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'reject_reason' => $this->reject_reason,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->full_name,
                'phone' => $this->user->phone,
            ]),
        ];
    }
}
