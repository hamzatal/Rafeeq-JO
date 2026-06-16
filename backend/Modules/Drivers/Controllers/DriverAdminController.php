<?php

namespace Rafeeq\Modules\Drivers\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Drivers\Models\DriverDocument;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Drivers\Requests\ReviewDocumentRequest;
use Rafeeq\Modules\Drivers\Requests\ReviewDriverRequest;
use Rafeeq\Modules\Drivers\Resources\DriverDocumentResource;
use Rafeeq\Modules\Drivers\Resources\DriverProfileResource;
use Rafeeq\Modules\Drivers\Services\DriverDocumentService;
use Rafeeq\Modules\Drivers\Services\DriverReviewService;

class DriverAdminController extends Controller
{
    public function __construct(
        private readonly DriverReviewService $review,
        private readonly DriverDocumentService $documents,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = DriverProfile::query()->with('user')->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return $this->ok(
            DriverProfileResource::collection($query->paginate((int) $request->query('per_page', 20)))
        );
    }

    public function show(DriverProfile $driver): JsonResponse
    {
        return $this->ok(new DriverProfileResource($driver->load(['user', 'documents', 'vehicles'])));
    }

    public function documentUrl(DriverDocument $document): JsonResponse
    {
        return $this->ok([
            'url' => $this->documents->temporaryUrl($document),
            'expires_in' => 300,
        ]);
    }

    public function reviewDocument(ReviewDocumentRequest $request, DriverDocument $document): JsonResponse
    {
        $document = $this->documents->review(
            $document,
            (bool) $request->boolean('approve'),
            $request->input('note'),
            $request->user(),
        );

        return $this->ok(new DriverDocumentResource($document), 'تم تحديث حالة الوثيقة.');
    }

    public function reviewDriver(ReviewDriverRequest $request, DriverProfile $driver): JsonResponse
    {
        $reviewer = $request->user();
        $note = $request->input('note');

        $driver = match ($request->input('action')) {
            'approve' => $this->review->approve($driver, $reviewer, $note),
            'reject' => $this->review->reject($driver, $reviewer, $note),
            'suspend' => $this->review->suspend($driver, $reviewer, $note),
        };

        return $this->ok(new DriverProfileResource($driver), 'تم تحديث حالة الكابتن.');
    }
}
