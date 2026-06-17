<?php

namespace Rafeeq\Modules\Zones\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ZoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name_ar' => [$required, 'string', 'max:120'],
            'name_en' => [$required, 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:80'],
            'center_lat' => [$required, 'numeric', 'between:-90,90'],
            'center_lng' => [$required, 'numeric', 'between:-180,180'],
            'radius_km' => ['nullable', 'numeric', 'between:0.5,30'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
