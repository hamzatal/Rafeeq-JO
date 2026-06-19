<?php

namespace Rafeeq\Modules\Coupons\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $coupon_id
 * @property string $user_id
 * @property int $discount_fils
 * @property string|null $context_type
 * @property string|null $context_id
 */
class CouponRedemption extends Model
{
    use HasUuid;

    protected $fillable = [
        'coupon_id', 'user_id', 'discount_fils', 'context_type', 'context_id',
    ];

    protected function casts(): array
    {
        return [
            'discount_fils' => 'integer',
        ];
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }
}
