<?php

namespace Tests\Feature;

use Rafeeq\Infrastructure\Sms\Contracts\SmsGateway;
use Rafeeq\Infrastructure\Sms\FallbackSmsGateway;
use Tests\TestCase;

class FallbackSmsGatewayTest extends TestCase
{
    private function gateway(bool $throws, string $ref, array &$calls): SmsGateway
    {
        return new class($throws, $ref, $calls) implements SmsGateway {
            public function __construct(private bool $throws, private string $ref, private array &$calls) {}

            public function send(string $to, string $message): string
            {
                $this->calls[] = $this->ref;
                if ($this->throws) {
                    throw new \RuntimeException('primary down');
                }

                return $this->ref;
            }
        };
    }

    public function test_uses_primary_when_it_succeeds(): void
    {
        $calls = [];
        $gw = new FallbackSmsGateway(
            $this->gateway(false, 'whatsapp', $calls),
            $this->gateway(false, 'sms', $calls),
        );

        $this->assertSame('whatsapp', $gw->send('0790000000', 'code 1234'));
        $this->assertSame(['whatsapp'], $calls, 'fallback must NOT be called when primary works');
    }

    public function test_falls_back_when_primary_fails(): void
    {
        $calls = [];
        $gw = new FallbackSmsGateway(
            $this->gateway(true, 'whatsapp', $calls),
            $this->gateway(false, 'sms', $calls),
        );

        $this->assertSame('sms', $gw->send('0790000000', 'code 1234'));
        $this->assertSame(['whatsapp', 'sms'], $calls, 'fallback used only after primary fails');
    }
}
