<?php

namespace Rafeeq\Modules\Users\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Modules\Users\Services\StaffService;
use Rafeeq\Shared\Enums\UserStatus;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $staffUser = $this->route('user');
        $userId = is_object($staffUser) ? $staffUser->id : $staffUser;

        return [
            'full_name' => ['sometimes', 'string', 'min:3', 'max:150'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId)],
            'status' => ['sometimes', Rule::in(UserStatus::values())],
            'role' => ['sometimes', Rule::in(StaffService::STAFF_ROLES)],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'max:72'],
        ];
    }
}
