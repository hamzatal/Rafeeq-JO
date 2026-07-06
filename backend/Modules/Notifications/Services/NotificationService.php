<?php

namespace Rafeeq\Modules\Notifications\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Jobs\DeliverNotificationJob;
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
            $allowsCategory = $critical || $prefs->allows($category);
            $wantsPush = $prefs->push_enabled && $allowsCategory;
            $wantsSmsFallback = $critical && $prefs->sms_enabled;

            $channels = ['inapp'];
            if ($wantsPush) {
                $channels[] = 'push';
            }

            $notification = Notification::create([
                'user_id' => $user->id,
                'type' => $type->value,
                'category' => $category,
                'title' => $title,
                'body' => $body,
                'data' => $data ?: null,
                'channels' => $channels,
                'is_critical' => $critical,
            ]);

            // Deliver external channels (push + critical SMS fallback) OFF the
            // request via a queue, so a slow FCM/SMS call never blocks the API.
            // Runs inline on the `sync` driver (tests / no worker).
            if ($wantsPush || $wantsSmsFallback) {
                DeliverNotificationJob::dispatch($user->id, $type->value, $title, $body, $data, $wantsPush, $wantsSmsFallback);
            }

            return $notification;
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
     * @param  Collection<int, User>  $users
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
    /**
     * Deliver the external channels for a notification (push, then a critical
     * SMS fallback if push didn't go out). Called from DeliverNotificationJob.
     */
    public function deliverExternal(string $userId, string $typeValue, string $title, string $body, array $data, bool $wantsPush, bool $wantsSmsFallback): void
    {
        $user = User::find($userId);
        if (! $user) {
            return;
        }
        $type = NotificationType::from($typeValue);
        $pushed = false;
        if ($wantsPush) {
            $pushed = $this->sendPush($user, $title, $body, array_merge($data, ['type' => $type->value]), [
                'channel_id' => $type->channelId(),
                'sound' => $type->sound(),
                'priority' => $type->pushPriority(),
            ]);
        }
        if (! $pushed && $wantsSmsFallback) {
            $this->sendSms($user, $title, $body);
        }
    }

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
