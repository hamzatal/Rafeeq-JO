<?php

namespace Rafeeq\Modules\LostFound\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;
use Rafeeq\Modules\LostFound\Services\LostFoundMatchService;
use Rafeeq\Modules\LostFound\Services\LostFoundService;

class LostFoundController extends Controller
{
    public function __construct(private readonly LostFoundService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = LostFoundItem::where('status', 'open')->latest();
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        return $this->ok($query->paginate((int) $request->query('per_page', 20)));
    }

    public function mine(Request $request): JsonResponse
    {
        return $this->ok(
            LostFoundItem::where('reporter_id', $request->user()->id)->latest()
                ->paginate((int) $request->query('per_page', 20))
        );
    }

    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'in:lost,found'],
            'category' => ['nullable', 'string', 'max:40'],
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'location' => ['nullable', 'string', 'max:120'],
            'trip_id' => ['nullable', 'uuid'],
        ]);

        return $this->created($this->service->report($request->user(), $data), 'تم نشر البلاغ.');
    }

    public function candidates(Request $request, LostFoundItem $item, LostFoundMatchService $matcher): JsonResponse
    {
        // Ownership was never checked here, and every call spends money on a model
        // request. Asking "what might match MY report" is the only legitimate use.
        $this->assertOwnerOrStaff($request, $item);

        // Keyword candidates from the opposite pool, semantically re-ranked by AI.
        return $this->ok($matcher->rank($item, $this->service->candidates($item)));
    }

    public function resolve(Request $request, LostFoundItem $item): JsonResponse
    {
        $this->assertOwnerOrStaff($request, $item);

        /*
         * `matched_with` used to be read straight off the wire with NO validation —
         * no uuid, no `exists`, no type or status check — and then used as a primary
         * key in an `update()`. Any authenticated user could file one throwaway item
         * and flip an arbitrary stranger's open report to `matched`, closing it and
         * pointing it at their own item.
         *
         * Validating existence is not enough on its own: the row also has to be a
         * genuine counterpart, which the service verifies. Both halves are needed —
         * this stops a non-existent id, the service stops a valid id that has no
         * business being matched.
         */
        $data = $request->validate([
            'matched_with' => ['nullable', 'uuid', 'exists:lost_found_items,id'],
        ]);

        return $this->ok(
            $this->service->resolve($item, $request->user(), $data['matched_with'] ?? null),
            'تم تحديث البلاغ.',
        );
    }

    /** The reporter, or staff acting on their behalf. */
    private function assertOwnerOrStaff(Request $request, LostFoundItem $item): void
    {
        if ($item->reporter_id !== $request->user()->id
            && ! $request->user()->hasAnyRole(['admin', 'supervisor', 'support'])) {
            throw new AuthorizationException('هذا البلاغ لا يخصّك.');
        }
    }
}
