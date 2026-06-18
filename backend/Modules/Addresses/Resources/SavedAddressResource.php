<?php

namespace Rafeeq\Modules\Addresses\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Addresses\Models\SavedAddress;

/**
 * @mixin SavedAddress
 */
class SavedAddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'title' => $this->title,
            'address_text' => $this->address_text,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'is_default' => $this->is_default,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
