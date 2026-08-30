<?php

namespace Rafeeq\Modules\Trips\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Matching\Services\PricingService;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Enums\TripStatus;

/**
 * @mixin Trip
 */
class TripResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fare = (int) ($this->fare_fils ?? 0);
        $riders = (int) ($this->passengers_count ?? $this->passengers()->whereIn('status', ['booked', 'onboard'])->count());
        $pricing = app(PricingService::class);
        $split = $pricing->splitCommission($fare);

        return [
            'id' => $this->id,
            'route_id' => $this->route_id,
            'driver_id' => $this->driver_id,
            'vehicle_id' => $this->vehicle_id,
            'type' => $this->type,
            'direction' => $this->direction?->value,
            'direction_label' => $this->direction?->label(),
            'is_express' => (bool) $this->is_express,
            /* A whole-car booking: one passenger by construction, and a different
               fare. Without this a captain reads a one-rider car as a car that
               failed to fill, and the fare as a mistake. */
            'is_solo' => (bool) $this->is_solo,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'capacity' => $this->capacity,
            'booked_count' => $this->whenCounted('passengers'),
            // Transparent fare breakdown + captain earnings preview (per seat
            // and expected total for the current rider count).
            'pricing' => [
                'fare_fils' => $fare,
                'base_fare_fils' => (int) ($this->base_fare_fils ?? 0),
                'express_fee_fils' => (int) ($this->express_fee_fils ?? 0),
                'surge_multiplier' => (float) ($this->surge_multiplier ?? 1.0),
                'commission_fils' => $split['commission_fils'],
                'captain_share_fils' => $split['captain_share_fils'],
                'riders' => $riders,
                'expected_captain_earnings_fils' => $split['captain_share_fils'] * max(0, $riders),
            ],
            'route' => $this->whenLoaded('route', fn () => [
                'id' => $this->route->id,
                'name' => $this->route->name,
                'university_id' => $this->route->university_id,
            ]),
            'university' => $this->whenLoaded('university', fn () => $this->university ? [
                'id' => $this->university->id,
                'name' => $this->university->name,
            ] : null),
            'passengers' => TripPassengerResource::collection($this->whenLoaded('passengers')),
            'captain' => $this->captainBlock(),
        ];
    }

    /**
     * Who the student is about to get into a car with.
     *
     * ── Why this exists ────────────────────────────────────────────────────
     *
     * The resource used to expose `driver_id` and `vehicle_id` and nothing else, so
     * a rider had a UUID and no way to tell whether the car pulling up was theirs.
     * The student app filled the gap with a generic person icon and the ROUTE name
     * in the captain slot (`trips.tsx`, `// Driver placeholder`) — a fabricated
     * identity on the one screen where identity is the safety control.
     *
     * `docs/design/SCREENS.md` lists «بيانات الكابتن» as a required part of the live
     * trip. This is that data, and it is real.
     *
     * ── Why the guard is "is the relation loaded", not a viewer check ───────
     *
     * A viewer check here (is the caller a passenger of this trip?) costs one query
     * per trip in a collection, and `GET /trips/mine` returns every trip a student
     * has ever taken. So the decision lives with the CALLER instead: only endpoints
     * already scoped to the person entitled to see it eager-load `driver.user` and
     * `vehicle`.
     *
     * `StudentTripController::mine` does — it is filtered to `student_id = viewer`.
     * `StudentTripController::available` deliberately does NOT: the list of bookable
     * scheduled trips is visible to every student, and a captain's phone number is
     * not something you get for browsing.
     *
     * ── Why the phone disappears when the trip ends ─────────────────────────
     *
     * The number is needed for exactly one thing: the captain cannot find you. That
     * window closes when the trip does. Keeping it in the trip history would turn
     * every completed ride into a permanent contact record for a captain who never
     * agreed to that, and `Chat` remains open for anything after the fact.
     *
     * @return array<string, mixed>|null
     */
    private function captainBlock(): ?array
    {
        if (! $this->relationLoaded('driver') || $this->driver === null) {
            return null;
        }

        $live = ! in_array($this->status, [TripStatus::Completed, TripStatus::Cancelled], true);
        $vehicle = $this->relationLoaded('vehicle') ? $this->vehicle : null;

        return [
            'name' => $this->driver->relationLoaded('user') ? $this->driver->user?->full_name : null,
            'phone' => $live && $this->driver->relationLoaded('user') ? $this->driver->user?->phone : null,
            'rating_avg' => (float) $this->driver->rating_avg,
            'rating_count' => (int) $this->driver->rating_count,
            'total_trips' => (int) $this->driver->total_trips,
            'vehicle' => $vehicle ? [
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'year' => (int) $vehicle->year,
                'color' => $vehicle->color,
                'plate_number' => $vehicle->plate_number,
            ] : null,
        ];
    }
}
