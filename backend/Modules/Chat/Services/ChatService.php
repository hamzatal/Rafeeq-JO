<?php

namespace Rafeeq\Modules\Chat\Services;

use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Chat\Events\ChatMessageSent;
use Rafeeq\Modules\Chat\Models\ChatConversation;
use Rafeeq\Modules\Chat\Models\ChatMessage;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Shared\Enums\NotificationType;

/**
 * In-app 1:1 messaging between a student and the captain of their trip.
 * Phone numbers stay private — coordination happens through the app.
 */
class ChatService extends BaseService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * Open (or fetch) the conversation between the current user and the other
     * party for a given trip.
     *
     * - Student caller: must be a (non-cancelled) passenger on the trip.
     * - Captain caller: must own the trip and pass the target student id.
     */
    public function openForTrip(User $user, Trip $trip, ?string $studentUserId = null): ChatConversation
    {
        $trip->loadMissing('driver');
        $driverUserId = $trip->driver?->user_id;

        if (! $driverUserId) {
            throw new BusinessRuleException('لا يوجد كابتن لهذه الرحلة بعد.', 'TRIP_HAS_NO_CAPTAIN');
        }

        if ($user->id === $driverUserId) {
            // Captain opening a thread with one of their passengers.
            if (! $studentUserId) {
                throw new BusinessRuleException('حدّد الطالب لبدء المحادثة.', 'STUDENT_REQUIRED');
            }
            $this->assertPassenger($trip, $studentUserId);
            $student = $studentUserId;
        } else {
            // Student opening a thread with the captain.
            $this->assertPassenger($trip, $user->id);
            $student = $user->id;
        }

        return ChatConversation::firstOrCreate(
            ['trip_id' => $trip->id, 'student_user_id' => $student, 'driver_user_id' => $driverUserId],
        );
    }

    /** @return \Illuminate\Database\Eloquent\Collection<int, ChatConversation> */
    public function conversationsFor(User $user)
    {
        return ChatConversation::with(['student:id,full_name', 'driver:id,full_name'])
            ->where('student_user_id', $user->id)
            ->orWhere('driver_user_id', $user->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->get();
    }

    public function assertParticipant(User $user, ChatConversation $conversation): void
    {
        if (! $conversation->hasParticipant($user->id)) {
            throw new AuthorizationException('لست طرفاً في هذه المحادثة.');
        }
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, ChatMessage>
     */
    public function messages(User $user, ChatConversation $conversation, ?string $afterId = null)
    {
        $this->assertParticipant($user, $conversation);

        return ChatMessage::where('conversation_id', $conversation->id)
            ->when($afterId, function ($q) use ($afterId) {
                $after = ChatMessage::find($afterId);
                if ($after) {
                    $q->where('created_at', '>=', $after->created_at)->where('id', '!=', $after->id);
                }
            })
            ->orderBy('created_at')
            ->limit(200)
            ->get();
    }

    public function send(User $user, ChatConversation $conversation, string $body): ChatMessage
    {
        $this->assertParticipant($user, $conversation);

        $body = trim($body);
        if ($body === '') {
            throw new BusinessRuleException('الرسالة فارغة.', 'EMPTY_MESSAGE');
        }

        return $this->transaction(function () use ($user, $conversation, $body) {
            $message = ChatMessage::create([
                'conversation_id' => $conversation->id,
                'sender_user_id' => $user->id,
                'body' => $body,
            ]);

            $conversation->forceFill(['last_message_at' => now()])->save();

            // Realtime push (best-effort) + durable notification to the recipient.
            ChatMessageSent::dispatch(
                $conversation->id,
                $message->id,
                $user->id,
                $message->body,
                $message->created_at->toIso8601String(),
            );

            $recipientId = $conversation->student_user_id === $user->id
                ? $conversation->driver_user_id
                : $conversation->student_user_id;

            $recipient = User::find($recipientId);
            if ($recipient) {
                $this->notifications->notify(
                    $recipient,
                    NotificationType::General,
                    'رسالة جديدة من '.($user->full_name ?? 'مستخدم'),
                    mb_strlen($body) > 80 ? mb_substr($body, 0, 80).'…' : $body,
                    ['conversation_id' => $conversation->id, 'sender_user_id' => $user->id],
                );
            }

            return $message;
        });
    }

    /** Mark the other party's messages as read for this user. */
    public function markRead(User $user, ChatConversation $conversation): int
    {
        $this->assertParticipant($user, $conversation);

        return ChatMessage::where('conversation_id', $conversation->id)
            ->where('sender_user_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function unreadCount(User $user, ChatConversation $conversation): int
    {
        return ChatMessage::where('conversation_id', $conversation->id)
            ->where('sender_user_id', '!=', $user->id)
            ->whereNull('read_at')
            ->count();
    }

    private function assertPassenger(Trip $trip, string $studentUserId): void
    {
        $isPassenger = TripPassenger::where('trip_id', $trip->id)
            ->where('student_id', $studentUserId)
            ->where('status', '!=', 'cancelled')
            ->exists();

        if (! $isPassenger) {
            throw new AuthorizationException('الطالب ليس راكباً في هذه الرحلة.');
        }
    }
}
