<?php

namespace Rafeeq\Modules\Auth\Services;

use Illuminate\Support\Str;

/**
 * Self-contained TOTP (RFC 6238) implementation — no external dependency.
 *
 * Defaults match authenticator apps (Google Authenticator, Authy, 1Password):
 *  - HMAC-SHA1, 6 digits, 30-second time step.
 * Verification accepts a small clock-drift window (±1 step by default).
 */
class TotpService
{
    private const DIGITS = 6;

    private const PERIOD = 30;

    private const ALGO = 'sha1';

    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** Generate a new random base32 secret (160 bits → 32 chars). */
    public function generateSecret(int $length = 32): string
    {
        $secret = '';
        $alphabet = self::BASE32;
        for ($i = 0; $i < $length; $i++) {
            $secret .= $alphabet[random_int(0, 31)];
        }

        return $secret;
    }

    /**
     * Build the otpauth:// provisioning URI for QR codes.
     */
    public function provisioningUri(string $secret, string $accountLabel, string $issuer = 'Rafeeq'): string
    {
        $label = rawurlencode($issuer.':'.$accountLabel);
        $query = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => strtoupper(self::ALGO),
            'digits' => self::DIGITS,
            'period' => self::PERIOD,
        ]);

        return "otpauth://totp/{$label}?{$query}";
    }

    /**
     * Verify a user-supplied code against the secret, tolerating clock drift.
     */
    public function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        if (! preg_match('/^\d{'.self::DIGITS.'}$/', (string) $code)) {
            return false;
        }

        $counter = (int) floor(time() / self::PERIOD);

        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals($this->codeAt($secret, $counter + $i), (string) $code)) {
                return true;
            }
        }

        return false;
    }

    /** Compute the TOTP code for a specific time-step counter. */
    public function codeAt(string $secret, int $counter): string
    {
        $key = $this->base32Decode($secret);
        $binCounter = pack('N*', 0).pack('N*', $counter); // 64-bit big-endian
        $hash = hash_hmac(self::ALGO, $binCounter, $key, true);

        $offset = ord($hash[strlen($hash) - 1]) & 0x0F;
        $truncated = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        );

        $code = $truncated % (10 ** self::DIGITS);

        return str_pad((string) $code, self::DIGITS, '0', STR_PAD_LEFT);
    }

    /**
     * Generate a set of plaintext single-use recovery codes (caller hashes them).
     *
     * @return array<int, string>
     */
    public function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(Str::random(5).'-'.Str::random(5));
        }

        return $codes;
    }

    private function base32Decode(string $secret): string
    {
        $secret = rtrim(strtoupper($secret), '=');
        if ($secret === '') {
            return '';
        }

        $buffer = 0;
        $bitsLeft = 0;
        $output = '';

        foreach (str_split($secret) as $char) {
            $val = strpos(self::BASE32, $char);
            if ($val === false) {
                continue; // skip invalid chars
            }
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $output;
    }
}
