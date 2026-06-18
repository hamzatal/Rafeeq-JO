<?php

namespace Rafeeq\Modules\Chat\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Chat\Models\ChatConversation;

/**
 * @mixin ChatConversation
 */
class ChatConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $me = $request->user()?->id;
        $iAmStudent = $me !== null && $this->student_user_id === $me;
        $other = $iAmStudent ? $this->driver : $this->student;

        return [
            'id' => $this->id,
            'trip_id' => $this->trip_id,
            'other_party' => $other ? ['id' => $other->id, 'name' => $other->full_name] : null,
            'last_message_at' => $this->last_message_at?->toIso8601String(),
        ];
    }
}
