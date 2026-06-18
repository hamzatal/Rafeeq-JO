<?php

namespace Rafeeq\Modules\Safety\Services;

use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Safety\Models\DriverLocation;
use Rafeeq\Modules\Safety\Models\GhostTripWatch;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Models\TripTracking;
use Rafeeq\Shared\Enums\RiskSeverity;
use Rafeeq\Shared\Enums\TripPassengerStatus;

/**
 * GPS-based fraud detection.
 *
 *  1. Boarding location mismatch — when the captain confirms a boarding while
 *     physically far from the rider's pickup point, the OTP may have been read
 *     out remotely (collusion). Flagged.
 *  2. Ghost trip — when a captain cancels an on-platform trip that had riders
 *     and is then seen lingering near those same pickups, they likely served the
 *     students off-platform to bypass commission. Flagged with high severity.
 */
class GpsFraudService extends BaseService
{
    public function __construct(private readonly FraudService $fraud) {}

    /** Great-circle distance between two coordinates, in metres. */
    public function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000.0; // metres
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earth * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    /**
     * Compare the captain's last known location to a rider's pickup at boarding.
     * Records a risk flag (does not block boarding) when they are too far apart.
     */
    public function checkBoardingProximity(Trip $trip, TripPassenger $passenger): void
    {
        if ($passenger->pickup_lat === null || $passenger->pickup_lng === null) {
            return; // route-based trips have no door coordinates to compare
        }

        $captain = TripTracking::where('trip_id', $trip->id)->latest('recorded_at')->first();
        if (! $captain) {
            return; // no captain location yet — nothing to compare
        }

        $distance = $this->haversineMeters(
            (float) $captain->lat,
            (float) $captain->lng,
            (float) $passenger->pickup_lat,
            (float) $passenger->pickup_lng,
        );

        $threshold = (int) config('rafeeq.gps_boarding_mismatch_meters', 400);
        if ($distance <= $threshold) {
            return;
        }

        $trip->loadMissing('driver');
        $this->fraud->flag(
            $trip->driver?->user_id,
            'boarding_location_mismatch',
            RiskSeverity::Medium,
            'تأكيد صعود من موقع بعيد عن نقطة التقاط الراكب ('.round($distance).' م)',
            [
                'trip_id' => $trip->id,
                'passenger_id' => $passenger->id,
                'distance_meters' => round($distance),
                'threshold_meters' => $threshold,
            ],
        );
    }

    /**
     * Open a ghost-trip watch when a captain cancels a trip that had riders.
     * Snapshots the pickups so later captain pings can be checked against them.
     */
    public function openGhostWatch(Trip $trip): ?GhostTripWatch
    {
        if (! $trip->driver_id) {
            return null;
        }

        $pickups = $trip->passengers()
            ->whereIn('status', [
                TripPassengerStatus::Booked->value,
                TripPassengerStatus::Onboard->value,
                TripPassengerStatus::Cancelled->value,
            ])
            ->whereNotNull('pickup_lat')
            ->whereNotNull('pickup_lng')
            ->get()
            ->map(fn (TripPassenger $p) => [
                'lat' => (float) $p->pickup_lat,
                'lng' => (float) $p->pickup_lng,
                'student_id' => $p->student_id,
            ])
            ->all();

        if (empty($pickups)) {
            return null;
        }

        return GhostTripWatch::create([
            'trip_id' => $trip->id,
            'driver_id' => $trip->driver_id,
            'pickups' => $pickups,
            'resolved' => false,
            'expires_at' => now()->addMinutes((int) config('rafeeq.ghost_watch_minutes', 30)),
        ]);
    }

    /**
     * Record a captain location ping and evaluate any active ghost-trip watches.
     * Returns the stored ping.
     */
    public function recordDriverPing(string $driverId, float $lat, float $lng, ?float $speed = null): DriverLocation
    {
        $ping = DriverLocation::create([
            'driver_id' => $driverId,
            'lat' => $lat,
            'lng' => $lng,
            'speed' => $speed,
            'recorded_at' => now(),
        ]);

        $this->evaluateGhostWatches($driverId, $lat, $lng);

        return $ping;
    }

    private function evaluateGhostWatches(string $driverId, float $lat, float $lng): void
    {
        $radius = (int) config('rafeeq.ghost_watch_radius_meters', 250);

        $watches = GhostTripWatch::where('driver_id', $driverId)
            ->where('resolved', false)
            ->where('expires_at', '>=', now())
            ->get();

        foreach ($watches as $watch) {
            foreach ($watch->pickups as $pickup) {
                $distance = $this->haversineMeters($lat, $lng, (float) $pickup['lat'], (float) $pickup['lng']);
                if ($distance > $radius) {
                    continue;
                }

                $driver = DriverProfile::find($driverId);
                $this->fraud->flag(
                    $driver?->user_id,
                    'ghost_trip_detected',
                    RiskSeverity::High,
                    'كابتن قرب نقطة التقاط رحلة ألغاها ('.round($distance).' م) — اشتباه رحلة وهمية',
                    [
                        'trip_id' => $watch->trip_id,
                        'distance_meters' => round($distance),
                        'radius_meters' => $radius,
                        'student_id' => $pickup['student_id'] ?? null,
                    ],
                );

                $watch->forceFill(['resolved' => true])->save();
                break; // one flag per watch is enough
            }
        }
    }
}
