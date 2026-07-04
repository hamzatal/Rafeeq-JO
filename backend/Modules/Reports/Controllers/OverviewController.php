<?php

namespace Rafeeq\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Reports\Services\OverviewService;

/**
 * Admin command-center overview.
 *   GET /api/v1/admin/overview/pending-counts  → red-badge counts per area
 *   GET /api/v1/admin/overview/activity        → newest-first "what's new" feed
 */
class OverviewController extends Controller
{
    public function __construct(private readonly OverviewService $overview) {}

    public function counts(): JsonResponse
    {
        return $this->ok($this->overview->counts());
    }

    public function activity(Request $request): JsonResponse
    {
        $limit = (int) $request->query('limit', 12);
        $limit = max(1, min(30, $limit));

        return $this->ok($this->overview->activity($limit));
    }
}
