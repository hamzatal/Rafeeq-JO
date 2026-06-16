<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\OtpPurpose;
use Rafeeq\Shared\Support\Phone;

class ResendOtpRequest extends FormRequest
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
            'phone' => ['required', 'string', 'regex:/^\+9627[789]\d{7}$/'],
            'purpose' => ['required', Rule::in([
                OtpPurpose::Register->value,
                OtpPurpose::Login->value,
                OtpPurpose::ResetPassword->value,
            ])],
        ];
    }

    public function purpose(): OtpPurpose
    {
        return OtpPurpose::from($this->input('purpose'));
    }
}
