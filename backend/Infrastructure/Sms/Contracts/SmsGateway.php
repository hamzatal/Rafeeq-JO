<?php

namespace Rafeeq\Infrastructure\Sms\Contracts;

interface SmsGateway
{
    /**
     * Send an SMS message. Returns a provider reference id on success.
     */
    public function send(string $to, string $message): string;
}
