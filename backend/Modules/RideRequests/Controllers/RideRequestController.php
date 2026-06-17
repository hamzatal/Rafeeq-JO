<?php

namespace Rafeeq\Modules\RideRequests\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\RideRequests\Models\RideRequest;
use Rafeeq\Modules\RideRequests\Requests\CreateRideRequestRequest;
use Rafeeq\Modules\RideRequests\Resources\RideRequestResource;
use Rafeeq\Modules\RideRequests\Services\RideRequestService;

class RideRequestController extends Controller
{
    public function __construct(private readonly RideRequestService $service) {}

    /** Student: create a ride request (door-to-door). */
    public function store(CreateRideRequestRequest $request): JsonResponse
    {
        $rideRequest = $this->service->create($request->user(), $request->validated());

        return $this->created(new RideRequestResource($rideRequest), 'تم إنشاء الطلب. جارٍ تجميعك مع طلاب منطقتك.');
    }

    /** Student: my ride requests. */
    public function mine(Request $request): JsonResponse
    {
        $list = RideRequest::query()->with('zone')
            ->where('student_id', $request->user()->id)
            ->latest()->get();

        return $this->ok(RideRequestResource::collection($list));
    }

    public function cancel(Request $request, RideRequest $rideRequest): JsonResponse
    {
        if ($rideRequest->student_id !== $request->user()->id) {
            throw new AuthorizationException('هذا الطلب لا يخصّك.');
        }

        return $this->ok(new RideRequestResource($this->service->cancel($rideRequest)), 'تم إلغاء الطلب.');
    }

    /** Admin/ops: list ride requests (for monitoring & matching). */
    public function index(Request $request): JsonResponse
    {
        $query = RideRequest::query()->with('zone')->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($zoneId = $request->query('zone_id')) {
            $query->where('zone_id', $zoneId);
        }

        return $this->ok(RideRequestResource::collection($query->paginate((int) $request->query('per_page', 50))));
    }
}
