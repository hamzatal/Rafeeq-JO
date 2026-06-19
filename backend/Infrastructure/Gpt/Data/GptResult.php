<?php

namespace Rafeeq\Infrastructure\Gpt\Data;

/**
 * Immutable result of a GPT call. `content` is the raw text response;
 * `json()` attempts to decode it as JSON (models are prompted to reply
 * with JSON for structured tasks like payment verification).
 */
final class GptResult
{
    /**
     * @param  array<int, array{id:string, name:string, arguments:array<string,mixed>}>  $toolCalls
     */
    public function __construct(
        public readonly string $content,
        public readonly int $promptTokens = 0,
        public readonly int $completionTokens = 0,
        public readonly string $model = '',
        public readonly bool $stub = false,
        public readonly array $toolCalls = [],
    ) {}

    public function hasToolCalls(): bool
    {
        return $this->toolCalls !== [];
    }

    public function totalTokens(): int
    {
        return $this->promptTokens + $this->completionTokens;
    }

    /**
     * Decode the response content as a JSON object. Tolerates models that
     * wrap JSON in markdown fences. Returns null when not parseable.
     *
     * @return array<string, mixed>|null
     */
    public function json(): ?array
    {
        $text = trim($this->content);

        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text) ?? $text;
            $text = trim($text);
        }

        // Fall back to extracting the first {...} block.
        if (! str_starts_with($text, '{')) {
            if (preg_match('/\{.*\}/s', $text, $m) === 1) {
                $text = $m[0];
            }
        }

        $decoded = json_decode($text, true);

        return is_array($decoded) ? $decoded : null;
    }
}
