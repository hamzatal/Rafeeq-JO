<?php

namespace Rafeeq\Modules\Support\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Support\Models\SupportTicket;

/**
 * @mixin SupportTicket
 */
class SupportTicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'category' => $this->category->value,
            'category_label' => $this->category->labelAr(),
            'subject' => $this->subject,
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'priority' => $this->priority->value,
            'priority_label' => $this->priority->labelAr(),
            'level' => $this->level,
            'ai_triage' => $this->ai_triage,
            'assigned_to' => $this->assigned_to,
            'last_reply_at' => $this->last_reply_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'messages' => TicketMessageResource::collection($this->whenLoaded('messages')),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->full_name,
                'phone' => $this->user->phone,
            ]),
        ];
    }
}
