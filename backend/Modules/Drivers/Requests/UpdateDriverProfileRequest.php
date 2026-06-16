<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDriverProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'national_id' => ['sometimes', 'string', 'min:6', 'max:30'],
        ];
    }
}
