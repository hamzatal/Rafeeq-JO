<?php

namespace Rafeeq\Modules\Notifications\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Fan-out an admin broadcast to a (potentially large) audience off the request
 * cycle. The HTTP request returns immediately with an estimated audience size;
 * the actual per-user delivery happens here, chunked, on the queue worker.
 *
 * Each individual delivery is best-effort inside NotificationService (never
 * throws), so one bad recipient can't fail the whole batch.
 */
class BroadcastNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Give large fan-outs room to finish; retry the whole batch a couple times. */
    public int $timeout = 600;

    public int $tries = 3;

    /**
     * @param  'all'|'students'|'drivers'|'users'  $audience
     * @param  array<int, string>  $userIds
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        private readonly string $audience,
        private readonly array $userIds,
        private readonly string $title,
        private readonly string $body,
        private readonly array $data = [],
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $query = User::query()->where('status', '!=', UserStatus::Banned->value);
        match ($this->audience) {
            'students' => $query->where('type', UserType::Student->value),
            'drivers' => $query->where('type', UserType::Driver->value),
            'users' => $query->whereIn('id', $this->userIds),
            default => $query->whereIn('type', [UserType::Student->value, UserType::Driver->value]),
        };

        $sent = 0;
        $query->select(['id', 'type', 'status'])->chunkById(200, function ($users) use (&$sent, $notifications) {
            $sent += $notifications->broadcast($users, $this->title, $this->body, $this->data);
        });

        Log::info('[Notifications] broadcast delivered', [
            'audience' => $this->audience,
            'sent' => $sent,
        ]);
    }
}
