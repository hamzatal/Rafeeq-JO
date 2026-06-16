<?php

namespace Rafeeq\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmPhoneChangeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string', 'regex:/^\d{4,8}$/'],
        ];
    }
}
