<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Infrastructure\Push\Contracts\PushGateway;
use Rafeeq\Infrastructure\Push\Contracts\PushResult;
use Rafeeq\Infrastructure\Push\LogPushGateway;
use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Models\DeviceToken;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * The SMS fallback for a CRITICAL notification, and why it was not working.
 *
 * ── The bug ────────────────────────────────────────────────────────────────
 *
 * `PushGateway::send()` returned a `string` and never threw, and the caller was:
 *
 *     $this->push->send(...);
 *     $delivered = true;
 *
 * So `'push_failed'`, `'push_error'` and `LogPushGateway`'s `'push_log_<uuid>'` were
 * all recorded as delivered. `deliverExternal()` sends SMS only when push did NOT go
 * out, which means **the fallback for SOS, a frozen account and a cancelled trip never
 * fired for any user who had a device token** — and on a deployment with no Firebase
 * configured at all, where every push is written to a log file and dropped, it never
 * fired for anyone.
 *
 * `NotificationService`'s own docblock says "safety categories can't be fully muted".
 * They were silently, completely muted. These tests are what make that statement true.
 */
class PushFallbackTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> */
    private array $smsSent = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->smsSent = [];
        $this->app->instance(SmsGateway::class, new class($this->smsSent) implements SmsGateway
        {
            /** @param list<string> $sent */
            public function __construct(public array &$sent) {}

            public function send(string $to, string $message): string
            {
                $this->sent[] = $to;

                return 'sms_test';
            }
        });
    }

    private function student(): User
    {
        $user = User::create([
            'full_name' => 'طالب', 'phone' => '0790000009', 'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);

        DeviceToken::create(['user_id' => $user->id, 'token' => 'tok-1', 'platform' => 'android']);

        return $user;
    }

    private function useGateway(PushGateway $gateway): void
    {
        $this->app->instance(PushGateway::class, $gateway);
    }

    private function fakeGateway(PushResult $result): PushGateway
    {
        return new class($result) implements PushGateway
        {
            public int $calls = 0;

            public function __construct(private readonly PushResult $result) {}

            public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): PushResult
            {
                $this->calls++;

                return $this->result;
            }

            public function isEnabled(): bool
            {
                return true;
            }
        };
    }

    private function sos(User $user): void
    {
        app(NotificationService::class)->notify(
            $user,
            NotificationType::SosTriggered,
            'نداء استغاثة',
            'فريق السلامة تم تنبيهه.',
        );
    }

    public function test_a_failed_push_sends_the_critical_sms(): void
    {
        $this->useGateway($this->fakeGateway(PushResult::failed('push_failed', 'UNAVAILABLE')));
        $user = $this->student();

        $this->sos($user);

        $this->assertSame([$user->phone], $this->smsSent, 'A critical notification whose push failed must fall back to SMS.');
    }

    /**
     * The no-Firebase deployment, which is the one that matters most.
     *
     * `LogPushGateway` is bound whenever `FIREBASE_PROJECT_ID`/`FIREBASE_CREDENTIALS`
     * are unset — including, silently, in production. It writes the notification to a
     * log and drops it, and it used to report that as a delivery.
     */
    public function test_the_log_gateway_does_not_count_as_delivery(): void
    {
        $this->useGateway(new LogPushGateway);
        $user = $this->student();

        $this->sos($user);

        $this->assertSame([$user->phone], $this->smsSent, 'With no push provider configured, a critical notification must go by SMS.');
    }

    public function test_a_delivered_push_does_not_also_send_an_sms(): void
    {
        $this->useGateway($this->fakeGateway(PushResult::delivered('projects/x/messages/1')));
        $user = $this->student();

        $this->sos($user);

        $this->assertSame([], $this->smsSent, 'A delivered push must not be duplicated as an SMS.');
    }

    /**
     * A dead token is deleted, not retried forever.
     *
     * Nothing pruned these: `RetentionPolicy` has no `device_tokens` entry, and
     * `last_used_at` was written once at registration and never again. So a user who
     * uninstalled kept a phantom token that cost a full OAuth + FCM round trip on every
     * notification and — before this change — made `$delivered` true, which also
     * suppressed their SMS fallback.
     */
    public function test_a_token_the_provider_rejects_is_deleted(): void
    {
        $this->useGateway($this->fakeGateway(PushResult::tokenGone('push_token_dead', 'UNREGISTERED')));
        $user = $this->student();

        $this->sos($user);

        $this->assertSame(0, DeviceToken::where('user_id', $user->id)->count());
        $this->assertSame([$user->phone], $this->smsSent, 'A dead token means push did not arrive, so the critical SMS still must.');
    }

    /** A transient failure must NOT throw the token away — the phone is probably fine. */
    public function test_a_transient_failure_keeps_the_token(): void
    {
        $this->useGateway($this->fakeGateway(PushResult::failed('push_failed', 'INTERNAL')));
        $user = $this->student();

        $this->sos($user);

        $this->assertSame(1, DeviceToken::where('user_id', $user->id)->count());
    }

    /** A non-critical notification never falls back to SMS, delivered or not. */
    public function test_a_non_critical_notification_never_sends_an_sms(): void
    {
        $this->useGateway($this->fakeGateway(PushResult::failed('push_failed')));
        $user = $this->student();

        app(NotificationService::class)->notify(
            $user,
            NotificationType::RatingRequest,
            'قيّم رحلتك',
            'كيف كانت رحلتك اليوم؟',
        );

        $this->assertSame([], $this->smsSent, 'Only critical categories are worth an SMS; the rest wait in the inbox.');
    }
}
