<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'make' => ['sometimes', 'string', 'max:60'],
            'model' => ['sometimes', 'string', 'max:60'],
            'year' => ['sometimes', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'color' => ['sometimes', 'string', 'max:40'],
            'seats' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ];
    }
}
