<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * 1.18 — `/api/config` is public and unauthenticated. It may carry the client map
 * key, which is restricted by referrer and bundle id, and nothing else. It used to
 * return the SERVER key that bills Geocoding and Distance Matrix and is restricted
 * by IP, so a referrer rule cannot protect it: anyone who read this endpoint could
 * spend the project's Maps quota.
 */
class PublicConfigLeakTest extends TestCase
{
    public function test_public_config_never_returns_the_server_maps_key(): void
    {
        config([
            'services.maps.google_key' => 'SERVER-KEY-MUST-NOT-LEAK',
            'services.maps.google_client_key' => 'CLIENT-KEY-IS-FINE',
        ]);

        $res = $this->getJson('/api/v1/config')->assertOk();

        $this->assertStringNotContainsString('SERVER-KEY-MUST-NOT-LEAK', $res->getContent(),
            'the IP-restricted server key must never appear in a public response');
        $this->assertSame('CLIENT-KEY-IS-FINE', $res->json('data.maps.key'));
    }

    /** An unset client key must yield an empty string, not fall back to the server key. */
    public function test_a_missing_client_key_does_not_fall_back_to_the_server_key(): void
    {
        config([
            'services.maps.google_key' => 'SERVER-KEY-MUST-NOT-LEAK',
            'services.maps.google_client_key' => null,
        ]);

        $res = $this->getJson('/api/v1/config')->assertOk();

        $this->assertSame('', $res->json('data.maps.key'));
        $this->assertStringNotContainsString('SERVER-KEY-MUST-NOT-LEAK', $res->getContent());
    }
}
