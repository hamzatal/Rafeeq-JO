<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_api_responses_carry_security_headers(): void
    {
        $res = $this->getJson('/api/v1/ping');

        $res->assertOk();
        $res->assertHeader('X-Content-Type-Options', 'nosniff');
        $res->assertHeader('X-Frame-Options', 'DENY');
        $res->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $this->assertNotEmpty($res->headers->get('Content-Security-Policy'));
        $this->assertNotEmpty($res->headers->get('Permissions-Policy'));
    }

    public function test_hsts_absent_over_plain_http(): void
    {
        $res = $this->getJson('/api/v1/ping');
        // Local test requests are HTTP, so HSTS must not be asserted.
        $this->assertNull($res->headers->get('Strict-Transport-Security'));
    }
}
