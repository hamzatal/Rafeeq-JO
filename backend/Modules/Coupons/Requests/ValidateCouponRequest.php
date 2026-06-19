<?php

namespace Rafeeq\Modules\Coupons\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\CouponScope;

class ValidateCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:40'],
            'scope' => ['required', Rule::in(CouponScope::values())],
            'amount_fils' => ['required', 'integer', 'min:1'],
            'plan_id' => ['nullable', 'uuid'],
        ];
    }
}
