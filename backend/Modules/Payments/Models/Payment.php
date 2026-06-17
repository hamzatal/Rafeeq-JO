<?php

namespace Rafeeq\Modules\Payments\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * A single payment attempt against a PaymentRequest (e.g. an uploaded
 * CliQ transfer proof + its verification result).
 *
 * @property string $id
 * @property string $payment_request_id
 * @property string $method
 * @property string|null $proof_path
 * @property array|null $extracted
 * @property int|null $ai_confidence
 * @property string|null $verified_by
 * @property string $status
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $submitted_at
 */
class Payment extends Model
{
    use HasUuid;

    protected $fillable = [
        'payment_request_id', 'method', 'proof_path', 'extracted',
        'ai_confidence', 'verified_by', 'status', 'notes', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'extracted' => 'array',
            'ai_confidence' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(PaymentRequest::class, 'payment_request_id');
    }
}
