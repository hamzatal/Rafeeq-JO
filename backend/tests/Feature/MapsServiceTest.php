<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Rafeeq\Infrastructure\Maps\MapsService;
use Tests\TestCase;

class MapsServiceTest extends TestCase
{
    public function test_haversine_distance_is_reasonable(): void
    {
        $svc = new MapsService;
        // Irbid → Amman is ~70 km straight line.
        $m = $svc->haversineMeters(32.5556, 35.85, 31.9539, 35.9106);

        $this->assertGreaterThan(60_000, $m);
        $this->assertLessThan(90_000, $m);
    }

    public function test_distance_falls_back_to_haversine_without_key(): void
    {
        config()->set('services.maps.google_key', '');
        $svc = new MapsService;

        $m = $svc->distanceMeters(32.5556, 35.85, 32.5000, 35.85);
        $this->assertGreaterThan(0, $m);
    }

    public function test_distance_uses_google_when_key_present(): void
    {
        config()->set('services.maps.google_key', 'TEST_KEY');
        Http::fake([
            'maps.googleapis.com/maps/api/distancematrix/*' => Http::response([
                'rows' => [['elements' => [['distance' => ['value' => 12345]]]]],
            ], 200),
        ]);

        $m = (new MapsService)->distanceMeters(32.5, 35.8, 32.6, 35.9);
        $this->assertSame(12345, $m);
    }

    public function test_geocode_returns_null_without_key(): void
    {
        config()->set('services.maps.google_key', '');
        $this->assertNull((new MapsService)->geocode('Yarmouk University'));
    }

    public function test_geocode_parses_google_response(): void
    {
        config()->set('services.maps.google_key', 'TEST_KEY');
        Http::fake([
            'maps.googleapis.com/maps/api/geocode/*' => Http::response([
                'status' => 'OK',
                'results' => [['geometry' => ['location' => ['lat' => 32.51, 'lng' => 35.85]]]],
            ], 200),
        ]);

        $loc = (new MapsService)->geocode('Yarmouk University, Irbid');
        $this->assertEqualsWithDelta(32.51, $loc['lat'], 0.001);
        $this->assertEqualsWithDelta(35.85, $loc['lng'], 0.001);
    }

    public function test_config_endpoint_exposes_maps_provider(): void
    {
        config()->set('services.maps.google_key', 'PUB_KEY');
        config()->set('services.maps.provider', 'google');

        $this->getJson('/api/v1/config')
            ->assertOk()
            ->assertJsonPath('data.maps.provider', 'google')
            ->assertJsonPath('data.maps.key', 'PUB_KEY');
    }
}
