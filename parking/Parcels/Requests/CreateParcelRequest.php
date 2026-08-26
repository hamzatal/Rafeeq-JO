<?php

namespace Rafeeq\Modules\Parcels\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Enums\ParcelSize;

class CreateParcelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'receiver_name' => ['required', 'string', 'max:120'],
            'receiver_phone' => ['required', 'string', 'max:20'],
            'from_point_id' => ['nullable', 'uuid', 'exists:pickup_points,id'],
            'to_point_id' => ['nullable', 'uuid', 'exists:pickup_points,id'],
            'from_address' => ['nullable', 'string', 'max:200'],
            'to_address' => ['nullable', 'string', 'max:200'],
            'category' => ['nullable', 'string', 'max:40'],
            'size' => ['required', 'in:'.implode(',', ParcelSize::values())],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }
}
