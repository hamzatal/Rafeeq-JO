<?php

namespace Rafeeq\Modules\Ratings\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Ratings\Models\Rating;
use Rafeeq\Modules\Ratings\Requests\RateRequest;
use Rafeeq\Modules\Ratings\Resources\RatingResource;
use Rafeeq\Modules\Ratings\Services\RatingService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\RatingDirection;

class RatingController extends Controller
{
    public function __construct(private readonly RatingService $ratings) {}

    /** Submit a rating for a completed trip (student->driver or driver->student). */
    public function rate(RateRequest $request, Trip $trip): JsonResponse
    {
        $direction = RatingDirection::from($request->validated('direction'));

        $rating = $this->ratings->rate(
            trip: $trip,
            rater: $request->user(),
            direction: $direction,
            stars: (int) $request->validated('stars'),
            comment: $request->validated('comment'),
            targetStudentId: $request->validated('student_id'),
        );

        return $this->created(new RatingResource($rating), 'تم إرسال التقييم.');
    }

    /** Ratings the current user has submitted. */
    public function mine(Request $request): JsonResponse
    {
        $items = Rating::where('rater_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(RatingResource::collection($items));
    }

    /** Ratings received by the current user (e.g. a captain's reviews). */
    public function received(Request $request): JsonResponse
    {
        $items = Rating::where('ratee_id', $request->user()->id)
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return $this->ok(RatingResource::collection($items));
    }
}
