<?php

namespace Rafeeq\Modules\Areas\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Areas\Models\Area;

class AreaService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function create(array $data): Area
    {
        $area = Area::create($data);
        $this->audit->log('area.created', auditable: $area);

        return $area;
    }

    public function update(Area $area, array $data): Area
    {
        $area->fill($data)->save();
        $this->audit->log('area.updated', auditable: $area);

        return $area->fresh();
    }

    public function delete(Area $area): void
    {
        $this->audit->log('area.deleted', auditable: $area);
        $area->delete();
    }
}
