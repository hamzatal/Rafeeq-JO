<?php

namespace Rafeeq\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Modules\Users\Services\StaffService;
use Rafeeq\Shared\Support\Phone;

class StoreStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
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
            'password' => ['required', 'string', 'min:8', 'max:72'],
            'role' => ['required', Rule::in(StaffService::STAFF_ROLES)],
            'locale' => ['sometimes', Rule::in(['ar', 'en'])],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'رقم الهاتف غير صالح. استخدم رقم أردني صحيح.',
            'phone.unique' => 'هذا الرقم مسجّل مسبقاً.',
            'full_name.required' => 'الاسم الكامل مطلوب.',
            'password.min' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
            'role.in' => 'الدور غير صالح.',
        ];
    }
}
