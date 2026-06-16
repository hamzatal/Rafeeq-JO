<?php

namespace Rafeeq\Modules\PickupPoints\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\PickupPoints\Models\PickupPoint;
use Rafeeq\Modules\PickupPoints\Requests\PickupPointRequest;
use Rafeeq\Modules\PickupPoints\Resources\PickupPointResource;
use Rafeeq\Modules\PickupPoints\Services\PickupPointService;

class PickupPointController extends Controller
{
    public function __construct(private readonly PickupPointService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = PickupPoint::query()->orderBy('name_ar');

        if (! $request->user()?->isStaff()) {
            $query->where('is_active', true);
        }
        if ($areaId = $request->query('area_id')) {
            $query->where('area_id', $areaId);
        }
        if ($universityId = $request->query('university_id')) {
            $query->where('university_id', $universityId);
        }

        return $this->ok(PickupPointResource::collection($query->get()));
    }

    public function store(PickupPointRequest $request): JsonResponse
    {
        return $this->created(new PickupPointResource($this->service->create($request->validated())), 'تمت إضافة نقطة التجمّع.');
    }

    public function update(PickupPointRequest $request, PickupPoint $pickupPoint): JsonResponse
    {
        return $this->ok(new PickupPointResource($this->service->update($pickupPoint, $request->validated())), 'تم التحديث.');
    }

    public function destroy(PickupPoint $pickupPoint): JsonResponse
    {
        $this->service->delete($pickupPoint);

        return $this->ok(null, 'تم الحذف.');
    }
}
