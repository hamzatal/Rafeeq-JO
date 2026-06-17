<?php

namespace Rafeeq\Modules\Ratings\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Enums\RatingDirection;

class RateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'direction' => ['required', 'string', 'in:'.implode(',', RatingDirection::values())],
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
            // Required only when a driver rates a specific student.
            'student_id' => ['nullable', 'uuid', 'exists:users,id'],
        ];
    }
}
