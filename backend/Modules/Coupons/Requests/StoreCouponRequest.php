<?php

namespace Rafeeq\Modules\Coupons\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\CouponScope;
use Rafeeq\Shared\Enums\CouponType;

class StoreCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'min:3', 'max:40', 'unique:coupons,code'],
            'description' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in(CouponType::values())],
            'value' => ['required', 'integer', 'min:1'],
            'max_discount_fils' => ['nullable', 'integer', 'min:0'],
            'min_amount_fils' => ['nullable', 'integer', 'min:0'],
            'scope' => ['required', Rule::in(CouponScope::values())],
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

    public function messages(): array
    {
        return [
            'code.unique' => 'رمز الخصم مستخدم مسبقاً.',
            'value.min' => 'قيمة الخصم يجب أن تكون أكبر من صفر.',
        ];
    }
}
