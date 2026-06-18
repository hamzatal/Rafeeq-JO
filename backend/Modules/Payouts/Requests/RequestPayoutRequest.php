<?php

namespace Rafeeq\Modules\Payouts\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
            'amount_fils' => ['required', 'integer', 'min:1'],
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
