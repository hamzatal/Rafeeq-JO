<?php

namespace Rafeeq\Modules\Matching\Controllers;

use Illuminate\Http\JsonResponse;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Matching\Services\MatchingService;

class MatchingController extends Controller
{
    public function __construct(private readonly MatchingService $matching) {}

    /** Admin/ops: trigger the pooling engine on demand. */
    public function run(): JsonResponse
    {
        $count = $this->matching->formTrips();

        return $this->ok(['trips_formed' => $count], "تم تكوين {$count} رحلة مجمّعة.");
    }
}
