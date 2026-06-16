<?php

namespace Rafeeq\Modules\Universities\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUniversityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $id = $this->route('university')?->id ?? $this->route('university');

        return [
            'name_ar' => ['sometimes', 'string', 'max:150'],
            'name_en' => ['sometimes', 'string', 'max:150'],
            'code' => ['sometimes', 'string', 'max:20', Rule::unique('universities', 'code')->ignore($id)],
            'city' => ['nullable', 'string', 'max:80'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
