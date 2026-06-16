<?php

namespace Rafeeq\Modules\Subscriptions\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\SubscriptionType;

class PlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'university_id' => ['nullable', 'uuid', 'exists:universities,id'],
            'route_id' => ['nullable', 'uuid', 'exists:routes,id'],
            'name' => [$required, 'string', 'max:150'],
            'type' => [$required, Rule::in(SubscriptionType::values())],
            'price_fils' => [$required, 'integer', 'min:0'],
            'rides_count' => ['nullable', 'integer', 'min:1'],
            'duration_days' => ['nullable', 'integer', 'min:1', 'max:400'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
