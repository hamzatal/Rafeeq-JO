<?php

namespace Rafeeq\Modules\AI\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\AI\Services\AdminInsightsService;
use Rafeeq\Modules\AI\Services\FraudMonitorService;

class AiAdminController extends Controller
{
    public function __construct(
        private readonly FraudMonitorService $fraud,
        private readonly AdminInsightsService $insights,
    ) {}

    /** Smart command-center briefing: KPIs + GPT analysis + recommendations. */
    public function insights(): JsonResponse
    {
        return $this->ok($this->insights->build());
    }

    /** Highest-risk accounts for the safety center. */
    public function risks(Request $request): JsonResponse
    {
        return $this->ok($this->fraud->topRisks((int) $request->query('limit', 20)));
    }

    /** Risk score breakdown for a single user. */
    public function risk(string $userId): JsonResponse
    {
        return $this->ok($this->fraud->scoreFor($userId));
    }
}
