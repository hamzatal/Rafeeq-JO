<?php

namespace Rafeeq\Modules\Drivers\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;

class VehicleService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function store(DriverProfile $driver, array $data): Vehicle
    {
        $vehicle = $driver->vehicles()->create([
            'make' => $data['make'],
            'model' => $data['model'],
            'year' => $data['year'],
            'color' => $data['color'],
            'plate_number' => $data['plate_number'],
            'seats' => $data['seats'] ?? 4,
        ]);

        $this->audit->log('driver.vehicle_added', auditable: $vehicle);

        return $vehicle;
    }

    public function update(Vehicle $vehicle, array $data): Vehicle
    {
        $vehicle->fill(array_filter($data, fn ($v) => $v !== null))->save();

        return $vehicle->fresh();
    }

    public function delete(Vehicle $vehicle): void
    {
        $vehicle->delete();
    }
}
