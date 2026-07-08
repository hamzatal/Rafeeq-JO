<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Release-hardening probes (Phase 7).
 *
 * `/ping` is a shallow liveness probe (no dependencies). `/health` is a deep
 * readiness probe that verifies the database + cache and reports each component
 * plus the deployed version, returning 503 when degraded so orchestrators pull
 * the instance from rotation. Both are public (no auth) for load balancers.
 */
class HealthCheckTest extends TestCase
{
    public function test_ping_is_a_public_liveness_probe(): void
    {
        $this->getJson('/api/v1/ping')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('message', 'pong');
    }

    public function test_health_reports_healthy_when_dependencies_are_up(): void
    {
        $res = $this->getJson('/api/v1/health')->assertOk();

        $res->assertJsonPath('data.status', 'healthy');
        $res->assertJsonPath('data.checks.database', 'ok');
        $res->assertJsonPath('data.checks.cache', 'ok');
        $res->assertJsonPath('data.service', 'rafeeq-api');
        $this->assertIsString($res->json('data.version'));
    }
}
