<?php

namespace Rafeeq\Modules\PickupPoints\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PickupPointRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'area_id' => ['nullable', 'uuid', 'exists:areas,id'],
            'university_id' => ['nullable', 'uuid', 'exists:universities,id'],
            'name_ar' => [$required, 'string', 'max:120'],
            'name_en' => [$required, 'string', 'max:120'],
            'landmark' => ['nullable', 'string', 'max:200'],
            'lat' => [$required, 'numeric', 'between:-90,90'],
            'lng' => [$required, 'numeric', 'between:-180,180'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
