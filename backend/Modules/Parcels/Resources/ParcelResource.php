<?php

namespace Rafeeq\Modules\Parcels\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Parcels\Models\Parcel;

/**
 * @mixin Parcel
 *
 * The sender sees the pickup code (to hand to the courier). The delivery
 * code is only returned to the sender so they can pass it to the receiver.
 */
class ParcelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOwner = $request->user() && $request->user()->id === $this->sender_id;

        return [
            'id' => $this->id,
            'number' => $this->number,
            'receiver_name' => $this->receiver_name,
            'receiver_phone' => $this->receiver_phone,
            'from_address' => $this->from_address,
            'to_address' => $this->to_address,
            'category' => $this->category,
            'size' => $this->size->value,
            'size_label' => $this->size->labelAr(),
            'description' => $this->description,
            'fee_fils' => $this->fee_fils,
            'fee_jod' => round($this->fee_fils / 1000, 3),
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'picked_up_at' => $this->picked_up_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'pickup_code' => $isOwner ? $this->pickup_code : null,
            'delivery_code' => $isOwner ? $this->delivery_code : null,
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($e) => [
                'type' => $e->type,
                'at' => $e->at?->toIso8601String(),
            ])),
        ];
    }
}
