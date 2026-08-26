<?php

namespace Tests\Support;

use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;

/**
 * In-memory SMS gateway used across the whole test suite.
 *
 * Two reasons it exists:
 *
 *  1. No test can accidentally reach a real provider, whatever SMS_DRIVER says.
 *  2. Tests need the OTP, and the code deliberately never appears in an API
 *     response or a log any more. Reading it off the outbound message is
 *     exactly how a real user receives it, so the test exercises the same path
 *     a person does instead of relying on a debug backdoor existing in
 *     production code.
 */
final class SpySmsGateway implements SmsGateway
{
    /** @var array<int, array{to: string, message: string, reference: string}> */
    private static array $sent = [];

    public function send(string $to, string $message): string
    {
        $reference = 'spy_'.count(self::$sent);
        self::$sent[] = ['to' => $to, 'message' => $message, 'reference' => $reference];

        return $reference;
    }

    public static function reset(): void
    {
        self::$sent = [];
    }

    /** @return array<int, array{to: string, message: string, reference: string}> */
    public static function all(): array
    {
        return self::$sent;
    }

    /** Newest message sent to an identifier, or null. */
    public static function lastTo(string $identifier): ?string
    {
        foreach (array_reverse(self::$sent) as $row) {
            if ($row['to'] === $identifier) {
                return $row['message'];
            }
        }

        return null;
    }
}
