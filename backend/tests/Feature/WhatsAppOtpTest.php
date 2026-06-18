<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Sms\WhatsAppSmsGateway;
use Tests\TestCase;

class WhatsAppOtpTest extends TestCase
{
    private function configure(): void
    {
        config()->set('services.whatsapp', [
            'url' => 'http://wa.local:2785',
            'api_key' => 'test-key',
            'session' => 'rafeeq',
            'timeout' => 15,
        ]);
    }

    public function test_sends_text_to_openwa_with_normalized_chat_id(): void
    {
        $this->configure();
        Http::fake([
            'wa.local:2785/*' => Http::response(['id' => 'WA_123'], 200),
        ]);

        $ref = (new WhatsAppSmsGateway())->send('+962790001234', 'رمزك: 4821');

        $this->assertSame('WA_123', $ref);
        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/api/sessions/rafeeq/messages/send-text')
                && $request['chatId'] === '962790001234@c.us'
                && $request['text'] === 'رمزك: 4821'
                && $request->hasHeader('X-API-Key', 'test-key');
        });
    }

    public function test_normalizes_local_zero_prefixed_number(): void
    {
        $this->configure();
        Http::fake(['wa.local:2785/*' => Http::response(['id' => 'X'], 200)]);

        (new WhatsAppSmsGateway())->send('0790001234', 'hi');

        Http::assertSent(fn ($r) => $r['chatId'] === '962790001234@c.us');
    }

    public function test_throws_when_gateway_returns_error(): void
    {
        $this->configure();
        Http::fake(['wa.local:2785/*' => Http::response(['error' => 'no session'], 500)]);

        $this->expectException(BusinessRuleException::class);
        (new WhatsAppSmsGateway())->send('+962790001234', 'hi');
    }
}
