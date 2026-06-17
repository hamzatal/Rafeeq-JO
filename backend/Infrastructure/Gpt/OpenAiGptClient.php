<?php

namespace Rafeeq\Infrastructure\Gpt;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;

/**
 * OpenAI-compatible chat + vision client (Chat Completions API).
 * Configured via config/services.php -> openai.*
 */
class OpenAiGptClient implements GptClient
{
    public function isEnabled(): bool
    {
        return ! empty(config('services.openai.key'));
    }

    public function chat(array $messages, array $options = []): GptResult
    {
        return $this->request(
            model: $options['model'] ?? config('services.openai.chat_model'),
            messages: $messages,
            options: $options,
        );
    }

    public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
    {
        $messages = [[
            'role' => 'user',
            'content' => [
                ['type' => 'text', 'text' => $prompt],
                ['type' => 'image_url', 'image_url' => ['url' => $imageUrl]],
            ],
        ]];

        return $this->request(
            model: $options['model'] ?? config('services.openai.vision_model'),
            messages: $messages,
            options: $options,
        );
    }

    /**
     * @param  array<int, mixed>  $messages
     * @param  array<string, mixed>  $options
     */
    private function request(string $model, array $messages, array $options): GptResult
    {
        $payload = array_filter([
            'model' => $model,
            'messages' => $messages,
            'temperature' => $options['temperature'] ?? 0.2,
            'max_tokens' => $options['max_tokens'] ?? 1024,
            'response_format' => ($options['json'] ?? false) ? ['type' => 'json_object'] : null,
        ], fn ($v) => $v !== null);

        try {
            $response = Http::withToken((string) config('services.openai.key'))
                ->withHeaders(array_filter([
                    'OpenAI-Organization' => config('services.openai.organization'),
                ]))
                ->timeout((int) config('services.openai.timeout', 60))
                ->baseUrl(rtrim((string) config('services.openai.base_url'), '/'))
                ->post('/chat/completions', $payload);
        } catch (\Throwable $e) {
            Log::warning('[GPT] request failed', ['error' => $e->getMessage()]);
            throw new BusinessRuleException('تعذّر الاتصال بخدمة الذكاء الاصطناعي.', 'GPT_UNAVAILABLE');
        }

        if ($response->failed()) {
            Log::warning('[GPT] non-2xx response', ['status' => $response->status(), 'body' => $response->body()]);
            throw new BusinessRuleException('فشل طلب الذكاء الاصطناعي.', 'GPT_REQUEST_FAILED');
        }

        return new GptResult(
            content: (string) $response->json('choices.0.message.content', ''),
            promptTokens: (int) $response->json('usage.prompt_tokens', 0),
            completionTokens: (int) $response->json('usage.completion_tokens', 0),
            model: (string) $response->json('model', $model),
            stub: false,
        );
    }
}
