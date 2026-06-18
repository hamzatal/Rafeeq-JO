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
            // Optional polygon geofence: array of [lat, lng] vertices (min 3).
            'boundary' => ['nullable', 'array', 'min:3'],
            'boundary.*' => ['array', 'size:2'],
            'boundary.*.0' => ['required_with:boundary', 'numeric', 'between:-90,90'],
            'boundary.*.1' => ['required_with:boundary', 'numeric', 'between:-180,180'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
