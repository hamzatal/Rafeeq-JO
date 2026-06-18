<?php

namespace Rafeeq\Modules\Guardians\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LinkGuardianRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'min:6', 'max:20'],
            'relation' => ['nullable', 'string', 'in:parent,father,mother,sibling,relative,other'],
            'name' => ['nullable', 'string', 'max:150'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone.required' => 'رقم هاتف ولي الأمر مطلوب.',
        ];
    }
}
