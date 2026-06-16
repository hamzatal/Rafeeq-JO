<?php

namespace Rafeeq\Modules\Trips\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Requests\ConfirmBoardingRequest;
use Rafeeq\Modules\Trips\Requests\LocationRequest;
use Rafeeq\Modules\Trips\Requests\ScheduleTripRequest;
use Rafeeq\Modules\Trips\Resources\TripPassengerResource;
use Rafeeq\Modules\Trips\Resources\TripResource;
use Rafeeq\Modules\Trips\Services\TripService;

class DriverTripController extends Controller
{
    public function __construct(private readonly TripService $service) {}

    private function driverId(Request $request): string
    {
        $driver = $request->user()->driverProfile;
        if (! $driver) {
            throw new AuthorizationException('لا يوجد ملف كابتن.');
        }

        return $driver->id;
    }

    private function ownedTrip(Request $request, Trip $trip): Trip
    {
        if ($trip->driver_id !== $this->driverId($request)) {
            throw new AuthorizationException('هذه الرحلة لا تخصّك.');
        }

        return $trip;
    }

    public function index(Request $request): JsonResponse
    {
        $trips = Trip::query()->with('route')->withCount('passengers')
            ->where('driver_id', $this->driverId($request))
            ->orderByDesc('scheduled_at')->get();

        return $this->ok(TripResource::collection($trips));
    }

    public function store(ScheduleTripRequest $request): JsonResponse
    {
        $route = Route::findOrFail($request->input('route_id'));
        $trip = $this->service->schedule(
            $request->user()->driverProfile,
            $route,
            $request->input('scheduled_at'),
            $request->input('vehicle_id'),
        );

        return $this->created(new TripResource($trip), 'تم جدولة الرحلة.');
    }

    public function show(Request $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);

        return $this->ok(new TripResource($trip->load(['route', 'passengers'])));
    }

    public function start(Request $request, Trip $trip): JsonResponse
    {
        return $this->ok(new TripResource($this->service->start($this->ownedTrip($request, $trip))), 'بدأت الرحلة.');
    }

    public function end(Request $request, Trip $trip): JsonResponse
    {
        return $this->ok(new TripResource($this->service->end($this->ownedTrip($request, $trip))), 'انتهت الرحلة.');
    }

    public function cancel(Request $request, Trip $trip): JsonResponse
    {
        return $this->ok(new TripResource($this->service->cancel($this->ownedTrip($request, $trip))), 'أُلغيت الرحلة.');
    }

    public function passengers(Request $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);

        return $this->ok(TripPassengerResource::collection($trip->passengers()->get()));
    }

    public function confirmBoarding(ConfirmBoardingRequest $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);
        $passenger = $this->service->confirmBoarding($trip, $request->input('code'));

        return $this->ok(new TripPassengerResource($passenger), 'تم تأكيد صعود الراكب.');
    }

    public function pushLocation(LocationRequest $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);
        $this->service->pushLocation($trip, (float) $request->input('lat'), (float) $request->input('lng'), $request->input('speed'));

        return $this->ok(null, 'تم تحديث الموقع.');
    }
}
