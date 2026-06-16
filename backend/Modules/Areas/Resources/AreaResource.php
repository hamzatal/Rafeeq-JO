<?php

namespace Rafeeq\Modules\Areas\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Areas\Models\Area;

/**
 * @mixin Area
 */
class AreaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'governorate' => $this->governorate,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'is_active' => $this->is_active,
        ];
    }
}
