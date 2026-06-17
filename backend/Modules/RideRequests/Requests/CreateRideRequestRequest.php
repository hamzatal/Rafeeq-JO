<?php

namespace Rafeeq\Modules\RideRequests\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\RideType;

class CreateRideRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'university_id' => ['required', 'uuid', 'exists:universities,id'],
            'pickup_lat' => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['required', 'numeric', 'between:-180,180'],
            'pickup_address' => ['nullable', 'string', 'max:200'],
            'desired_time' => ['required', 'date', 'after_or_equal:now'],
            'type' => ['sometimes', Rule::in(RideType::values())],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
