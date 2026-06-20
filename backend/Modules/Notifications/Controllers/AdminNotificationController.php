<?php

namespace Rafeeq\Modules\Notifications\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Jobs\BroadcastNotificationJob;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Admin notification broadcasting — full control over who receives what.
 * Gated by `users.manage`.
 */
class AdminNotificationController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /** Audience sizes for the compose screen. */
    public function audience(): JsonResponse
    {
        return $this->ok([
            'all' => User::whereIn('type', [UserType::Student->value, UserType::Driver->value])->count(),
            'students' => User::where('type', UserType::Student->value)->count(),
            'drivers' => User::where('type', UserType::Driver->value)->count(),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'audience' => ['required', Rule::in(['all', 'students', 'drivers', 'users'])],
            'user_ids' => ['required_if:audience,users', 'array'],
            'user_ids.*' => ['uuid'],
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:500'],
            'coupon_code' => ['nullable', 'string', 'max:40'],
        ]);

        $query = User::query()->where('status', '!=', UserStatus::Banned->value);
        match ($data['audience']) {
            'students' => $query->where('type', UserType::Student->value),
            'drivers' => $query->where('type', UserType::Driver->value),
            'users' => $query->whereIn('id', $data['user_ids'] ?? []),
            default => $query->whereIn('type', [UserType::Student->value, UserType::Driver->value]),
        };

        $payload = [];
        if (! empty($data['coupon_code'])) {
            $payload['coupon_code'] = strtoupper(trim($data['coupon_code']));
        }

        // Estimate the audience now (cheap COUNT), then fan-out off the request
        // cycle so a large send never blocks/timeouts the admin's HTTP request.
        $estimated = (clone $query)->count();

        BroadcastNotificationJob::dispatch(
            $data['audience'],
            $data['audience'] === 'users' ? ($data['user_ids'] ?? []) : [],
            $data['title'],
            $data['body'],
            $payload,
        );

        $this->audit->log('notifications.broadcast', $request->user(), changes: [
            'audience' => $data['audience'],
            'estimated' => $estimated,
            'coupon' => $payload['coupon_code'] ?? null,
            'queued' => true,
        ]);

        return $this->ok(
            ['queued' => true, 'estimated' => $estimated],
            "تم جدولة إرسال الإشعار إلى {$estimated} مستخدم. سيصل خلال لحظات."
        );
    }
}
