<?php

namespace Rafeeq\Modules\Routes\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RouteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'university_id' => [$required, 'uuid', 'exists:universities,id'],
            'from_area_id' => ['nullable', 'uuid', 'exists:areas,id'],
            'name' => [$required, 'string', 'max:150'],
            'price_fils' => [$required, 'integer', 'min:0'],
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:7'],
            'days' => ['sometimes', 'array'],
            'days.*' => ['integer', 'between:0,6'],
            'departure_time' => ['nullable', 'string', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'is_active' => ['sometimes', 'boolean'],

            // Optional stops list to sync with the route
            'stops' => ['sometimes', 'array'],
            'stops.*.pickup_point_id' => ['required_with:stops', 'uuid', 'exists:pickup_points,id'],
            'stops.*.stop_order' => ['nullable', 'integer', 'min:0'],
            'stops.*.eta_minutes' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
