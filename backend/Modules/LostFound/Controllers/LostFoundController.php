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
        // Keyword candidates from the opposite pool, semantically re-ranked by AI.
        return $this->ok($matcher->rank($item, $this->service->candidates($item)));
    }

    public function resolve(Request $request, LostFoundItem $item): JsonResponse
    {
        if ($item->reporter_id !== $request->user()->id && ! $request->user()->hasAnyRole(['admin', 'supervisor', 'support'])) {
            throw new AuthorizationException('هذا البلاغ لا يخصّك.');
        }
        $matchedWith = $request->input('matched_with');

        return $this->ok($this->service->resolve($item, $request->user(), $matchedWith), 'تم تحديث البلاغ.');
    }
}
