<?php

namespace Rafeeq\Modules\Notifications\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Modules\Notifications\Resources\NotificationResource;
use Rafeeq\Modules\Notifications\Services\NotificationService;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $query = Notification::where('user_id', $request->user()->id);

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $items = $query->latest()->paginate((int) $request->query('per_page', 20));

        return $this->ok(NotificationResource::collection($items), null, [
            'unread_count' => $this->notifications->unreadCount($request->user()),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return $this->ok(['unread_count' => $this->notifications->unreadCount($request->user())]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $this->assertOwner($request, $notification);
        $this->notifications->markRead($notification);

        return $this->ok(new NotificationResource($notification->fresh()), 'تم تعليم الإشعار كمقروء.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->notifications->markAllRead($request->user());

        return $this->ok(['marked' => $count], 'تم تعليم كل الإشعارات كمقروءة.');
    }

    public function preferences(Request $request): JsonResponse
    {
        return $this->ok($this->notifications->preferences($request->user()));
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'push_enabled' => ['sometimes', 'boolean'],
            'sms_enabled' => ['sometimes', 'boolean'],
            'payments' => ['sometimes', 'boolean'],
            'trips' => ['sometimes', 'boolean'],
            'ratings' => ['sometimes', 'boolean'],
            'safety' => ['sometimes', 'boolean'],
            'general' => ['sometimes', 'boolean'],
        ]);

        $prefs = $this->notifications->preferences($request->user());
        // Safety category cannot be disabled (critical alerts are mandatory).
        unset($data['safety']);
        $prefs->fill($data)->save();

        return $this->ok($prefs->fresh(), 'تم تحديث تفضيلات الإشعارات.');
    }

    public function registerDevice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['nullable', 'in:android,ios,web'],
        ]);

        $device = $this->notifications->registerDevice($request->user(), $data['token'], $data['platform'] ?? 'android');

        return $this->ok(['id' => $device->id], 'تم تسجيل الجهاز للإشعارات.');
    }

    public function unregisterDevice(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:512']]);
        $this->notifications->unregisterDevice($request->user(), $data['token']);

        return $this->noContent();
    }

    private function assertOwner(Request $request, Notification $notification): void
    {
        if ($notification->user_id !== $request->user()->id) {
            throw new BusinessRuleException('غير مصرّح.', 'FORBIDDEN');
        }
    }
}
