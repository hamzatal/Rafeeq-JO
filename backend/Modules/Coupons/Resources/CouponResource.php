<?php

namespace Rafeeq\Modules\Coupons\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Coupons\Models\Coupon;

/**
 * @mixin Coupon
 */
class CouponResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'type' => $this->type->value,
            'type_label' => $this->type->labelAr(),
            'value' => $this->value,
            'max_discount_fils' => $this->max_discount_fils,
            'min_amount_fils' => $this->min_amount_fils,
            'scope' => $this->scope->value,
            'scope_label' => $this->scope->labelAr(),
            'university_id' => $this->university_id,
            'plan_id' => $this->plan_id,
            'first_order_only' => $this->first_order_only,
            'usage_limit' => $this->usage_limit,
            'per_user_limit' => $this->per_user_limit,
            'used_count' => $this->used_count,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
