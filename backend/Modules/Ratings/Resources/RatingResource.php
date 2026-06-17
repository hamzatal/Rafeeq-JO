<?php

namespace Rafeeq\Modules\Ratings\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Ratings\Models\Rating;

/**
 * @mixin Rating
 */
class RatingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'trip_id' => $this->trip_id,
            'rater_id' => $this->rater_id,
            'ratee_id' => $this->ratee_id,
            'direction' => $this->direction->value,
            'stars' => $this->stars,
            'comment' => $this->comment,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
