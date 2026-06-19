<?php

namespace Rafeeq\Modules\Support\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Shared\Enums\TicketCategory;

/**
 * AI triage for support tickets. Classifies the opening message (sentiment,
 * urgency, best category) and drafts a suggested reply for the agent. Fully
 * best-effort: when GPT is disabled (NullGptClient) or anything fails, it
 * returns null and the ticket flow continues untouched.
 */
class TicketTriageService
{
    public function __construct(private readonly GptClient $gpt) {}

    /**
     * @return array{sentiment:string, urgency:string, suggested_category:string, summary:string, suggested_reply:string, confidence:int}|null
     */
    public function triage(string $subject, string $body): ?array
    {
        if (! $this->gpt->isEnabled()) {
            return null;
        }

        $categories = implode(', ', TicketCategory::values());

        $system = 'You are a support triage assistant for a Jordanian student ride-sharing app. '
            .'Reply with STRICT JSON only. Write summary and suggested_reply in the same language as the user (Arabic if Arabic).';

        $user = <<<MSG
        Ticket subject: {$subject}
        Ticket message: {$body}

        Return JSON:
        {
          "sentiment": "positive|neutral|negative|angry",
          "urgency": "low|normal|high|urgent",
          "suggested_category": one of [{$categories}],
          "summary": "one-sentence summary",
          "suggested_reply": "a polite, helpful first reply the agent can send",
          "confidence": 0-100
        }
        MSG;

        try {
            $result = $this->gpt->chat([
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ], ['json' => true, 'temperature' => 0.2]);

            $data = $result->json();
            if (! is_array($data)) {
                return null;
            }

            return [
                'sentiment' => (string) ($data['sentiment'] ?? 'neutral'),
                'urgency' => (string) ($data['urgency'] ?? 'normal'),
                'suggested_category' => (string) ($data['suggested_category'] ?? 'other'),
                'summary' => (string) ($data['summary'] ?? ''),
                'suggested_reply' => (string) ($data['suggested_reply'] ?? ''),
                'confidence' => (int) ($data['confidence'] ?? 0),
            ];
        } catch (\Throwable $e) {
            Log::warning('support.triage_failed', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
