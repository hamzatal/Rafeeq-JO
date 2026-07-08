<?php

namespace Rafeeq\Modules\Zones\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Zones\Models\ZoneUniversityPrice;
use Rafeeq\Modules\Zones\Requests\ZoneUniversityPriceRequest;
use Rafeeq\Modules\Zones\Resources\ZoneUniversityPriceResource;

/**
 * Admin CRUD for the unified (zone ↔ university) fare matrix.
 */
class ZonePriceController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $query = ZoneUniversityPrice::query()->with(['zone', 'university']);
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }
        if ($universityId = $request->query('university_id')) {
            $query->where('university_id', $universityId);
        }

        return $this->ok(ZoneUniversityPriceResource::collection($query->get()));
    }

    public function store(ZoneUniversityPriceRequest $request): JsonResponse
    {
        $price = ZoneUniversityPrice::create($request->validated());
        $this->audit->log('zone_price.created', $request->user(), auditable: $price);

        return $this->created(
            new ZoneUniversityPriceResource($price->load(['zone', 'university'])),
            'تمت إضافة سعر المنطقة.'
        );
    }

    public function update(ZoneUniversityPriceRequest $request, ZoneUniversityPrice $price): JsonResponse
    {
        $price->fill($request->validated())->save();
        $this->audit->log('zone_price.updated', $request->user(), auditable: $price);

        return $this->ok(
            new ZoneUniversityPriceResource($price->fresh(['zone', 'university'])),
            'تم تحديث السعر.'
        );
    }

    public function destroy(Request $request, ZoneUniversityPrice $price): JsonResponse
    {
        $this->audit->log('zone_price.deleted', $request->user(), auditable: $price);
        $price->delete();

        return $this->ok(null, 'تم حذف السعر.');
    }
}
