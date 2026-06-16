<?php

namespace Rafeeq\Modules\Trips\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'pickup_point_id' => ['nullable', 'uuid', 'exists:pickup_points,id'],
        ];
    }
}
