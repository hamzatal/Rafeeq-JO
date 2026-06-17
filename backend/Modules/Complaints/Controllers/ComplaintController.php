<?php

namespace Rafeeq\Modules\Complaints\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Complaints\Models\Complaint;
use Rafeeq\Modules\Complaints\Resources\ComplaintResource;
use Rafeeq\Modules\Complaints\Services\ComplaintService;
use Rafeeq\Shared\Enums\ComplaintStatus;

class ComplaintController extends Controller
{
    public function __construct(private readonly ComplaintService $complaints) {}

    // ── Reporter ────────────────────────────────────────────────────────
    public function mine(Request $request): JsonResponse
    {
        $items = Complaint::where('reporter_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(ComplaintResource::collection($items));
    }

    public function file(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'max:30'],
            'description' => ['required', 'string', 'min:5', 'max:2000'],
            'against_user_id' => ['nullable', 'uuid', 'exists:users,id'],
            'against_type' => ['nullable', 'in:driver,student'],
            'trip_id' => ['nullable', 'uuid'],
            'severity' => ['nullable', 'in:low,medium,high,critical'],
        ]);

        $complaint = $this->complaints->file($request->user(), $data);

        return $this->created(new ComplaintResource($complaint), 'تم استلام بلاغك. سنتعامل معه بجدّية.');
    }

    // ── Admin / supervisor ──────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = Complaint::with(['reporter', 'against'])->latest();
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($severity = $request->query('severity')) {
            $query->where('severity', $severity);
        }

        return $this->ok(ComplaintResource::collection($query->paginate((int) $request->query('per_page', 30))));
    }

    public function show(Complaint $complaint): JsonResponse
    {
        return $this->ok(new ComplaintResource($complaint->load(['reporter', 'against'])));
    }

    public function setStatus(Request $request, Complaint $complaint): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', ComplaintStatus::values())],
            'resolution' => ['nullable', 'string', 'max:2000'],
            'reinstate' => ['nullable', 'boolean'],
        ]);

        $status = ComplaintStatus::from($data['status']);
        $updated = $this->complaints->setStatus($complaint, $request->user(), $status, $data['resolution'] ?? null);

        if (! empty($data['reinstate'])) {
            $this->complaints->reinstate($complaint, $request->user());
        }

        return $this->ok(new ComplaintResource($updated->load(['reporter', 'against'])), 'تم تحديث البلاغ.');
    }
}
