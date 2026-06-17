<?php

namespace Rafeeq\Modules\Payments\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\PaymentPurpose;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $number
 * @property string $user_id
 * @property string|null $payable_type
 * @property string|null $payable_id
 * @property PaymentPurpose $purpose
 * @property int $amount_fils
 * @property string $currency
 * @property string $method
 * @property PaymentStatus $status
 * @property string|null $reject_reason
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property string|null $approved_by
 */
class PaymentRequest extends Model
{
    use HasUuid;

    protected $fillable = [
        'number', 'user_id', 'payable_type', 'payable_id', 'purpose',
        'amount_fils', 'currency', 'method', 'status', 'reject_reason',
        'expires_at', 'approved_at', 'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'purpose' => PaymentPurpose::class,
            'status' => PaymentStatus::class,
            'amount_fils' => 'integer',
            'expires_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->latest('created_at');
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments()->first();
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isPayable(): bool
    {
        return in_array($this->status, [PaymentStatus::Pending, PaymentStatus::Submitted, PaymentStatus::UnderReview], true)
            && ! $this->isExpired();
    }
}
