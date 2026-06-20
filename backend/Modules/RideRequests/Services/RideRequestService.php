<?php

namespace Rafeeq\Modules\RideRequests\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\Zones\Services\ZoneService;
use Rafeeq\Shared\Enums\RideRequestStatus;
use Rafeeq\Shared\Enums\RideType;

class RideRequestService extends BaseService
{
    public function __construct(
        private readonly ZoneService $zones,
        private readonly AuditLogger $audit,
    ) {}

    public function create(User $student, array $data): RideRequest
    {
        $lat = (float) $data['pickup_lat'];
        $lng = (float) $data['pickup_lng'];
        $type = RideType::from($data['type'] ?? RideType::Scheduled->value);
        $isExpress = $type === RideType::Express;

        $zone = $this->zones->nearest($lat, $lng);

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
            'desired_time' => $data['desired_time'],
            'type' => $type,
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
