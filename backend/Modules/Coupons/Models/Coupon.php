<?php

namespace Rafeeq\Modules\Coupons\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $code
 * @property CouponType $type
 * @property int $value
 * @property int|null $max_discount_fils
 * @property int $min_amount_fils
 * @property CouponScope $scope
 * @property string|null $university_id
 * @property string|null $plan_id
 * @property bool $first_order_only
 * @property int|null $usage_limit
 * @property int|null $per_user_limit
 * @property int $used_count
 * @property Carbon|null $starts_at
 * @property Carbon|null $expires_at
 * @property bool $is_active
 */
class Coupon extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'code', 'description', 'type', 'value', 'max_discount_fils', 'min_amount_fils',
        'scope', 'university_id', 'plan_id', 'first_order_only',
        'usage_limit', 'per_user_limit', 'used_count', 'starts_at', 'expires_at', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'scope' => CouponScope::class,
            'value' => 'integer',
            'max_discount_fils' => 'integer',
            'min_amount_fils' => 'integer',
            'usage_limit' => 'integer',
            'per_user_limit' => 'integer',
            'used_count' => 'integer',
            'first_order_only' => 'boolean',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    /** Whether the coupon is within its valid date window. */
    public function withinWindow(): bool
    {
        $now = now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->expires_at && $now->gt($this->expires_at)) {
            return false;
        }

        return true;
    }

    /** Whether the total usage limit has been reached. */
    public function limitReached(): bool
    {
        return $this->usage_limit !== null && $this->used_count >= $this->usage_limit;
    }
}
