<?php

namespace Rafeeq\Infrastructure\Push\Contracts;

interface PushGateway
{
    /**
     * Send a push notification to a device token.
     *
     * Returns a `PushResult` rather than a string. See that class for why: the old
     * `string` return made a delivery failure indistinguishable from a success at
     * the call site, and the one call site did not distinguish them — which silently
     * disabled the SMS fallback for SOS and every other critical notification.
     *
     * Implementations must not throw. A messaging failure may not break the business
     * transaction that triggered it.
     *
     * @param  array<string, mixed>  $data  optional data payload
     * @param  array<string, mixed>  $options  delivery hints: channel_id, sound, priority ('high'|'normal')
     */
    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): PushResult;

    /** Whether a real push provider is configured. */
    public function isEnabled(): bool;
}
