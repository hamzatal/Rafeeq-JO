<?php

namespace Rafeeq\Infrastructure\Push\Contracts;

interface PushGateway
{
    /**
     * Send a push notification to a device token.
     *
     * @param  array<string, mixed>  $data  optional data payload
     * @param  array<string, mixed>  $options  delivery hints: channel_id, sound, priority ('high'|'normal')
     * @return string provider message reference
     */
    public function send(string $deviceToken, string $title, string $body, array $data = [], array $options = []): string;

    /** Whether a real push provider is configured. */
    public function isEnabled(): bool;
}
