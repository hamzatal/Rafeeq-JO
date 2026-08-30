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
use Rafeeq\Shared\Support\NotificationText;

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
     * @param  string|null  $dedupeKey  Set by senders that can be RETRIED (an admin
     *                                  broadcast). A second attempt with the same key
     *                                  finds the existing row and delivers nothing.
     * @param  NotificationPreference|null  $prefs  Preloaded by bulk senders to avoid
     *                                              one query per recipient.
     */
    public function notify(
        User $user,
        NotificationType $type,
        string $title,
        string $body,
        array $data = [],
        ?string $dedupeKey = null,
        ?NotificationPreference $prefs = null,
    ): ?Notification {
        // Notification dispatch is a side-effect: it must never throw into (and
        // roll back) the business transaction that triggered it.
        try {
            [$title, $body] = $this->enforceNoPii($type, $title, $body);

            $category = $type->category();
            $critical = $type->isCritical();
            $prefs ??= $this->preferences($user);
            $allowsCategory = $critical || $prefs->allows($category);
            $wantsPush = $prefs->push_enabled && $allowsCategory;
            $wantsSmsFallback = $critical && $prefs->sms_enabled;

            $channels = ['inapp'];
            if ($wantsPush) {
                $channels[] = 'push';
            }

            $attributes = [
                'type' => $type->value,
                'category' => $category,
                'title' => $title,
                'body' => $body,
                'data' => $data ?: null,
                'channels' => $channels,
                'is_critical' => $critical,
            ];

            /*
             * A keyed notification is created at most once per user, enforced by the
             * unique index on `(user_id, dedupe_key)`. `firstOrCreate` also tells us
             * WHICH happened, and that answer decides whether to deliver: on a retried
             * broadcast the users already reached must not be pushed to a second time.
             */
            if ($dedupeKey !== null) {
                $notification = Notification::firstOrCreate(
                    ['user_id' => $user->id, 'dedupe_key' => $dedupeKey],
                    $attributes,
                );

                if (! $notification->wasRecentlyCreated) {
                    return $notification;
                }
            } else {
                $notification = Notification::create($attributes + ['user_id' => $user->id]);
            }

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

    /**
     * The «ولا PII في أي نصّ إشعار» rule, enforced instead of documented.
     *
     * It lived in a cell of a Markdown table in `docs/design/SCREENS.md` and nowhere
     * else: this method took two free strings and inspected neither. See
     * `Shared\Support\NotificationText` for which three identifiers are blocked and
     * why names, plates and amounts deliberately are not.
     *
     * ── Why the behaviour differs by environment ───────────────────────────────
     *
     * A body reaching here with a phone number in it is a programming mistake, and
     * the place to catch a programming mistake is the test suite — so outside
     * production it throws, loudly, naming the caller's notification type. In
     * production it redacts and delivers: this method runs on the SOS path, and
     * trading a lock-screen exposure for a silent safety notification is the worse
     * of the two failures.
     *
     * An operator-authored broadcast never gets here with PII at all — it is rejected
     * at validation with a 422, where the operator can fix the words.
     *
     * @return array{0: string, 1: string}
     */
    private function enforceNoPii(NotificationType $type, string $title, string $body): array
    {
        $kind = NotificationText::piiKind($title, $body);
        if ($kind === null) {
            return [$title, $body];
        }

        if (! app()->environment('production')) {
            throw new \LogicException(
                "Notification [{$type->value}] carries {$kind} in its text. A notification body renders on a "
                .'lock screen and travels through the SMS gateway; see Shared\\Support\\NotificationText.'
            );
        }

        Log::warning('notifications.pii_redacted', ['type' => $type->value, 'kind' => $kind]);

        return [NotificationText::redact($title), NotificationText::redact($body)];
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
     * ── Preferences are loaded once per chunk, not once per user ───────────────
     *
     * `notify()` calls `NotificationPreference::firstOrCreate` per recipient. On a
     * broadcast to ten thousand students that is ten thousand SELECTs (plus an INSERT
     * for every user who had never opened the settings sheet) on top of the ten
     * thousand notification inserts — an N+1 by construction, inside a job with a
     * 600-second budget. One query per chunk answers the same question.
     *
     * @param  iterable<int, User>  $users
     * @param  array<string, mixed>  $data
     * @param  string|null  $dedupeKey  Shared by every attempt of one broadcast.
     */
    public function broadcast(iterable $users, string $title, string $body, array $data = [], ?string $dedupeKey = null): int
    {
        $users = $users instanceof \Traversable ? iterator_to_array($users) : (array) $users;
        if ($users === []) {
            return 0;
        }

        $prefs = $this->preferencesFor(array_map(fn (User $u) => $u->id, $users));

        $count = 0;
        foreach ($users as $user) {
            $sent = $this->notify(
                $user,
                NotificationType::General,
                $title,
                $body,
                $data,
                $dedupeKey,
                $prefs[$user->id] ?? null,
            );

            if ($sent) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Preferences for many users in one query, defaulting the ones that have none.
     *
     * The default is constructed in memory rather than written, so a broadcast does
     * not create a preference row for every user who never opened the settings sheet
     * — `notify()` is a read of their choices, not the moment they make one.
     *
     * @param  list<string>  $userIds
     * @return array<string, NotificationPreference>
     */
    private function preferencesFor(array $userIds): array
    {
        $found = NotificationPreference::whereIn('user_id', $userIds)->get()->keyBy('user_id')->all();

        foreach ($userIds as $id) {
            $found[$id] ??= new NotificationPreference(['user_id' => $id]);
        }

        return $found;
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

    /**
     * Push to every device this user has registered.
     *
     * ── The line that was wrong ────────────────────────────────────────────────
     *
     *     $this->push->send(...);
     *     $delivered = true;
     *
     * `send()` returned a string and never threw, so an FCM 4xx, a malformed token,
     * and a deployment with no Firebase at all — where `LogPushGateway` writes the
     * message to a log file and drops it — were all recorded as delivered. And
     * because `deliverExternal()` only sends the SMS fallback when push did NOT go
     * out, **the fallback for SOS, a frozen account and a cancelled trip never
     * fired for anyone who had a device token.** The class docblock above promises
     * that safety categories cannot be fully muted; that promise was not kept.
     *
     * ── Dead tokens are deleted, here, on the spot ─────────────────────────────
     *
     * `UNREGISTERED` means the app was uninstalled. Nothing pruned those rows —
     * `RetentionPolicy` has no entry for `device_tokens` and `last_used_at` was
     * written once at registration and never again — so they accumulated forever.
     * Each one cost a full round trip on every notification, and each one used to
     * make `$delivered` true, which is how a user who reinstalled the app lost both
     * their push AND their SMS fallback.
     */
    private function sendPush(User $user, string $title, string $body, array $data, array $options = []): bool
    {
        $tokens = DeviceToken::where('user_id', $user->id)->pluck('token');
        if ($tokens->isEmpty()) {
            return false;
        }

        $delivered = false;
        $dead = [];

        foreach ($tokens as $token) {
            try {
                $result = $this->push->send($token, $title, $body, $data, $options);

                if ($result->delivered) {
                    $delivered = true;
                } elseif ($result->tokenIsDead) {
                    $dead[] = $token;
                }
            } catch (\Throwable $e) {
                // A gateway must not throw, but one may; a broken gateway must not
                // stop the remaining devices or the SMS fallback.
                Log::warning('[Notifications] push threw', ['user' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        if ($dead !== []) {
            DeviceToken::whereIn('token', $dead)->delete();
            Log::info('notifications.dead_tokens_pruned', ['user' => $user->id, 'count' => count($dead)]);
        }

        /*
         * `last_used_at` is what makes an abandoned token identifiable later. It was
         * set at registration and never touched again, so every token looked equally
         * fresh forever.
         */
        if ($delivered) {
            DeviceToken::where('user_id', $user->id)->update(['last_used_at' => now()]);
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
