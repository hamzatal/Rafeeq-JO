<?php

namespace Rafeeq\Modules\Safety\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Modules\Safety\Services\SosService;
use Rafeeq\Modules\Trips\Models\Trip;

class SosController extends Controller
{
    public function __construct(private readonly SosService $sos) {}

    /** Any authenticated user can trigger the emergency button. */
    public function trigger(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'trip_id' => ['nullable', 'uuid'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        // Only associate the incident with a trip the caller actually belongs to
        // (their own trip as captain or rider). We never BLOCK the SOS on a bad
        // trip_id — safety first — we just drop an unowned association so a user
        // can't attach their alert to a stranger's trip.
        $tripId = $data['trip_id'] ?? null;
        if ($tripId !== null && ! $this->ownsTrip($request->user()->id, $tripId)) {
            $tripId = null;
        }

        $incident = $this->sos->trigger(
            $request->user(),
            isset($data['lat']) ? (float) $data['lat'] : null,
            isset($data['lng']) ? (float) $data['lng'] : null,
            $tripId,
            $data['note'] ?? null,
        );

        return $this->created([
            'id' => $incident->id,
            'status' => $incident->status,
        ], 'تم إرسال نداء الطوارئ. فريق رفيق سيتواصل فوراً.');
    }

    /** Whether the user is the captain or a rider of the given trip. */
    private function ownsTrip(string $userId, string $tripId): bool
    {
        $trip = Trip::with('driver')->find($tripId);
        if (! $trip) {
            return false;
        }
        if ($trip->driver && $trip->driver->user_id === $userId) {
            return true;
        }

        return $trip->passengers()->where('student_id', $userId)->exists();
    }

    public function mine(Request $request): JsonResponse
    {
        $list = SosIncident::where('user_id', $request->user()->id)->latest('created_at')->get();

        return $this->ok($list->map(fn (SosIncident $i) => [
            'id' => $i->id,
            'trip_id' => $i->trip_id,
            'status' => $i->status,
            'created_at' => $i->created_at?->toIso8601String(),
        ]));
    }

    // ── Admin ────────────────────────────────────────────────────────
    /**
     * The admin safety queue.
     *
     * ── It could not name the person it was about ─────────────────────────────
     *
     * This returned `user_id` and `trip_id` — two UUIDs. The screen built on it
     * (`06-admin-3.html` 38) has columns «البلاغ · الطالب · الرحلة» and a primary action
     * «اتصال بالطالب», none of which a UUID answers. An operator with an open incident
     * had to copy an identifier into the users page to find out who was in trouble.
     *
     * So the student's name and phone are attached, and the relations are eager-loaded
     * — 30 incidents on a page is 60 lazy queries, on the one screen where latency is
     * measured in someone's safety.
     *
     * The phone is deliberately included despite being PII: the route is already gated
     * on `safety.view`, whose own comment records that this surface exposes «open SOS
     * incidents naming a rider and their live location». A safety desk that cannot dial
     * the number is not a safety desk, and redacting it here would push the operator to
     * a second screen mid-incident.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SosIncident::query()->with(['user:id,full_name,phone', 'trip:id,status'])->latest('created_at');
        if ($request->boolean('open')) {
            $query->where('status', 'open');
        }

        return $this->ok($query->paginate($this->perPage($request, 30))->through(fn (SosIncident $i) => [
            'id' => $i->id,
            'user_id' => $i->user_id,
            'student_name' => $i->user?->full_name,
            'student_phone' => $i->user?->phone,
            'trip_id' => $i->trip_id,
            'lat' => $i->lat,
            'lng' => $i->lng,
            'status' => $i->status,
            'note' => $i->note,
            'created_at' => $i->created_at?->toIso8601String(),
            'resolved_at' => $i->resolved_at?->toIso8601String(),
        ]));
    }

    public function resolve(Request $request, SosIncident $incident): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['acknowledged', 'resolved'])]]);
        $this->sos->resolve($incident, $request->user(), $data['status']);

        return $this->ok(null, 'تم تحديث حالة الطوارئ.');
    }
}
