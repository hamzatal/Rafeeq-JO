<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\UserType;
use Rafeeq\Shared\Support\Phone;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('phone')) {
            $this->merge(['phone' => Phone::normalize((string) $this->input('phone')) ?? $this->input('phone')]);
        }
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:3', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^\+9627[789]\d{7}$/', 'unique:users,phone'],
            'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            // Only student/driver may self-register. Staff are seeded/created by admins.
            'type' => ['sometimes', Rule::in([UserType::Student->value, UserType::Driver->value])],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'رقم الهاتف غير صالح. استخدم رقم أردني صحيح.',
            'phone.unique' => 'هذا الرقم مسجّل مسبقاً.',
            'full_name.required' => 'الاسم الكامل مطلوب.',
            'password.min' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        ];
    }
}
