<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Sms\WhatsAppCloudSmsGateway;
use Tests\TestCase;

class WhatsAppCloudOtpTest extends TestCase
{
    private function configure(array $overrides = []): void
    {
        config()->set('services.whatsapp_cloud', array_merge([
            'api_version' => 'v21.0',
            'phone_number_id' => '100000000000000',
            'access_token' => 'EAA-test-token',
            'mode' => 'template',
            'template_name' => 'rafeeq_otp',
            'template_lang' => 'ar',
            'template_button' => true,
            'timeout' => 15,
        ], $overrides));
    }

    public function test_sends_authentication_template_with_extracted_code_and_bearer(): void
    {
        $this->configure();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.ABC']]], 200),
        ]);

        $ref = (new WhatsAppCloudSmsGateway())->send(
            '+962790001234',
            'رفيق: رمز التحقق الخاص بك هو 482103. صالح لمدة 5 دقائق.',
        );

        $this->assertSame('wamid.ABC', $ref);
        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), '/v21.0/100000000000000/messages')
                && $request->hasHeader('Authorization', 'Bearer EAA-test-token')
                && $body['to'] === '962790001234'
                && $body['type'] === 'template'
                && $body['template']['name'] === 'rafeeq_otp'
                && $body['template']['components'][0]['parameters'][0]['text'] === '482103'
                // copy-code button repeats the code
                && $body['template']['components'][1]['parameters'][0]['text'] === '482103';
        });
    }

    public function test_text_mode_sends_plain_body(): void
    {
        $this->configure(['mode' => 'text']);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'x']]], 200)]);

        (new WhatsAppCloudSmsGateway())->send('0790001234', 'مرحبا من رفيق');

        Http::assertSent(function ($request) {
            $body = $request->data();

            return $body['type'] === 'text'
                && $body['text']['body'] === 'مرحبا من رفيق'
                && $body['to'] === '962790001234';
        });
    }

    public function test_throws_when_not_configured(): void
    {
        $this->configure(['phone_number_id' => '', 'access_token' => '']);

        $this->expectException(BusinessRuleException::class);
        (new WhatsAppCloudSmsGateway())->send('+962790001234', 'code 1234');
    }

    public function test_throws_when_api_returns_error(): void
    {
        $this->configure();
        Http::fake(['graph.facebook.com/*' => Http::response(['error' => ['message' => 'bad token']], 401)]);

        $this->expectException(BusinessRuleException::class);
        (new WhatsAppCloudSmsGateway())->send('+962790001234', 'code 1234');
    }
}
