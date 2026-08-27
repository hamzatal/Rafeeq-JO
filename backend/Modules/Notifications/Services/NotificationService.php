<?php

namespace Rafeeq\Modules\Notifications\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Audit\AuditLogger;
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
        private readonly AuditLogger $audit,
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
     * Takes an already-bounded set. `BroadcastNotificationJob` is what owns the
     * chunking, because it owns the query; this method must never be handed the
     * result of a bare `User::all()`.
     *
     * @param  iterable<int, User>  $users
     * @param  array<string, mixed>  $data
     */
    public function broadcast(iterable $users, string $title, string $body, array $data = []): int
    {
        $count = 0;
        foreach ($users as $user) {
            if ($this->notify($user, NotificationType::General, $title, $body, $data)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Notify every staff member holding one of the given roles, in chunks.
     *
     * ── 3.12: why this exists ──────────────────────────────────────────────────
     *
     * Three services had a private `alertSafetyTeam()` that was character-for-
     * character the same shape — `User::whereHas('roles', …)->get()->each(…)` —
     * loading every admin, supervisor and support agent as a full model, with
     * every column, inline in the request that triggered it. For an SOS that
     * request is a person pressing a panic button, and the notification type is
     * critical, so each staff member also gets an SMS. The most latency-sensitive
     * path in the product had the least bounded fan-out, three times over.
     *
     * `chunkById` is correct here where it was wrong for the matcher: staff are
     * independent recipients, so splitting them across chunks changes nothing
     * about the outcome. The column list is narrowed because delivery needs an id
     * and a phone, not a profile.
     *
     * @param  list<string>  $roles
     * @param  array<string, mixed>  $data
     * @return int Staff actually notified.
     */
    public function alertStaff(array $roles, NotificationType $type, string $title, string $body, array $data = []): int
    {
        $chunk = max(1, (int) config('rafeeq.staff_alert_chunk', 100));
        $sent = 0;

        User::query()
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $roles))
            ->select(['id', 'phone', 'type', 'status'])
            ->chunkById($chunk, function ($staff) use (&$sent, $type, $title, $body, $data) {
                foreach ($staff as $member) {
                    if ($this->notify($member, $type, $title, $body, $data)) {
                        $sent++;
                    }
                }
            });

        return $sent;
    }

    /**
     * Register (upsert) a device token for push delivery.
     *
     * ── Why the ownership change is audited ────────────────────────────────────
     *
     * The upsert keys on the TOKEN alone, and that is correct: an FCM token belongs
     * to an app install, so when a second person signs in on the same handset the
     * token legitimately moves to them. Keying on (token, user) instead would leave
     * the old row behind and push every notification to whoever used the phone first.
     *
     * But the same behaviour is an attack: anyone who obtains a victim's token can
     * POST it here and silently take over their push channel — the victim stops
     * receiving trip and safety alerts, and the thief's notifications land on the
     * victim's screen. `unregisterDevice` below is scoped by `user_id`, which shows
     * the asymmetry was never intended.
     *
     * It cannot be forbidden without breaking the shared-handset case, so instead it
     * is made VISIBLE: a token changing hands is an audited event. A takeover now
     * leaves a trail that names both accounts, and the endpoint is rate limited.
     */
    public function registerDevice(User $user, string $token, string $platform = 'android'): DeviceToken
    {
        $previousOwner = DeviceToken::where('token', $token)->value('user_id');

        $device = DeviceToken::updateOrCreate(
            ['token' => $token],
            ['user_id' => $user->id, 'platform' => $platform, 'last_used_at' => now()],
        );

        if ($previousOwner !== null && $previousOwner !== $user->id) {
            Log::warning('notifications.device_token_reassigned', [
                'from_user' => $previousOwner,
                'to_user' => $user->id,
                'platform' => $platform,
            ]);

            $this->audit->log('notification.device_reassigned', $user, auditable: $device, changes: [
                'from_user' => $previousOwner,
                'to_user' => $user->id,
            ]);
        }

        return $device;
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
