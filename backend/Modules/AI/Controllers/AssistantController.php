<?php

namespace Rafeeq\Modules\AI\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\AI\Models\AiConversation;
use Rafeeq\Modules\AI\Services\AssistantService;

class AssistantController extends Controller
{
    public function __construct(private readonly AssistantService $assistant) {}

    public function conversations(Request $request): JsonResponse
    {
        return $this->ok($this->assistant->conversations($request->user()));
    }

    public function messages(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->assertOwner($request, $conversation);

        return $this->ok($this->assistant->history($conversation));
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:1000'],
            'conversation_id' => ['nullable', 'uuid', 'exists:ai_conversations,id'],
        ]);

        $conversation = null;
        if (! empty($data['conversation_id'])) {
            $conversation = AiConversation::findOrFail($data['conversation_id']);
            $this->assertOwner($request, $conversation);
        }

        return $this->ok($this->assistant->send($request->user(), $conversation, $data['message']));
    }

    private function assertOwner(Request $request, AiConversation $conversation): void
    {
        if ($conversation->user_id !== $request->user()->id) {
            throw new AuthorizationException('هذه المحادثة لا تخصّك.');
        }
    }
}
