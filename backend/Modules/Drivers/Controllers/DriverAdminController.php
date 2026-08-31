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

    /*
     * ── The captain queue ─────────────────────────────────────────────────────
     *
     * `docs/design/src/06-admin-1.html` screen 35 subtitles this «التوثيق هو عنق
     * الزجاجة» and puts four aggregates above the table. Three things were missing for
     * that to be TRUE rather than decorative, and all three are fixed here.
     *
     * 1. `search` was a DEAD CONTROL. The dashboard has shipped a «بحث بالاسم أو
     *    الهاتف» box on this page that sends `?search=`; this method only ever read
     *    `status`. So an operator typed a captain's phone number, the request went out,
     *    the unfiltered first page came back, and the page rendered as though that were
     *    the answer. Silently ignoring a filter is worse than not offering it: the
     *    result LOOKS like a result.
     *
     * 2. `vehicles` is now eager-loaded, because the approved table has a المركبة
     *    column. Reading it off a lazy relation is 50 extra queries per page view.
     *
     * 3. `stats` is computed over EVERY captain, not the returned page. The four cards
     *    answer «how big is the backlog» — a question about the whole table. Counting
     *    the 20 rows in hand would make the numbers change when the operator filters,
     *    which is the opposite of what an aggregate is for.
     */
    public function index(Request $request): JsonResponse
    {
        $query = DriverProfile::query()->with(['user', 'vehicles', 'documents'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = trim((string) $request->query('search', ''))) {
            $query->whereHas('user', function ($user) use ($search) {
                $user->where('full_name', 'ILIKE', '%'.$search.'%')
                    ->orWhere('phone', 'LIKE', '%'.$search.'%');
            });
        }

        return $this->ok(
            DriverProfileResource::collection($query->paginate($this->perPage($request, 20))),
            null,
            ['stats' => $this->review->fleetStats()],
        );
    }

    public function show(DriverProfile $driver): JsonResponse
    {
        return $this->ok(new DriverProfileResource($driver->load(['user', 'documents', 'vehicles'])));
    }

    public function downloadDocument(DriverDocument $document)
    {
        return $this->documents->download($document);
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
