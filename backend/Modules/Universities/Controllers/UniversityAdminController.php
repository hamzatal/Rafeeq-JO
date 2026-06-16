<?php

namespace Rafeeq\Modules\Universities\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Universities\Requests\StoreUniversityRequest;
use Rafeeq\Modules\Universities\Requests\UpdateUniversityRequest;
use Rafeeq\Modules\Universities\Resources\UniversityResource;
use Rafeeq\Modules\Universities\Services\UniversityService;

class UniversityAdminController extends Controller
{
    public function __construct(private readonly UniversityService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = University::query()->orderBy('name_ar');
        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(fn ($w) => $w->where('name_ar', 'like', "%{$search}%")
                ->orWhere('name_en', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }

        return $this->ok(UniversityResource::collection($query->paginate((int) $request->query('per_page', 50))));
    }

    public function store(StoreUniversityRequest $request): JsonResponse
    {
        $university = $this->service->create($request->validated());

        return $this->created(new UniversityResource($university), 'تمت إضافة الجامعة.');
    }

    public function update(UpdateUniversityRequest $request, University $university): JsonResponse
    {
        $university = $this->service->update($university, $request->validated());

        return $this->ok(new UniversityResource($university), 'تم تحديث الجامعة.');
    }

    public function destroy(University $university): JsonResponse
    {
        $this->service->delete($university);

        return $this->ok(null, 'تم حذف الجامعة.');
    }
}
