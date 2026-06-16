<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewDriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['approve', 'reject', 'suspend'])],
            'note' => ['nullable', 'string', 'max:500', 'required_unless:action,approve'],
        ];
    }

    public function messages(): array
    {
        return [
            'note.required_unless' => 'الملاحظة مطلوبة للرفض أو الإيقاف.',
        ];
    }
}
