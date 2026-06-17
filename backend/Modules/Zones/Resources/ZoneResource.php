<?php

namespace Rafeeq\Modules\Zones\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Zones\Models\Zone;

/**
 * @mixin Zone
 */
class ZoneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'city' => $this->city,
            'center_lat' => $this->center_lat,
            'center_lng' => $this->center_lng,
            'radius_km' => $this->radius_km,
            'is_active' => $this->is_active,
        ];
    }
}
