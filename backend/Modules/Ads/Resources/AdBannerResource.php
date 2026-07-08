<?php

namespace Rafeeq\Modules\Ads\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Ads\Models\AdBanner;

/**
 * @mixin AdBanner
 */
class AdBannerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'image_url' => $this->image_url,
            'link_url' => $this->link_url,
            'placement' => $this->placement,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
        ];
    }
}
