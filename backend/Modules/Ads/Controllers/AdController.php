<?php

namespace Rafeeq\Modules\Ads\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Ads\Models\AdBanner;
use Rafeeq\Modules\Ads\Resources\AdBannerResource;
use Rafeeq\Modules\Ads\Services\AdBannerService;

/**
 * Public endpoint: live banners for a given placement slot, consumed by the
 * mobile apps to render in-app ad spaces.
 */
class AdController extends Controller
{
    public function __construct(private readonly AdBannerService $ads) {}

    public function index(Request $request): JsonResponse
    {
        $placement = (string) $request->query('placement', 'student_home');
        if (! in_array($placement, AdBanner::PLACEMENTS, true)) {
            return $this->ok([]);
        }

        return $this->ok(AdBannerResource::collection($this->ads->activeFor($placement)));
    }
}
