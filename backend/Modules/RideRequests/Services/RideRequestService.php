<?php

namespace Rafeeq\Modules\RideRequests\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Zones\Services\ZonePricingService;
use Rafeeq\Modules\Zones\Services\ZoneService;
use Rafeeq\Shared\Enums\PaymentMethod;
use Rafeeq\Shared\Enums\RideDirection;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;

class RideRequestService extends BaseService
{
    public function __construct(
        private readonly ZoneService $zones,
        private readonly ZonePricingService $zonePricing,
        private readonly AuditLogger $audit,
    ) {}

    public function create(User $student, array $data): RideRequest
    {
        $lat = (float) $data['pickup_lat'];
        $lng = (float) $data['pickup_lng'];
        $type = RideType::from($data['type'] ?? RideType::Scheduled->value);
        $isExpress = $type === RideType::Express;

        // Reject locations outside our service area (Irbid zones). Without this
        // guard the nearest-zone lookup would "snap" a far point (e.g. a spot
        // at the other end of the country) to an Irbid zone and quote a fare.
        $zone = $this->zones->covering($lat, $lng);
        if ($zone === null) {
            throw new BusinessRuleException(
                'موقع الانطلاق خارج نطاق الخدمة الحالي (إربد). اختر نقطة قريبة من إحدى الجامعات المخدومة.',
                'OUT_OF_COVERAGE',
            );
        }

        /*
         * Being inside a zone is not the same as that zone having a price to this
         * university, and the two were being conflated.
         *
         * `/estimate` refuses to quote a corridor with no approved matrix row — it
         * answers `in_coverage: false` rather than inventing a number. But creation
         * only checked the zone, so a student could be told "we don't serve this
         * route yet" and then successfully request it anyway, at which point the
         * matcher priced the trip from `default_fare_fils`. That is precisely the
         * fare-nobody-approved that deleting the distance fallback was meant to
         * eliminate; it had simply moved downstream where nobody would look for it.
         *
         * The same refusal at both entry points. A corridor without an approved
         * tariff is not a corridor we can sell a seat on.
         */
        if (! $this->zonePricing->fareForZone($zone->id, (string) $data['university_id'])) {
            throw new BusinessRuleException(
                'ما وصلنا لهذه المنطقة بعد — بنفتح المناطق حسب الطلب.',
                'UNPRICED_CORRIDOR',
            );
        }

        // Prevent duplicate active request to the same university.
        $existing = RideRequest::where('student_id', $student->id)
            ->where('university_id', $data['university_id'])
            ->whereIn('status', [RideRequestStatus::Pending->value, RideRequestStatus::Grouped->value, RideRequestStatus::Assigned->value])
            ->exists();

        if ($existing) {
            throw new BusinessRuleException('لديك طلب نشط بالفعل لهذه الجامعة.', 'DUPLICATE_REQUEST');
        }

        $request = RideRequest::create([
            'student_id' => $student->id,
            'zone_id' => $zone?->id,
            'university_id' => $data['university_id'],
            'pickup_lat' => $lat,
            'pickup_lng' => $lng,
            'pickup_address' => $data['pickup_address'] ?? null,
            // Same normalisation as TripService::schedule — see Core\Support\Clock.
            'desired_time' => Clock::fromClient((string) $data['desired_time']),
            'payment_method' => PaymentMethod::tryFrom((string) ($data['payment_method'] ?? '')) ?? PaymentMethod::Wallet,
            'type' => $type,
            'direction' => RideDirection::tryFrom($data['direction'] ?? '') ?? RideDirection::ToUniversity,
            'is_express' => $isExpress,
            'express_fee_fils' => $isExpress ? (int) config('rafeeq.express_fee_fils', 1500) : 0,
            'status' => RideRequestStatus::Pending,
            'notes' => $data['notes'] ?? null,
            'coupon_code' => ! empty($data['coupon_code']) ? mb_strtoupper(trim($data['coupon_code'])) : null,
        ]);

        $this->audit->log('ride_request.created', $student, auditable: $request);

        return $request->load('zone');
    }

    public function cancel(RideRequest $request): RideRequest
    {
        if (in_array($request->status, [RideRequestStatus::Completed, RideRequestStatus::Cancelled], true)) {
            throw new BusinessRuleException('لا يمكن إلغاء هذا الطلب.', 'CANNOT_CANCEL');
        }

        $request->forceFill(['status' => RideRequestStatus::Cancelled])->save();
        $this->audit->log('ride_request.cancelled', auditable: $request);

        return $request;
    }
}
