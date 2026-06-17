<?php

namespace Rafeeq\Modules\Support\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Support\Models\TicketMessage;

/**
 * @mixin TicketMessage
 */
class TicketMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'is_staff' => $this->is_staff,
            'sender_id' => $this->sender_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
