<?php

namespace Rafeeq\Modules\Complaints\Services;

use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;

/**
 * AI analysis of a complaint's free-text description. Its main job is a SAFETY
 * net: detect dangerous content (harassment, threats, violence) even when the
 * reporter picked a benign category, so the complaint is escalated to critical
 * and the existing immediate-containment path kicks in. Best-effort; returns
 * null when GPT is disabled or anything fails.
 */
class ComplaintTriageService
{
    public function __construct(private readonly GptClient $gpt) {}

    /**
     * @return array{severity:string, summary:string, recommended_action:string, key_points:array<int,string>, confidence:int}|null
     */
    public function analyze(string $category, string $description): ?array
    {
        if (! $this->gpt->isEnabled()) {
            return null;
        }

        $system = 'You are a safety triage analyst for a Jordanian student ride-sharing platform. '
            .'Assess complaint severity from the description, not just the stated category. '
            .'Treat harassment, threats, violence, weapons, or sexual misconduct as "critical". '
            .'Reply with STRICT JSON only. Write summary/recommended_action in Arabic.';

        $user = <<<MSG
        Stated category: {$category}
        Complaint description: {$description}

        Return JSON:
        {
          "severity": "low|medium|high|critical",
          "summary": "one-sentence neutral summary",
          "key_points": ["short factual points"],
          "recommended_action": "what the safety team should do next",
          "confidence": 0-100
        }
        MSG;

        try {
            $result = $this->gpt->chat([
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ], ['json' => true, 'temperature' => 0.1]);

            $data = $result->json();
            if (! is_array($data)) {
                return null;
            }

            return [
                'severity' => (string) ($data['severity'] ?? 'low'),
                'summary' => (string) ($data['summary'] ?? ''),
                'key_points' => array_values(array_map('strval', (array) ($data['key_points'] ?? []))),
                'recommended_action' => (string) ($data['recommended_action'] ?? ''),
                'confidence' => (int) ($data['confidence'] ?? 0),
            ];
        } catch (\Throwable $e) {
            Log::warning('complaint.triage_failed', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
