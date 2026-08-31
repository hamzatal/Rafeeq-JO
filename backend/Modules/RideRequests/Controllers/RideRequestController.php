<?php

namespace Rafeeq\Modules\RideRequests\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Requests\CreateRideRequestRequest;
use Rafeeq\Modules\RideRequests\Resources\RideRequestResource;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Zones\Services\ZonePricingService;
use Rafeeq\Modules\Zones\Services\ZoneService;
use Rafeeq\Shared\Enums\RideType;

class RideRequestController extends Controller
{
    public function __construct(
        private readonly RideRequestService $service,
        private readonly PricingService $pricing,
        private readonly ZoneService $zones,
        private readonly ZonePricingService $zonePricing,
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

        $riders = (int) ($data['riders'] ?? 1);
        $capacity = (int) ($data['capacity'] ?? 4);

        // 1) Unified fixed fare (zone ↔ university matrix) wins when the pickup
        //    falls inside a covered zone that has an admin-set price. Gives the
        //    student a predictable, fair price independent of GPS micro-distance.
        $matrix = null;
        if ($lat !== null && $lng !== null && $uni) {
            $matrix = $this->zonePricing->fareForPoint($uni, $lat, $lng);
        }

        /*
         * ── Why there is no distance fallback any more ────────────────────────
         *
         * This used to fall back to a GPS distance estimate when a corridor had no
         * approved matrix row. That produced a number nobody had approved, varying
         * per pickup pin, presented with the same confidence as a real tariff.
         *
         * A corridor without an approved price is NOT COVERED, and saying so is the
         * honest answer. «السعر وعد لا حساب» — a promise you cannot make yet is a
         * promise you decline to make, not one you improvise.
         */
        if ($matrix === null) {
            return $this->ok([
                'in_coverage' => false,
                'pricing_source' => 'unpriced_corridor',
                'tariff_version' => $this->pricing->tariffVersion(),
            ], 'ما وصلنا لهذه المنطقة بعد — بنفتح المناطق حسب الطلب.');
        }

        $band = $this->zonePricing->bandForZone($matrix['zone_id'], (string) $uni->id);
        $express = $isExpress ? (int) config('rafeeq.express_fee_fils', 1500) : 0;

        $quote = $this->pricing->seatQuote($band, $riders);
        // The approved matrix price overrides the band default.
        $quote['fare_fils'] = $matrix['fare_fils'] + $express;
        $quote['express_fee_fils'] = $express;
        $split = $this->pricing->splitCommission($quote['fare_fils']);
        $quote['commission_fils'] = $split['commission_fils'];
        $quote['captain_share_fils'] = $split['captain_share_fils'];
        $quote['expected_total_fils'] = $quote['fare_fils'] * max(1, $riders);
        $quote['expected_captain_earnings_fils'] = $split['captain_share_fils'] * max(1, $riders);

        // Both products, side by side and both approved — this is what makes the
        // aggregation wait acceptable: the alternative has a printed price.
        $solo = $this->zonePricing->soloFareForZone($matrix['zone_id'], (string) $uni->id);
        $quote['solo_fare_fils'] = $solo === null ? null : $solo + $express;

        $quote['pricing_source'] = 'zone_matrix';
        $quote['zone_id'] = $matrix['zone_id'];

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
    /**
     * The live request queue — `docs/design/src/06-admin-1.html` screen 34, «الطابور
     * الذي يقرّر نجاح المنصّة يومياً».
     *
     * Its columns are «الطلب · الطالب · من · إلى · الفئة · الأجرة · منذ · الحالة», and
     * three of those were unanswerable from what this returned: `student` and
     * `university` were not loaded, so «الطالب» and «إلى» had no source, and the fare is
     * not a column on the row — it lives in the (zone × university) price matrix.
     *
     * `student` and `university` are eager-loaded here rather than resolved per row: 50
     * requests a page is 100 extra queries on the screen an operator refreshes hardest.
     */
    public function index(Request $request): JsonResponse
    {
        $query = RideRequest::query()->with(['zone', 'student:id,full_name,phone', 'university:id,name_ar'])->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        $page = $query->paginate($this->perPage($request, 50));

        /*
         * The «الأجرة» column, priced once per corridor.
         *
         * The figure is not stored on the row — it is the approved tariff for the
         * (zone × university) pair, which is deliberate: a price change must apply to
         * the queue, not only to requests made after it. Looking it up per row would be
         * 50 lookups where there are rarely more than a handful of distinct corridors on
         * a page, so distinct pairs are resolved once and mapped back.
         *
         * A corridor with no approved price yields null, and the dashboard renders «—».
         * That case is real and must stay visible: `/estimate` returns
         * `unpriced_corridor` for it rather than inventing a distance-based fare, and a
         * queue that showed a number here would contradict what the student was told.
         */
        $fares = [];
        foreach ($page->getCollection() as $rideRequest) {
            if (! $rideRequest->zone_id) {
                continue;
            }

            $key = $rideRequest->zone_id.'|'.$rideRequest->university_id.'|'.($rideRequest->is_solo ? 'solo' : 'seat');
            $fares[$key] ??= $rideRequest->is_solo
                ? $this->zonePricing->soloFareForZone($rideRequest->zone_id, $rideRequest->university_id)
                : $this->zonePricing->fareForZone($rideRequest->zone_id, $rideRequest->university_id);

            /* The express fee is charged on top of the seat, so it belongs in the number
               the operator compares against what the rider will pay. */
            $rideRequest->fare_fils = $fares[$key] === null
                ? null
                : $fares[$key] + (int) $rideRequest->express_fee_fils;
        }

        return $this->ok(RideRequestResource::collection($page));
    }
}
