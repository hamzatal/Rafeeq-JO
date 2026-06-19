<?php

namespace Rafeeq\Modules\Notifications\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Models\DeviceToken;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Modules\Notifications\Models\NotificationPreference;
use Rafeeq\Shared\Enums\NotificationType;

/**
 * Central notification dispatcher.
 *
 * Delivery policy:
 *  - In-app (DB): ALWAYS recorded so there is a durable inbox.
 *  - Push (FCM):  when push is enabled, the category is allowed, and the
 *                 user has device tokens.
 *  - SMS:         fallback for CRITICAL notifications (safety/money) when
 *                 push is unavailable/disabled — safety categories can't be
 *                 fully muted.
 *
 * Delivery never throws: a messaging failure must not break the business
 * transaction that triggered it.
 */
class NotificationService extends BaseService
{
    public function __construct(
        private readonly PushGateway $push,
        private readonly SmsGateway $sms,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function notify(User $user, NotificationType $type, string $title, string $body, array $data = []): ?Notification
    {
        // Notification dispatch is a side-effect: it must never throw into (and
        // roll back) the business transaction that triggered it.
        try {
            $category = $type->category();
            $critical = $type->isCritical();
            $prefs = $this->preferences($user);
            $channels = ['inapp'];

            // Push delivery.
            $allowsCategory = $critical || $prefs->allows($category);
            if ($prefs->push_enabled && $allowsCategory) {
                $pushOptions = [
                    'channel_id' => $type->channelId(),
                    'sound' => $type->sound(),
                    'priority' => $type->pushPriority(),
                ];
                if ($this->sendPush($user, $title, $body, array_merge($data, ['type' => $type->value]), $pushOptions)) {
                    $channels[] = 'push';
                }
            }

            // SMS fallback for critical notifications when push didn't go out.
            if ($critical && ! in_array('push', $channels, true) && $prefs->sms_enabled) {
                if ($this->sendSms($user, $title, $body)) {
                    $channels[] = 'sms';
                }
            }

            return Notification::create([
                'user_id' => $user->id,
                'type' => $type->value,
                'category' => $category,
                'title' => $title,
                'body' => $body,
                'data' => $data ?: null,
                'channels' => $channels,
                'is_critical' => $critical,
            ]);
        } catch (\Throwable $e) {
            Log::warning('[Notifications] notify failed', [
                'user' => $user->id,
                'type' => $type->value,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function preferences(User $user): NotificationPreference
    {
        return NotificationPreference::firstOrCreate(['user_id' => $user->id]);
    }

    /**
     * Admin broadcast: send the same notification to many users. Returns the
     * number actually recorded. Each send is best-effort (never throws).
     *
     * @param  \Illuminate\Support\Collection<int, User>  $users
     * @param  array<string, mixed>  $data
     */
    public function broadcast($users, string $title, string $body, array $data = []): int
    {
        $count = 0;
        foreach ($users as $user) {
            if ($this->notify($user, NotificationType::General, $title, $body, $data)) {
                $count++;
            }
        }

        return $count;
    }

    /** Register (upsert) a device token for push delivery. */
    public function registerDevice(User $user, string $token, string $platform = 'android'): DeviceToken
    {
        return DeviceToken::updateOrCreate(
            ['token' => $token],
            ['user_id' => $user->id, 'platform' => $platform, 'last_used_at' => now()],
        );
    }

    public function unregisterDevice(User $user, string $token): void
    {
        DeviceToken::where('user_id', $user->id)->where('token', $token)->delete();
    }

    public function markRead(Notification $notification): void
    {
        if ($notification->read_at === null) {
            $notification->forceFill(['read_at' => now()])->save();
        }
    }

    public function markAllRead(User $user): int
    {
        return Notification::where('user_id', $user->id)->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return Notification::where('user_id', $user->id)->whereNull('read_at')->count();
    }

    /** @param array<string, mixed> $data @param array<string, mixed> $options */
    private function sendPush(User $user, string $title, string $body, array $data, array $options = []): bool
    {
        $tokens = DeviceToken::where('user_id', $user->id)->pluck('token');
        if ($tokens->isEmpty()) {
            return false;
        }

        $delivered = false;
        foreach ($tokens as $token) {
            try {
                $this->push->send($token, $title, $body, $data, $options);
                $delivered = true;
            } catch (\Throwable $e) {
                Log::warning('[Notifications] push failed', ['user' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        return $delivered;
    }

    private function sendSms(User $user, string $title, string $body): bool
    {
        if (empty($user->phone)) {
            return false;
        }

        try {
            $this->sms->send($user->phone, $title.' — '.$body);

            return true;
        } catch (\Throwable $e) {
            Log::warning('[Notifications] sms fallback failed', ['user' => $user->id, 'error' => $e->getMessage()]);

            return false;
        }
    }
}
