<?php

namespace Rafeeq\Modules\Universities\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUniversityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name_ar' => ['required', 'string', 'max:150'],
            'name_en' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:20', 'unique:universities,code'],
            'city' => ['nullable', 'string', 'max:80'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
