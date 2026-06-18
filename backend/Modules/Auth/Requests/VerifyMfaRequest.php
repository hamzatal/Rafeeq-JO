<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyMfaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mfa_token' => ['required', 'string'],
            // 6-digit TOTP or an XXXXX-XXXXX recovery code.
            'code' => ['required', 'string', 'max:20'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'mfa_token.required' => 'جلسة التحقق مطلوبة.',
            'code.required' => 'رمز التحقق مطلوب.',
        ];
    }
}
