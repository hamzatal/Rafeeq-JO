<?php

namespace Rafeeq\Modules\Chat\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'body.required' => 'لا يمكن إرسال رسالة فارغة.',
            'body.max' => 'الرسالة طويلة جداً.',
        ];
    }
}
