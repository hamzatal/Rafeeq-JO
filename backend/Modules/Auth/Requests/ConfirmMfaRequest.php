<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmMfaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            // 6-digit TOTP or an XXXXX-XXXXX recovery code.
            'code' => ['required', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'رمز التحقق مطلوب.',
        ];
    }
}
