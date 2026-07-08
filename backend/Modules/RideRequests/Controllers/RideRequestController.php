<?php

namespace Rafeeq\Modules\RideRequests\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Core\Support\Geo;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Requests\CreateRideRequestRequest;
use Rafeeq\Modules\RideRequests\Resources\RideRequestResource;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Services\ZoneService;
use Rafeeq\Shared\Enums\RideType;

class RideRequestController extends Controller
{
    public function __construct(
        private readonly RideRequestService $service,
        private readonly PricingService $pricing,
        private readonly ZoneService $zones,
    ) {}

    /** Student: fare estimate (with min-fill surge preview) before requesting. */
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['nullable', 'string', 'in:'.RideType::Scheduled->value.','.RideType::Express->value],
            'riders' => ['nullable', 'integer', 'min:1', 'max:7'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:7'],
            'base_fare_fils' => ['nullable', 'integer', 'min:1'],
            'pickup_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'pickup_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'university_id' => ['nullable', 'uuid'],
        ]);

        $isExpress = ($data['type'] ?? null) === RideType::Express->value;

        // Distance-based estimate: when pickup + university coordinates are
        // provided, price the ride by GPS distance (pickup → university).
        $lat = isset($data['pickup_lat']) ? (float) $data['pickup_lat'] : null;
        $lng = isset($data['pickup_lng']) ? (float) $data['pickup_lng'] : null;
        $uni = isset($data['university_id']) ? University::find($data['university_id']) : null;

        $distanceKm = null;
        if ($lat !== null && $lng !== null && $uni && $uni->lat !== null && $uni->lng !== null) {
            $distanceKm = round(Geo::haversineKm($lat, $lng, (float) $uni->lat, (float) $uni->lng), 2);
        }

        $quote = $this->pricing->quote(
            $data['base_fare_fils'] ?? null,
            $isExpress,
            (int) ($data['riders'] ?? 1),
            (int) ($data['capacity'] ?? 4),
            distanceKm: $distanceKm,
        );

        // Coverage flag so the app can warn before requesting outside Irbid.
        if ($lat !== null && $lng !== null) {
            $quote['in_coverage'] = $this->zones->covering($lat, $lng) !== null;
        }

        return $this->ok($quote, 'تقدير الأجرة.');
    }

    /** Student: create a ride request (door-to-door). */
    public function store(CreateRideRequestRequest $request): JsonResponse
    {
        $rideRequest = $this->service->create($request->user(), $request->validated());

        return $this->created(new RideRequestResource($rideRequest), 'تم إنشاء الطلب. جارٍ تجميعك مع طلاب منطقتك.');
    }

    /** Student: my ride requests. */
    public function mine(Request $request): JsonResponse
    {
        $list = RideRequest::query()->with('zone')
            ->where('student_id', $request->user()->id)
            ->latest()->get();

        return $this->ok(RideRequestResource::collection($list));
    }

    public function cancel(Request $request, RideRequest $rideRequest): JsonResponse
    {
        if ($rideRequest->student_id !== $request->user()->id) {
            throw new AuthorizationException('هذا الطلب لا يخصّك.');
        }

        return $this->ok(new RideRequestResource($this->service->cancel($rideRequest)), 'تم إلغاء الطلب.');
    }

    /** Admin/ops: list ride requests (for monitoring & matching). */
    public function index(Request $request): JsonResponse
    {
        $query = RideRequest::query()->with('zone')->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        return $this->ok(RideRequestResource::collection($query->paginate((int) $request->query('per_page', 50))));
    }
}
