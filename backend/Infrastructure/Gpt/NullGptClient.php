<?php

namespace Rafeeq\Infrastructure\Gpt;

use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Infrastructure\Gpt\Data\GptResult;

/**
 * Safe fallback used when no OPENAI_API_KEY is configured.
 *
 * It never throws and never pretends to verify anything: it returns a
 * neutral, low-confidence result so callers fall back to manual/human
 * review. This keeps the whole platform functional without AI keys.
 */
class NullGptClient implements GptClient
{
    public function isEnabled(): bool
    {
        return false;
    }

    public function chat(array $messages, array $options = []): GptResult
    {
        return new GptResult(
            content: json_encode([
                'available' => false,
                'message' => 'AI is not configured; manual handling required.',
            ], JSON_UNESCAPED_UNICODE) ?: '{}',
            stub: true,
        );
    }

    public function vision(string $prompt, string $imageUrl, array $options = []): GptResult
    {
        return new GptResult(
            content: json_encode([
                'available' => false,
                'confidence' => 0,
                'decision' => 'manual_review',
                'message' => 'AI vision not configured; route to manual review.',
            ], JSON_UNESCAPED_UNICODE) ?: '{}',
            stub: true,
        );
    }
}
