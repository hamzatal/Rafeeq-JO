<?php

namespace Rafeeq\Modules\Drivers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Drivers\Models\Vehicle;

/**
 * @mixin Vehicle
 */
class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'make' => $this->make,
            'model' => $this->model,
            'year' => $this->year,
            'color' => $this->color,
            'plate_number' => $this->plate_number,
            'seats' => $this->seats,
            'status' => $this->status,
        ];
    }
}
