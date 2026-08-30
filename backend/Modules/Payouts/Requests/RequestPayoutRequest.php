<?php

namespace Rafeeq\Modules\Payouts\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Modules\Payouts\Services\PayoutService;

class RequestPayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            /*
             * The floor is the SERVICE's constant, not a second number.
             *
             * This said `min:1` while `PayoutService::MIN_PAYOUT_FILS` is 5000 and is
             * enforced under a row lock — so the two already disagreed, and a reader of
             * this class learned the wrong rule. Nothing was exploitable; the hazard is
             * that a duplicated rule drifts, and this one already had.
             */
            'amount_fils' => ['required', 'integer', 'min:'.PayoutService::MIN_PAYOUT_FILS],
            'destination' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'amount_fils.required' => 'حدّد قيمة السحب.',
        ];
    }
}
