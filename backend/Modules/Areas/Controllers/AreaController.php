<?php

namespace Rafeeq\Modules\Areas\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Areas\Models\Area;
use Rafeeq\Modules\Areas\Requests\AreaRequest;
use Rafeeq\Modules\Areas\Resources\AreaResource;
use Rafeeq\Modules\Areas\Services\AreaService;

class AreaController extends Controller
{
    public function __construct(private readonly AreaService $service) {}

    /** Public: active areas (for students). */
    public function index(Request $request): JsonResponse
    {
        $query = Area::query()->orderBy('name_ar');
        if (! $request->user()?->isStaff()) {
            $query->where('is_active', true);
        }

        return $this->ok(AreaResource::collection($query->get()));
    }

    public function store(AreaRequest $request): JsonResponse
    {
        return $this->created(new AreaResource($this->service->create($request->validated())), 'تمت إضافة المنطقة.');
    }

    public function update(AreaRequest $request, Area $area): JsonResponse
    {
        return $this->ok(new AreaResource($this->service->update($area, $request->validated())), 'تم تحديث المنطقة.');
    }

    public function destroy(Area $area): JsonResponse
    {
        $this->service->delete($area);

        return $this->ok(null, 'تم حذف المنطقة.');
    }
}
