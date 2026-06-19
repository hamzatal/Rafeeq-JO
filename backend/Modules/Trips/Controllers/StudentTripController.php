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
    public function __construct(private readonly TripService $service) {}

    /** Upcoming scheduled trips (optionally filtered by route). */
    public function available(Request $request): JsonResponse
    {
        $trips = Trip::query()->with('route')->withCount('passengers')
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

    /** My bookings (with boarding code for the owner). */
    public function mine(Request $request): JsonResponse
    {
        $passengers = TripPassenger::query()->with('trip.route')
            ->where('student_id', $request->user()->id)
            ->latest()->get();

        return $this->ok(TripPassengerResource::collection($passengers));
    }

    public function cancelBooking(Request $request, TripPassenger $passenger): JsonResponse
    {
        if ($passenger->student_id !== $request->user()->id) {
            throw new AuthorizationException('غير مصرّح.');
        }
        $passenger->forceFill(['status' => TripPassengerStatus::Cancelled])->save();

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
