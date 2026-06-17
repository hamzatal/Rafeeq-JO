<?php

namespace Rafeeq\Infrastructure\Gpt\Contracts;

use Rafeeq\Infrastructure\Gpt\Data\GptResult;

/**
 * Abstraction over an LLM provider (OpenAI by default).
 *
 * Two driver implementations exist:
 *  - OpenAiGptClient: real provider, used when OPENAI_API_KEY is set.
 *  - NullGptClient:   safe fallback that returns a non-committal result so
 *                     the platform keeps working (e.g. manual review path)
 *                     when no key is configured.
 */
interface GptClient
{
    /**
     * Send a chat completion request.
     *
     * @param  array<int, array{role:string, content:string}>  $messages
     * @param  array<string, mixed>  $options
     */
    public function chat(array $messages, array $options = []): GptResult;

    /**
     * Analyse an image (vision). The image may be a public/temporary URL
     * or a base64 data URI. Returns the model's textual answer.
     *
     * @param  array<string, mixed>  $options
     */
    public function vision(string $prompt, string $imageUrl, array $options = []): GptResult;

    /** Whether a real provider is configured (vs the null fallback). */
    public function isEnabled(): bool;
}
