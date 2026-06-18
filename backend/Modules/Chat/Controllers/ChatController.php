<?php

namespace Rafeeq\Modules\Chat\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Chat\Models\ChatConversation;
use Rafeeq\Modules\Chat\Requests\SendMessageRequest;
use Rafeeq\Modules\Chat\Resources\ChatConversationResource;
use Rafeeq\Modules\Chat\Resources\ChatMessageResource;
use Rafeeq\Modules\Chat\Services\ChatService;
use Rafeeq\Modules\Trips\Models\Trip;

/**
 * In-app chat (student ↔ captain).
 * Routes: /api/v1/chat  (auth:sanctum — authorisation is per-conversation)
 */
class ChatController extends Controller
{
    public function __construct(private readonly ChatService $chat) {}

    public function conversations(Request $request): JsonResponse
    {
        $list = $this->chat->conversationsFor($request->user());

        return $this->ok(ChatConversationResource::collection($list));
    }

    /** Open/fetch the thread for a trip (captain may pass student_user_id). */
    public function openForTrip(Request $request, Trip $trip): JsonResponse
    {
        $conversation = $this->chat->openForTrip(
            $request->user(),
            $trip,
            $request->input('student_user_id'),
        );

        return $this->ok(new ChatConversationResource($conversation->load(['student:id,full_name', 'driver:id,full_name'])));
    }

    public function messages(Request $request, ChatConversation $conversation): JsonResponse
    {
        $messages = $this->chat->messages($request->user(), $conversation, $request->query('after'));

        return $this->ok(ChatMessageResource::collection($messages));
    }

    public function send(SendMessageRequest $request, ChatConversation $conversation): JsonResponse
    {
        $message = $this->chat->send($request->user(), $conversation, $request->input('body'));

        return $this->created(new ChatMessageResource($message), null);
    }

    public function read(Request $request, ChatConversation $conversation): JsonResponse
    {
        $count = $this->chat->markRead($request->user(), $conversation);

        return $this->ok(['marked' => $count]);
    }
}
