<?php

namespace Rafeeq\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates admin edits to the pricing knobs. Every field is optional
 * (partial update) but bounded to sane ranges so the fare engine can't be
 * pushed into nonsensical territory (negative rates, >100% commission, etc.).
 */
class UpdatePricingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'commission_percent' => ['sometimes', 'integer', 'min:0', 'max:90'],
            'default_fare_fils' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'express_fee_fils' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'min_fill_riders' => ['sometimes', 'integer', 'min:1', 'max:8'],
        ];
    }
}
