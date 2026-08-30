<?php

namespace Rafeeq\Modules\Drivers\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\TripStatus;

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

    /**
     * Delete a vehicle — unless a trip depends on it.
     *
     * ── Why this needed a guard the moment the UI reached it ────────────────────
     *
     * `trips.vehicle_id` is `nullOnDelete`, so a bare delete strips the car out of
     * every trip that used it — including COMPLETED ones, where which vehicle served a
     * ride is evidence a dispute needs, and including a trip currently in progress,
     * where the authorised plate is what lets the trip start at all.
     *
     * This was unreachable from either app until phase 9 added the button, so the
     * missing guard had never mattered. A destructive endpoint that nothing can call is
     * a guard you have not written yet.
     *
     * A scheduled or in-progress trip refuses outright — that car is expected somewhere.
     * Otherwise the vehicle is SOFT-deleted (see the 2026_09_03_000200 migration), so it
     * leaves the captain's list and every past trip keeps its record.
     */
    public function delete(Vehicle $vehicle): void
    {
        $live = Trip::where('vehicle_id', $vehicle->id)
            ->whereIn('status', [TripStatus::Scheduled->value, TripStatus::Started->value])
            ->exists();

        if ($live) {
            throw new BusinessRuleException(
                'لا يمكن حذف مركبة عليها رحلة قائمة. أنهِ الرحلة أوّلاً.',
                'VEHICLE_HAS_ACTIVE_TRIP',
            );
        }

        $vehicle->delete();
        $this->audit->log('driver.vehicle_deleted', auditable: $vehicle);
    }
}
