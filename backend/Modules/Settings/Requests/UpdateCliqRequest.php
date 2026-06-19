<?php

namespace Rafeeq\Modules\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCliqRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'alias' => ['sometimes', 'nullable', 'string', 'max:100'],
            'beneficiary_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
