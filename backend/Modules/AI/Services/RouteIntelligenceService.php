<?php

namespace Rafeeq\Modules\AI\Services;

/**
 * Optimises the pickup order for a pooled trip using a nearest-neighbour
 * heuristic over haversine distances (deterministic, no external service).
 * The destination (university) is the end point; pickups are ordered to
 * minimise back-tracking from the first/farthest student toward campus.
 */
class RouteIntelligenceService
{
    /**
     * @param  array<int,array{id:string,lat:float,lng:float}>  $stops
     * @param  array{lat:float,lng:float}  $destination
     * @return array{order:array<int,string>, distance_km:float}
     */
    public function optimizePickupOrder(array $stops, array $destination): array
    {
        if (count($stops) <= 1) {
            return ['order' => array_map(fn ($s) => $s['id'], $stops), 'distance_km' => 0.0];
        }

        // Start from the stop farthest from the destination, then nearest-neighbour.
        usort($stops, fn ($a, $b) => $this->km($b, $destination) <=> $this->km($a, $destination));

        $remaining = $stops;
        $current = array_shift($remaining);
        $order = [$current['id']];
        $total = 0.0;

        while (! empty($remaining)) {
            usort($remaining, fn ($a, $b) => $this->km($current, $a) <=> $this->km($current, $b));
            $next = array_shift($remaining);
            $total += $this->km($current, $next);
            $order[] = $next['id'];
            $current = $next;
        }

        $total += $this->km($current, $destination);

        return ['order' => $order, 'distance_km' => round($total, 2)];
    }

    /** Haversine distance in km. */
    private function km(array $a, array $b): float
    {
        $r = 6371;
        $dLat = deg2rad($b['lat'] - $a['lat']);
        $dLng = deg2rad($b['lng'] - $a['lng']);
        $lat1 = deg2rad($a['lat']);
        $lat2 = deg2rad($b['lat']);
        $h = sin($dLat / 2) ** 2 + cos($lat1) * cos($lat2) * sin($dLng / 2) ** 2;

        return 2 * $r * asin(min(1.0, sqrt($h)));
    }
}
