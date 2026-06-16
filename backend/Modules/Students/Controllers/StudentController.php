<?php

namespace Rafeeq\Modules\Students\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Students\Requests\UpdateStudentProfileRequest;
use Rafeeq\Modules\Students\Resources\StudentProfileResource;
use Rafeeq\Modules\Students\Services\StudentService;

class StudentController extends Controller
{
    public function __construct(private readonly StudentService $students) {}

    public function show(Request $request): JsonResponse
    {
        $profile = $this->students->forUser($request->user());

        return $this->ok(new StudentProfileResource($profile));
    }

    public function update(UpdateStudentProfileRequest $request): JsonResponse
    {
        $profile = $this->students->update($request->user(), $request->validated());

        return $this->ok(new StudentProfileResource($profile), 'تم تحديث بيانات الطالب.');
    }
}
