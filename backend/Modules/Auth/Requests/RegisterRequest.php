<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Core\Support\Clock;
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
            // 18 is Jordan's age of majority. Under it a rider cannot form a binding
            // contract for the fares and fees this platform charges, and there is no
            // guardian-consent instrument — so it is a hard floor.
            // `before_or_equal` against a computed date rather than an age arithmetic
            // check, so leap years and timezones are the date library's problem.
            'date_of_birth' => ['required', 'date', 'before_or_equal:'.$this->minBirthDate(), 'after:1920-01-01'],
            // Which version of the terms was accepted, recorded per user.
            'accept_terms' => ['required', 'accepted'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            // Only student/driver may self-register. Staff are seeded/created by admins.
            'type' => ['sometimes', Rule::in([UserType::Student->value, UserType::Driver->value])],
        ];
    }

    /** The latest birth date that still satisfies the minimum age, in app local time. */
    private function minBirthDate(): string
    {
        return Clock::now()
            ->subYears((int) config('rafeeq.min_age', 18))
            ->format('Y-m-d');
    }

    public function messages(): array
    {
        return [
            'date_of_birth.required' => 'تاريخ الميلاد مطلوب.',
            'date_of_birth.before_or_equal' => 'يجب أن يكون عمرك '.config('rafeeq.min_age', 18).' سنة أو أكثر لاستخدام رفيق.',
            'date_of_birth.after' => 'تاريخ الميلاد غير صحيح.',
            'accept_terms.accepted' => 'يجب الموافقة على الشروط وسياسة الخصوصية.',
            'phone.regex' => 'رقم الهاتف غير صالح. استخدم رقم أردني صحيح.',
            'phone.unique' => 'هذا الرقم مسجّل مسبقاً.',
            'full_name.required' => 'الاسم الكامل مطلوب.',
            'password.min' => 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
        ];
    }
}
