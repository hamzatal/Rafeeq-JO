<?php

namespace Rafeeq\Modules\Drivers\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Drivers\Models\Vehicle;
use Rafeeq\Modules\Drivers\Requests\StoreVehicleRequest;
use Rafeeq\Modules\Drivers\Requests\UpdateVehicleRequest;
use Rafeeq\Modules\Drivers\Resources\VehicleResource;
use Rafeeq\Modules\Drivers\Services\DriverService;
use Rafeeq\Modules\Drivers\Services\VehicleService;

class VehicleController extends Controller
{
    public function __construct(
        private readonly VehicleService $vehicles,
        private readonly DriverService $drivers,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $driver = $this->drivers->forUser($request->user());

        return $this->ok(VehicleResource::collection($driver->vehicles()->get()));
    }

    public function store(StoreVehicleRequest $request): JsonResponse
    {
        $driver = $this->drivers->forUser($request->user());
        $vehicle = $this->vehicles->store($driver, $request->validated());

        return $this->created(new VehicleResource($vehicle), 'تمت إضافة المركبة.');
    }

    public function update(UpdateVehicleRequest $request, Vehicle $vehicle): JsonResponse
    {
        $this->assertOwnership($request, $vehicle);
        $vehicle = $this->vehicles->update($vehicle, $request->validated());

        return $this->ok(new VehicleResource($vehicle), 'تم تحديث المركبة.');
    }

    public function destroy(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->assertOwnership($request, $vehicle);
        $this->vehicles->delete($vehicle);

        return $this->ok(null, 'تم حذف المركبة.');
    }

    private function assertOwnership(Request $request, Vehicle $vehicle): void
    {
        $driver = $this->drivers->forUser($request->user());

        if ($vehicle->driver_id !== $driver->id) {
            throw new AuthorizationException('هذه المركبة لا تخصّك.');
        }
    }
}
