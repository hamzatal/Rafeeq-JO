<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'make' => ['required', 'string', 'max:60'],
            'model' => ['required', 'string', 'max:60'],
            'year' => ['required', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'color' => ['required', 'string', 'max:40'],
            'plate_number' => ['required', 'string', 'max:30', 'unique:vehicles,plate_number'],
            'seats' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
