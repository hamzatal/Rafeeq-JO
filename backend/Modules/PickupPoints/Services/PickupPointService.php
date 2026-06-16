<?php

namespace Rafeeq\Modules\PickupPoints\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\PickupPoints\Models\PickupPoint;

class PickupPointService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(array $data): PickupPoint
    {
        $point = PickupPoint::create($data);
        $this->audit->log('pickup_point.created', auditable: $point);

        return $point;
    }

    public function update(PickupPoint $point, array $data): PickupPoint
    {
        $point->fill($data)->save();
        $this->audit->log('pickup_point.updated', auditable: $point);

        return $point->fresh();
    }

    public function delete(PickupPoint $point): void
    {
        $this->audit->log('pickup_point.deleted', auditable: $point);
        $point->delete();
    }
}
