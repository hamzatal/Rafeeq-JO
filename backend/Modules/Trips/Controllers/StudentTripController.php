<?php

namespace Rafeeq\Modules\Trips\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Modules\Trips\Requests\BookTripRequest;
use Rafeeq\Modules\Trips\Resources\TripPassengerResource;
use Rafeeq\Modules\Trips\Resources\TripResource;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;

class StudentTripController extends Controller
{
    /**
     * `booked_count` must mean SEATS TAKEN, not rows written.
     *
     * A plain `withCount('passengers')` counts cancelled bookings too, so a trip that
     * four students booked and three cancelled reported 4 of 4 taken and vanished from
     * the bookable list while three seats sat empty. It also disagreed with
     * `TripResource`'s own fallback, which filters to `booked`/`onboard` — the same
     * field meant two different things depending on which endpoint you asked.
     */
    public function __construct(private readonly TripService $service) {}

    /** Upcoming scheduled trips (optionally filtered by route). */
    public function available(Request $request): JsonResponse
    {
        $trips = Trip::query()->with('route')->withRiderCount()
            ->where('status', TripStatus::Scheduled->value)
            ->where('scheduled_at', '>', now())
            ->when($request->query('route_id'), fn ($q, $r) => $q->where('route_id', $r))
            ->orderBy('scheduled_at')->get();

        return $this->ok(TripResource::collection($trips));
    }

    public function book(BookTripRequest $request, Trip $trip): JsonResponse
    {
        $passenger = $this->service->book($request->user(), $trip, $request->input('pickup_point_id'));

        return $this->created(new TripPassengerResource($passenger), 'تم حجز مقعدك. احتفظ بكود الصعود.');
    }

    /**
     * My bookings — with the boarding code, and with who is driving.
     *
     * ── Why `driver.user` and `vehicle` are loaded here and nowhere else ────
     *
     * `TripResource` only emits its `captain` block when those relations are already
     * loaded (see the comment on `TripResource::captainBlock`). That makes the
     * eager-load the authorisation decision, and this query is the right place for
     * it: it is filtered to `student_id = $viewer->id`, so a student can only ever
     * pull the captain of a trip they are personally riding.
     *
     * `available()` above deliberately does not load them.
     *
     * ── Why `withRiderCount` ───────────────────────────────────────────────
     *
     * `TripResource` falls back to `$this->passengers()->count()` when
     * `passengers_count` is absent, so this endpoint was running one extra COUNT per
     * trip — a student with 30 rides paid 30 queries to render a list.
     */
    public function mine(Request $request): JsonResponse
    {
        $passengers = TripPassenger::query()
            ->with([
                'trip' => fn ($q) => $q->withRiderCount(),
                'trip.route', 'trip.driver.user', 'trip.vehicle',
            ])
            ->where('student_id', $request->user()->id)
            ->latest()->get();

        return $this->ok(TripPassengerResource::collection($passengers));
    }

    public function cancelBooking(Request $request, TripPassenger $passenger): JsonResponse
    {
        // Ownership, the hold release, the subscription refund and returning the
        // request to the matching pool all live in the service, inside one
        // transaction. See TripService::cancelBooking.
        $this->service->cancelBooking($request->user(), $passenger);

        return $this->ok(null, 'تم إلغاء الحجز.');
    }

    /**
     * Latest live location of a trip (polling; Reverb push later).
     * Restricted to passengers of this trip — captain GPS must not leak to
     * arbitrary users (privacy + physical-safety control).
     */
    public function location(Request $request, Trip $trip): JsonResponse
    {
        $isPassenger = TripPassenger::query()
            ->where('trip_id', $trip->id)
            ->where('student_id', $request->user()->id)
            ->where('status', '!=', TripPassengerStatus::Cancelled->value)
            ->exists();

        if (! $isPassenger) {
            throw new AuthorizationException('لا يمكنك تتبّع رحلة لست راكباً فيها.');
        }

        $latest = TripTracking::query()->where('trip_id', $trip->id)->latest('recorded_at')->first();

        return $this->ok($latest ? [
            'lat' => $latest->lat,
            'lng' => $latest->lng,
            'speed' => $latest->speed,
            'recorded_at' => $latest->recorded_at?->toIso8601String(),
            'trip_status' => $trip->status->value,
        ] : null);
    }
}
