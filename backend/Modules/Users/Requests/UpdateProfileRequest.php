<?php

namespace Rafeeq\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'full_name' => ['sometimes', 'string', 'min:3', 'max:150'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId)],
            'locale' => ['sometimes', Rule::in(['ar', 'en'])],
        ];
    }
}
