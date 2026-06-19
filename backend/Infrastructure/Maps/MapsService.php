<?php

namespace Rafeeq\Infrastructure\Maps;

use Illuminate\Support\Facades\Http;
use Rafeeq\Core\Support\Safely;

/**
 * Maps integration (Google) with a safe, always-available fallback.
 *
 * Design (matches Rafeeq resilience policy):
 *  - When GOOGLE_MAPS_KEY is set, uses Google Geocoding + Distance Matrix.
 *  - Otherwise (or on any failure) falls back to a straight-line haversine
 *    distance and a null geocode — the platform keeps working without a key.
 *
 * Nothing here ever throws: callers get a sensible value or null.
 */
class MapsService
{
    public function isEnabled(): bool
    {
        return ! empty(config('services.maps.google_key'));
    }

    /**
     * Driving distance in meters between two points. Falls back to the
     * straight-line (haversine) distance when Google is unavailable.
     */
    public function distanceMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): int
    {
        if ($this->isEnabled()) {
            $google = Safely::value(
                fn () => $this->googleDistanceMeters($fromLat, $fromLng, $toLat, $toLng),
                default: null,
                context: 'maps.distance',
            );
            if ($google !== null) {
                return $google;
            }
        }

        return (int) round($this->haversineMeters($fromLat, $fromLng, $toLat, $toLng));
    }

    /**
     * Geocode an address to coordinates. Returns null when Google is
     * unavailable or the address can't be resolved.
     *
     * @return array{lat: float, lng: float}|null
     */
    public function geocode(string $address): ?array
    {
        if (! $this->isEnabled() || trim($address) === '') {
            return null;
        }

        return Safely::value(function () use ($address) {
            $response = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => $address,
                'key' => (string) config('services.maps.google_key'),
                'region' => 'jo',
                'language' => 'ar',
            ]);

            if ($response->failed() || $response->json('status') !== 'OK') {
                return null;
            }

            $loc = $response->json('results.0.geometry.location');

            return is_array($loc) && isset($loc['lat'], $loc['lng'])
                ? ['lat' => (float) $loc['lat'], 'lng' => (float) $loc['lng']]
                : null;
        }, default: null, context: 'maps.geocode');
    }

    private function googleDistanceMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): ?int
    {
        $response = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
            'origins' => "{$fromLat},{$fromLng}",
            'destinations' => "{$toLat},{$toLng}",
            'key' => (string) config('services.maps.google_key'),
            'mode' => 'driving',
            'language' => 'ar',
        ]);

        if ($response->failed()) {
            return null;
        }

        $meters = $response->json('rows.0.elements.0.distance.value');

        return is_numeric($meters) ? (int) $meters : null;
    }

    /** Great-circle distance in meters. */
    public function haversineMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earth = 6_371_000.0; // meters
        $dLat = deg2rad($toLat - $fromLat);
        $dLng = deg2rad($toLng - $fromLng);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($dLng / 2) ** 2;

        return $earth * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
