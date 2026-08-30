<?php

namespace Rafeeq\Modules\Trips\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Modules\Trips\Data\TripCode;

class ConfirmDropoffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'code' => TripCode::rule(),
        ];
    }
}
