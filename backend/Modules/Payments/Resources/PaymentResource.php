<?php

namespace Rafeeq\Modules\Payments\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Payments\Models\Payment;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'method' => $this->method,
            'status' => $this->status,
            'ai_confidence' => $this->ai_confidence,
            'verified_by' => $this->verified_by,
            'bank_reference' => $this->bank_reference,
            'fraud_flags' => $this->fraud_flags ?? [],
            'extracted' => $this->extracted,
            'notes' => $this->notes,
            'has_proof' => $this->proof_path !== null,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
