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
    public function index(Request $request): JsonResponse
    {
        $query = SosIncident::query()->latest('created_at');
        if ($request->boolean('open')) {
            $query->where('status', 'open');
        }

        return $this->ok($query->paginate((int) $request->query('per_page', 30))->through(fn (SosIncident $i) => [
            'id' => $i->id,
            'user_id' => $i->user_id,
            'trip_id' => $i->trip_id,
            'lat' => $i->lat,
            'lng' => $i->lng,
            'status' => $i->status,
            'note' => $i->note,
            'created_at' => $i->created_at?->toIso8601String(),
        ]));
    }

    public function resolve(Request $request, SosIncident $incident): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['acknowledged', 'resolved'])]]);
        $this->sos->resolve($incident, $request->user(), $data['status']);

        return $this->ok(null, 'تم تحديث حالة الطوارئ.');
    }
}
