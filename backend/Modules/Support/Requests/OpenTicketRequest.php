<?php

namespace Rafeeq\Modules\Support\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Rafeeq\Shared\Enums\TicketCategory;

class OpenTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', 'string', 'in:'.implode(',', TicketCategory::values())],
            'subject' => ['required', 'string', 'min:3', 'max:150'],
            'body' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }
}
