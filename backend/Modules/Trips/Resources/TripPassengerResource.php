<?php

namespace Rafeeq\Modules\Trips\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Trips\Models\TripPassenger;

/**
 * @mixin TripPassenger
 */
class TripPassengerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // boarding_code is exposed only to the owning student (e.g. in "my trips").
        $isOwner = $request->user() && $request->user()->id === $this->student_id;

        return [
            'id' => $this->id,
            'trip_id' => $this->trip_id,
            'student_id' => $this->student_id,
            'pickup_point_id' => $this->pickup_point_id,
            'pickup_order' => $this->pickup_order,
            'pickup_lat' => $this->pickup_lat,
            'pickup_lng' => $this->pickup_lng,
            'student_name' => $this->whenLoaded('student', fn () => $this->student?->full_name),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),

            /*
             * How this seat is being paid for — the one thing the student needs to know
             * back from `POST /trips/{trip}/book` and could not get.
             *
             * Booking no longer requires a plan, so the answer is no longer implied by
             * the endpoint you called: the same request produces a plan-funded seat for a
             * subscriber and a wallet or cash seat for everyone else. Without this the app
             * would have to re-fetch `/v1/subscriptions` and re-derive the decision the
             * server just made, and the two could disagree.
             *
             * Same precedence as `FinancialReportService::FUNDING`: a plan wins over the
             * payment method, because the method stops meaning anything once a plan is
             * covering the fare.
             */
            'funding' => $this->subscription_id !== null ? 'subscription' : $this->payment_method->value,

            'boarded_at' => $this->boarded_at?->toIso8601String(),
            'dropoff_confirmed_at' => $this->dropoff_confirmed_at?->toIso8601String(),
            'boarding_code' => $isOwner ? $this->boarding_code : null,
            // Drop-off code is issued once the student is onboard; shown only to
            // the owner to read out to the captain on arrival.
            'dropoff_code' => $isOwner ? $this->dropoff_code : null,

            /*
             * ── The trip itself, which this resource never sent ─────────────────
             *
             * `StudentTripController::mine` has eager-loaded `trip.route` since it was
             * written, and this resource dropped it on the floor. So every consumer of
             * `GET /trips/mine` received a passenger row with no trip attached, and the
             * student app — which reads `p.trip?.route?.name`, `p.trip?.scheduled_at`
             * and `p.trip?.pricing?.fare_fils` — rendered the fallback for all three.
             * Every past ride was titled «رحلة» with a dash for its fare.
             *
             * Worse than the blank labels: `trips.tsx` subscribed to live tracking with
             * `mine.filter((p) => p.trip)`, which selected NOTHING. The tracker on that
             * screen could never have received a position, for any trip, ever. It looked
             * finished, it typechecked, and it was wired to a field the API did not send.
             *
             * `whenLoaded` keeps it opt-in, so the captain's passenger manifest — which
             * serialises this resource from the other direction — does not recurse back
             * into `TripResource` and re-serialise its own passengers.
             */
            'trip' => $this->whenLoaded('trip', fn () => new TripResource($this->trip)),
        ];
    }
}
