<?php

namespace Rafeeq\Modules\Payments\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Enums\PaymentPurpose;

class CreatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'purpose' => ['required', 'string', 'in:'.implode(',', PaymentPurpose::values())],
            // For wallet_topup: amount is required. For subscription: derived from the plan.
            'amount_fils' => ['nullable', 'integer', 'min:1000'],
            'subscription_id' => ['nullable', 'uuid', 'exists:subscriptions,id'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ];
    }
}
