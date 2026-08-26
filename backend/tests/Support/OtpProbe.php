<?php

namespace Tests\Support;

/**
 * Recovers an OTP the way a real client does: off the outbound message.
 *
 * The code is no longer returned by the API and no longer written to the log,
 * so there is nothing to read from a response. Rather than reintroduce a debug
 * backdoor for tests, the suite binds {@see SpySmsGateway} and reads the code
 * out of the message that would have been delivered.
 */
final class OtpProbe
{
    /**
     * @param  string  $identifier  phone or email the code was issued to
     *
     * @throws \RuntimeException when no message was sent, or it holds no code
     */
    public static function latestCodeFor(string $identifier, ?string $purpose = null): string
    {
        $message = SpySmsGateway::lastTo($identifier);

        if ($message === null) {
            throw new \RuntimeException("No message was sent to [{$identifier}].");
        }

        $length = (int) config('otp.length', 6);

        if (preg_match('/\b(\d{'.$length.'})\b/', $message, $m) !== 1) {
            throw new \RuntimeException("No {$length}-digit code found in the message to [{$identifier}].");
        }

        return $m[1];
    }
}
