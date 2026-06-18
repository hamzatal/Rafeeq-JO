<?php

namespace Rafeeq\Modules\Guardians\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Guardians\Resources\GuardianChildResource;
use Rafeeq\Modules\Guardians\Services\GuardianService;

/**
 * Guardian-facing portal.
 * Routes: /api/v1/guardian  (role:guardian)
 */
class GuardianController extends Controller
{
    public function __construct(private readonly GuardianService $guardians) {}

    /** Students this guardian is authorised to follow. */
    public function children(Request $request): JsonResponse
    {
        $links = $this->guardians->childrenForGuardian($request->user());

        return $this->ok(GuardianChildResource::collection($links));
    }

    /** Live trip tracking for a linked student. */
    public function liveTrip(Request $request, string $studentUserId): JsonResponse
    {
        $payload = $this->guardians->liveTrip($request->user(), $studentUserId);

        return $this->ok($payload);
    }

    /** Safe-arrival timeline for a linked student. */
    public function arrivalLog(Request $request, string $studentUserId): JsonResponse
    {
        $events = $this->guardians->safeArrivalLog($request->user(), $studentUserId);

        return $this->ok($events);
    }

    /** Request a masked call session with the active trip's captain. */
    public function contactCaptain(Request $request, string $studentUserId): JsonResponse
    {
        $payload = $this->guardians->contactCaptain($request->user(), $studentUserId);

        return $this->ok($payload);
    }

    /** Raise an SOS on behalf of the linked student. */
    public function sos(Request $request, string $studentUserId): JsonResponse
    {
        $incident = $this->guardians->relaySos($request->user(), $studentUserId, $request->input('note'));

        return $this->created(
            ['incident_id' => $incident->id, 'status' => $incident->status],
            'تم إرسال نداء الطوارئ لفريق السلامة.',
        );
    }
}
