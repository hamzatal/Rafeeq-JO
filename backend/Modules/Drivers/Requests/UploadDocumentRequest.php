<?php

namespace Rafeeq\Modules\Drivers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Shared\Enums\DocumentType;

class UploadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(DocumentType::values())],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:8192'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ];
    }

    public function type(): DocumentType
    {
        return DocumentType::from($this->input('type'));
    }
}
