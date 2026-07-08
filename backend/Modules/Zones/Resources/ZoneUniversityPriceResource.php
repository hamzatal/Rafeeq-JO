<?php

namespace Rafeeq\Modules\Zones\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;

/**
 * @mixin ZoneUniversityPrice
 */
class ZoneUniversityPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'zone_id' => $this->zone_id,
            'university_id' => $this->university_id,
            'fare_fils' => $this->fare_fils,
            'fare_jod' => round($this->fare_fils / 1000, 3),
            'is_active' => $this->is_active,
            'zone' => $this->whenLoaded('zone', fn () => [
                'id' => $this->zone->id,
                'name_ar' => $this->zone->name_ar,
                'name_en' => $this->zone->name_en,
                'city' => $this->zone->city,
            ]),
            'university' => $this->whenLoaded('university', fn () => [
                'id' => $this->university->id,
                'name_ar' => $this->university->name_ar,
                'name_en' => $this->university->name_en,
            ]),
        ];
    }
}
