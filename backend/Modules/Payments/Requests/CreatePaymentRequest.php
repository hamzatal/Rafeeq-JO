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
            /*
             * A floor with no ceiling, on the one self-service field that can end in a
             * WALLET CREDIT — `runVerification()` auto-approves on the vision model's
             * verdict, with no human in the path. The admin equivalent has been capped
             * since it was written (`admin_credit_max_fils`, with the comment «A manual
             * credit mints balance, so it is capped»); the self-service one was not.
             */
            'amount_fils' => ['nullable', 'integer', 'min:1000', 'max:'.(int) config('rafeeq.topup_max_fils', 200000)],
            'subscription_id' => ['nullable', 'uuid', 'exists:subscriptions,id'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ];
    }
}
