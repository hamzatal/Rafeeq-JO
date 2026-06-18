<?php

namespace Rafeeq\Modules\Guardians\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Guardians\Models\GuardianLink;
use Rafeeq\Modules\Guardians\Requests\LinkGuardianRequest;
use Rafeeq\Modules\Guardians\Resources\GuardianLinkResource;
use Rafeeq\Modules\Guardians\Services\GuardianService;

/**
 * Student-facing management of their own guardians.
 * Routes: /api/v1/student/guardians  (role:student)
 */
class StudentGuardianController extends Controller
{
    public function __construct(private readonly GuardianService $guardians) {}

    public function index(Request $request): JsonResponse
    {
        $links = $this->guardians->guardiansForStudent($request->user());

        return $this->ok(GuardianLinkResource::collection($links));
    }

    public function store(LinkGuardianRequest $request): JsonResponse
    {
        $link = $this->guardians->linkByStudent(
            $request->user(),
            $request->input('phone'),
            $request->input('relation', 'parent'),
            $request->input('name'),
        );

        return $this->created(
            new GuardianLinkResource($link->load('guardian')),
            'تمت إضافة ولي الأمر. سيتمكن الآن من متابعة رحلاتك.',
        );
    }

    public function destroy(Request $request, GuardianLink $guardianLink): JsonResponse
    {
        $this->guardians->revoke($request->user(), $guardianLink);

        return $this->ok(null, 'تم إلغاء صلاحية ولي الأمر.');
    }
}
