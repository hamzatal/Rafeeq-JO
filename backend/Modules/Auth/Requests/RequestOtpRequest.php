<?php

namespace Rafeeq\Modules\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Support\Phone;

/**
 * Requests a login OTP (passwordless flow) for an existing user.
 */
class RequestOtpRequest extends FormRequest
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
        ];
    }
}
