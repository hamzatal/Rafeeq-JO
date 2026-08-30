<?php

namespace Rafeeq\Modules\Notifications\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Notifications\Jobs\BroadcastNotificationJob;
use Rafeeq\Modules\Notifications\Support\BroadcastAudience;
use Rafeeq\Shared\Rules\NoPersonalData;

/**
 * Admin notification broadcasting. Gated by `users.manage`.
 *
 * ── What changed here ──────────────────────────────────────────────────────
 *
 * **The audience is resolved in one place.** The `match` on audience existed twice —
 * once here for the COUNT the operator reads, once in `BroadcastNotificationJob` for
 * the people who actually receive it — and the copies had already drifted: `send()`
 * excluded banned users and `audience()` did not, so the number in the dashboard and
 * the number in the confirmation disagreed with each other and with reality. Both now
 * call `BroadcastAudience::query()`.
 *
 * **The segment is no longer three buttons.** It is (type × university × zone ×
 * status), which is what a campus-by-campus launch needs; see `BroadcastAudience`.
 *
 * **The text is checked for identifiers.** Length was the only validation. A body is
 * rendered on a lock screen and, for critical types, sent through an SMS gateway that
 * logs message bodies — so a phone number, an email or a national ID in it is
 * rejected here with a 422, where the operator can rewrite the sentence.
 */
class AdminNotificationController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Audience size for the compose screen, for the SAME query the send will run.
     *
     * Accepts the filters, so the operator sees the number for the segment they have
     * actually selected rather than a global total they then fail to reconcile with
     * the confirmation.
     */
    public function audience(Request $request): JsonResponse
    {
        $filters = $request->validate($this->filterRules());

        $counts = [];
        foreach (['all', 'students', 'drivers'] as $type) {
            $counts[$type] = BroadcastAudience::fromRequest($filters + ['audience' => $type])->query()->count();
        }

        return $this->ok($counts);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'audience' => ['required', Rule::in(BroadcastAudience::TYPES)],
            'user_ids' => ['required_if:audience,users', 'array', 'max:500'],
            'user_ids.*' => ['uuid'],
            /*
             * Length was the only validation. A body renders on a LOCK SCREEN and, for
             * critical types, travels through an SMS gateway that logs message bodies —
             * so an identifier in it is rejected here, named, where the operator can
             * rewrite the sentence. The rule and its reasoning: `NotificationText`.
             * Names, plates and amounts are deliberately allowed.
             */
            'title' => ['required', 'string', 'max:120', new NoPersonalData],
            'body' => ['required', 'string', 'max:500', new NoPersonalData],
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ] + $this->filterRules());

        $audience = BroadcastAudience::fromRequest($data);

        $payload = [];
        if (! empty($data['coupon_code'])) {
            $payload['coupon_code'] = strtoupper(trim($data['coupon_code']));
        }

        // Estimate the audience now (cheap COUNT), then fan-out off the request
        // cycle so a large send never blocks/timeouts the admin's HTTP request.
        $estimated = $audience->query()->count();

        BroadcastNotificationJob::dispatch($audience->toArray(), $data['title'], $data['body'], $payload);

        $this->audit->log('notifications.broadcast', $request->user(), changes: [
            'audience' => $audience->describe(),
            'estimated' => $estimated,
            'coupon' => $payload['coupon_code'] ?? null,
            'queued' => true,
        ]);

        return $this->ok(
            ['queued' => true, 'estimated' => $estimated],
            "تم جدولة إرسال الإشعار إلى {$estimated} مستخدم. سيصل خلال لحظات."
        );
    }

    /**
     * The segment filters, shared by `audience()` and `send()` so the count and the
     * send can never be computed from different rules.
     *
     * @return array<string, array<int, mixed>>
     */
    private function filterRules(): array
    {
        return [
            'university_id' => ['nullable', 'uuid', 'exists:universities,id'],
            'zone_id' => ['nullable', 'uuid', 'exists:zones,id'],
            'status' => ['nullable', Rule::in(BroadcastAudience::STATUSES)],
        ];
    }
}
