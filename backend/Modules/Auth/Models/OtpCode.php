<?php

namespace Rafeeq\Modules\Auth\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Enums\OtpChannel;
use Rafeeq\Shared\Enums\OtpPurpose;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $identifier
 * @property OtpChannel $channel
 * @property OtpPurpose $purpose
 * @property string $code_hash
 * @property int $attempts
 * @property int $max_attempts
 * @property Carbon $expires_at
 * @property Carbon|null $consumed_at
 */
class OtpCode extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = [
        'identifier', 'channel', 'purpose', 'code_hash',
        'attempts', 'max_attempts', 'expires_at', 'consumed_at',
        'ip', 'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'channel' => OtpChannel::class,
            'purpose' => OtpPurpose::class,
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
            'attempts' => 'integer',
            'max_attempts' => 'integer',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return $this->consumed_at !== null;
    }

    public function hasAttemptsLeft(): bool
    {
        return $this->attempts < $this->max_attempts;
    }

    public function isUsable(): bool
    {
        return ! $this->isConsumed() && ! $this->isExpired() && $this->hasAttemptsLeft();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('consumed_at')->where('expires_at', '>', now());
    }

    public function scopeForRequest(Builder $query, string $identifier, OtpPurpose $purpose): Builder
    {
        return $query->where('identifier', $identifier)->where('purpose', $purpose->value);
    }
}
