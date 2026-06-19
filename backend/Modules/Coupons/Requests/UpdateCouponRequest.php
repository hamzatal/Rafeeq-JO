<?php

namespace Rafeeq\Modules\Coupons\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;

class UpdateCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('coupon')?->id;

        return [
            'code' => ['sometimes', 'string', 'min:3', 'max:40', Rule::unique('coupons', 'code')->ignore($id)],
            'description' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(CouponType::values())],
            'value' => ['sometimes', 'integer', 'min:1'],
            'max_discount_fils' => ['nullable', 'integer', 'min:0'],
            'min_amount_fils' => ['nullable', 'integer', 'min:0'],
            'scope' => ['sometimes', Rule::in(CouponScope::values())],
            'university_id' => ['nullable', 'uuid', 'exists:universities,id'],
            'plan_id' => ['nullable', 'uuid', 'exists:subscription_plans,id'],
            'first_order_only' => ['boolean'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['boolean'],
        ];
    }
}
