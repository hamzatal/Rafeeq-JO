<?php

namespace Rafeeq\Modules\Universities\Controllers;

use Illuminate\Http\JsonResponse;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Modules\Universities\Resources\UniversityResource;

/** Public, read-only listing for students. */
class UniversityController extends Controller
{
    public function index(): JsonResponse
    {
        $list = University::query()->where('is_active', true)->orderBy('name_ar')->get();

        return $this->ok(UniversityResource::collection($list));
    }

    public function show(University $university): JsonResponse
    {
        return $this->ok(new UniversityResource($university));
    }
}
