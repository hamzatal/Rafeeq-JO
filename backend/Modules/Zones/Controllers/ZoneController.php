<?php

namespace Rafeeq\Modules\Zones\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Zones\Models\Zone;
use Rafeeq\Modules\Zones\Requests\ZoneRequest;
use Rafeeq\Modules\Zones\Resources\ZoneResource;
use Rafeeq\Modules\Zones\Services\ZoneService;

class ZoneController extends Controller
{
    public function __construct(private readonly ZoneService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = Zone::query()->orderBy('name_ar');
        if (! $request->user()?->isStaff()) {
            $query->where('is_active', true);
        }

        return $this->ok(ZoneResource::collection($query->get()));
    }

    public function store(ZoneRequest $request): JsonResponse
    {
        return $this->created(new ZoneResource($this->service->create($request->validated())), 'تمت إضافة المنطقة.');
    }

    public function update(ZoneRequest $request, Zone $zone): JsonResponse
    {
        return $this->ok(new ZoneResource($this->service->update($zone, $request->validated())), 'تم التحديث.');
    }

    public function destroy(Zone $zone): JsonResponse
    {
        $this->service->delete($zone);

        return $this->ok(null, 'تم الحذف.');
    }
}
