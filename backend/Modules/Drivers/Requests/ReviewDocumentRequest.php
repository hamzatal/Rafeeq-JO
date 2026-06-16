<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReviewDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'approve' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:500', 'required_if:approve,false'],
        ];
    }

    public function messages(): array
    {
        return [
            'note.required_if' => 'سبب الرفض مطلوب.',
        ];
    }
}
