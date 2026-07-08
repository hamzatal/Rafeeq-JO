<?php

namespace Rafeeq\Modules\AI\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\AI\Services\SmartSuggestionsService;

/**
 * Context-aware ride suggestions for the student home screen.
 */
class SmartSuggestionsController extends Controller
{
    public function __construct(private readonly SmartSuggestionsService $suggestions) {}

    public function index(Request $request): JsonResponse
    {
        return $this->ok($this->suggestions->for($request->user()));
    }
}
