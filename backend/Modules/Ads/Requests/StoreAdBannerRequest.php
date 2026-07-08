<?php

namespace Rafeeq\Modules\Ads\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Rafeeq\Modules\Ads\Models\AdBanner;

class StoreAdBannerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'image_url' => ['required', 'url', 'max:500'],
            'link_url' => ['nullable', 'url', 'max:500'],
            'placement' => ['required', 'string', Rule::in(AdBanner::PLACEMENTS)],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }
}
