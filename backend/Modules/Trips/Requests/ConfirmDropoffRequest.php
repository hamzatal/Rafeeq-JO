<?php

namespace Rafeeq\Modules\Trips\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmDropoffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'regex:/^\d{4,8}$/'],
        ];
    }
}
