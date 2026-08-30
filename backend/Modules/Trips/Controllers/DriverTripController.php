<?php

namespace Rafeeq\Modules\Trips\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Requests\ConfirmBoardingRequest;
use Rafeeq\Modules\Trips\Requests\ConfirmDropoffRequest;
use Rafeeq\Modules\Trips\Requests\LocationRequest;
use Rafeeq\Modules\Trips\Requests\ScheduleTripRequest;
use Rafeeq\Modules\Trips\Resources\TripPassengerResource;
use Rafeeq\Modules\Trips\Resources\TripResource;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Wallet\Services\CaptainDebtService;
use Rafeeq\Modules\Wallet\Services\WalletService;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\TripStatus;

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
        $trips = Trip::query()->with('route')->withRiderCount()
            ->where('driver_id', $this->driverId($request))
            ->orderByDesc('scheduled_at')->get();

        return $this->ok(TripResource::collection($trips));
    }

    /** Pooled trips awaiting a captain (offers). */
    public function offers(Request $request): JsonResponse
    {
        $this->driverId($request); // ensures driver profile exists
        $offers = Trip::query()->with('university')->withRiderCount()
            ->where('status', TripStatus::PendingDriver->value)
            ->whereNull('driver_id')
            ->orderBy('scheduled_at')->get();

        return $this->ok(TripResource::collection($offers));
    }

    /** Captain claims a pooled trip offer. */
    public function acceptOffer(Request $request, Trip $trip): JsonResponse
    {
        $driver = $request->user()->driverProfile;
        if (! $driver || ! $driver->status->canDrive()) {
            throw new AuthorizationException('حسابك غير معتمد لتشغيل الرحلات.');
        }

        // Cash makes the platform a creditor: the captain holds the whole fare and owes
        // the commission. Checked here, when a NEW trip is claimed, and deliberately not
        // during a trip already under way — stranding a rider halfway to collect a debt
        // would be indefensible, and the fare being collected is what settles it anyway.
        app(CaptainDebtService::class)->assertMayGoOnline(
            app(WalletService::class)->forUser($request->user())
        );

        /*
         * The claim and the requests it assigns are ONE transaction.
         *
         * The claim itself was already correct: a single-statement compare-and-set that
         * only one captain's UPDATE can match, so two simultaneous accepts cannot both
         * win. What was wrong is that the second write — moving the grouped requests to
         * `assigned` — sat outside it. A crash, a timeout or a killed worker between
         * the two left a `scheduled` trip with a captain whose riders were still
         * `grouped`, which is a state nothing reconciles: `rafeeq:expire-stale` looks
         * for trips with no captain, and the matcher does not re-read `grouped` rows.
         * The rider's app would show a car that is coming while the request that
         * created it still reads «بنجمّعك مع طلاب منطقتك».
         *
         * Wrapping them makes the pair all-or-nothing without weakening the claim: the
         * conditional UPDATE is still what decides the winner.
         */
        DB::transaction(function () use ($trip, $driver) {
            $claimed = Trip::whereKey($trip->id)
                ->whereNull('driver_id')
                ->where('status', TripStatus::PendingDriver->value)
                ->update([
                    'driver_id' => $driver->id,
                    'status' => TripStatus::Scheduled->value,
                ]);

            if ($claimed === 0) {
                throw new BusinessRuleException('هذه الرحلة لم تعد متاحة.', 'OFFER_TAKEN');
            }

            RideRequest::where('trip_id', $trip->id)
                ->where('status', RideRequestStatus::Grouped->value)
                ->update(['status' => RideRequestStatus::Assigned->value]);
        });

        return $this->ok(new TripResource($trip->fresh(['university', 'passengers'])), 'تم قبول الرحلة.');
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
        $this->ownedTrip($request, $trip);
        $result = $this->service->cancel($trip, $request->user(), 'driver', $request->input('reason'));

        return $this->ok(new TripResource($result), 'أُلغيت الرحلة.');
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

    public function confirmDropoff(ConfirmDropoffRequest $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);
        $passenger = $this->service->confirmDropoff($trip, $request->input('code'));

        return $this->ok(new TripPassengerResource($passenger), 'تم تأكيد إنزال الراكب.');
    }

    public function pushLocation(LocationRequest $request, Trip $trip): JsonResponse
    {
        $this->ownedTrip($request, $trip);
        $this->service->pushLocation($trip, (float) $request->input('lat'), (float) $request->input('lng'), $request->input('speed'));

        return $this->ok(null, 'تم تحديث الموقع.');
    }
}
