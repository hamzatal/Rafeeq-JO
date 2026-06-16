<?php

namespace Rafeeq\Modules\Subscriptions\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubscribeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'uuid', 'exists:subscription_plans,id'],
            'route_id' => ['nullable', 'uuid', 'exists:routes,id'],
        ];
    }
}
