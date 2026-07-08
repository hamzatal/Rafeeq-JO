<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Locks the security-header contract (Phase 4). Every API response — even an
 * unauthenticated 401 — must carry the hardening headers set by the
 * SecurityHeaders middleware, so a regression that drops them fails CI.
 */
class SecurityHeadersTest extends TestCase
{
    public function test_api_responses_carry_security_headers(): void
    {
        // Any /api/v1/* route works; the middleware runs before auth, so even a
        // 401 response is hardened. Use a protected route to prove that.
        $res = $this->getJson('/api/v1/wallet');

        $res->assertHeader('X-Content-Type-Options', 'nosniff');
        $res->assertHeader('X-Frame-Options', 'DENY');
        $res->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $res->assertHeader('Content-Security-Policy');
        $res->assertHeader('Permissions-Policy');
    }

    public function test_hsts_is_only_sent_over_https(): void
    {
        // Plain HTTP request (test default) must NOT carry HSTS, so local/dev
        // over HTTP is never pinned to TLS by mistake.
        $res = $this->getJson('/api/v1/wallet');
        $res->assertHeaderMissing('Strict-Transport-Security');
    }
}
