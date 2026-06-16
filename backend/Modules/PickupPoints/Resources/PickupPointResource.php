<?php

namespace Rafeeq\Modules\PickupPoints\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\PickupPoints\Models\PickupPoint;

/**
 * @mixin PickupPoint
 */
class PickupPointResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'area_id' => $this->area_id,
            'university_id' => $this->university_id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'landmark' => $this->landmark,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'is_active' => $this->is_active,
        ];
    }
}
