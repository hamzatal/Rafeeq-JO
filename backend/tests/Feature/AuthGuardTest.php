<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Smoke test: protected API routes must reject unauthenticated access.
 * Verifies the app boots and Sanctum guards are wired (no DB required).
 */
class AuthGuardTest extends TestCase
{
    public function test_protected_route_requires_authentication(): void
    {
        $this->getJson('/api/v1/wallet')->assertStatus(401);
    }

    public function test_admin_route_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/payments')->assertStatus(401);
    }
}
