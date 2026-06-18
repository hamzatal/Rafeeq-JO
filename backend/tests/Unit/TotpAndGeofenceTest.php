<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Rafeeq\Modules\Auth\Services\TotpService;
use Rafeeq\Modules\Zones\Models\Zone;

class TotpAndGeofenceTest extends TestCase
{
    public function test_totp_code_verifies_against_its_own_secret(): void
    {
        $totp = new TotpService();
        $secret = $totp->generateSecret();

        $counter = (int) floor(time() / 30);
        $code = $totp->codeAt($secret, $counter);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertTrue($totp->verify($secret, $code));
        $this->assertFalse($totp->verify($secret, '000000'));
    }

    public function test_totp_rejects_malformed_codes(): void
    {
        $totp = new TotpService();
        $secret = $totp->generateSecret();

        $this->assertFalse($totp->verify($secret, 'abcdef'));
        $this->assertFalse($totp->verify($secret, '12345'));
    }

    public function test_provisioning_uri_contains_secret_and_issuer(): void
    {
        $totp = new TotpService();
        $uri = $totp->provisioningUri('JBSWY3DPEHPK3PXP', 'admin@rafeeq.jo', 'Rafeeq');

        $this->assertStringStartsWith('otpauth://totp/', $uri);
        $this->assertStringContainsString('secret=JBSWY3DPEHPK3PXP', $uri);
        $this->assertStringContainsString('issuer=Rafeeq', $uri);
    }

    public function test_point_in_polygon_geofence(): void
    {
        // A square around Irbid (~lat 32.55, lng 35.85).
        $zone = new Zone();
        $zone->center_lat = 32.55;
        $zone->center_lng = 35.85;
        $zone->radius_km = 3;
        $zone->boundary = [
            [32.50, 35.80],
            [32.60, 35.80],
            [32.60, 35.90],
            [32.50, 35.90],
        ];

        $this->assertTrue($zone->hasBoundary());
        // Inside the square.
        $this->assertTrue($zone->containsPoint(32.55, 35.85));
        // Outside the square.
        $this->assertFalse($zone->containsPoint(32.70, 36.00));
    }

    public function test_zone_without_boundary_does_not_contain_points(): void
    {
        $zone = new Zone();
        $zone->boundary = null;

        $this->assertFalse($zone->hasBoundary());
        $this->assertFalse($zone->containsPoint(32.55, 35.85));
    }
}
