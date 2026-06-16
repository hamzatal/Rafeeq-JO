<?php

namespace Rafeeq\Modules\Trips\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScheduleTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'route_id' => ['required', 'uuid', 'exists:routes,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'vehicle_id' => ['nullable', 'uuid', 'exists:vehicles,id'],
        ];
    }
}
