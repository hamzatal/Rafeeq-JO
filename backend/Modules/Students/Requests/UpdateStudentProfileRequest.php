<?php

namespace Rafeeq\Modules\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\Gender;

class UpdateStudentProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'university_id' => ['sometimes', 'nullable', 'uuid'],
            'default_pickup_point_id' => ['sometimes', 'nullable', 'uuid'],
            'student_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'faculty' => ['sometimes', 'nullable', 'string', 'max:120'],
            'gender' => ['sometimes', 'nullable', Rule::in(Gender::values())],
        ];
    }
}
