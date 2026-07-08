<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Support\Phone;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Normalise a phone identifier only; email logins pass through untouched.
        if ($this->filled('phone') && ! str_contains((string) $this->input('phone'), '@')) {
            $this->merge(['phone' => Phone::normalize((string) $this->input('phone')) ?? $this->input('phone')]);
        }
        if ($this->filled('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }

    public function rules(): array
    {
        // Login accepts EITHER a Jordan phone (student/captain apps) OR an email
        // (admin dashboard). One of the two is required, plus a password.
        return [
            'phone' => ['required_without:email', 'nullable', 'string', 'regex:/^\+9627[789]\d{7}$/'],
            'email' => ['required_without:phone', 'nullable', 'email', 'max:150'],
            'password' => ['required', 'string'],
            'device_name' => ['sometimes', 'string', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'رقم الهاتف غير صالح.',
            'email.email' => 'البريد الإلكتروني غير صالح.',
            'password.required' => 'كلمة المرور مطلوبة.',
        ];
    }
}
