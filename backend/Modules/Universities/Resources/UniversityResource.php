<?php

namespace Rafeeq\Modules\Universities\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Universities\Models\University;

/**
 * @mixin University
 */
class UniversityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name_ar' => $this->name_ar,
            'name_en' => $this->name_en,
            'code' => $this->code,
            'city' => $this->city,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'logo_url' => $this->logo_path ? url($this->logo_path) : null,
            'contact_phone' => $this->contact_phone,
            'is_active' => $this->is_active,
        ];
    }
}
