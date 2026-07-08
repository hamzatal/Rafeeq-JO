<?php

namespace Rafeeq\Modules\LostFound\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\LostFound\Models\LostFoundItem;

/**
 * Semantic re-ranking of lost/found candidate matches. Given a report and its
 * keyword candidates, GPT scores how likely each candidate is the same item
 * (confidence + short Arabic reason). Best-effort: when GPT is disabled or
 * fails, the keyword order is preserved with null AI fields.
 *
 * Returns plain arrays (item fields + ai_confidence + ai_match_reason) so the
 * existing `candidates` endpoint contract (LostFoundItem[]) stays intact.
 */
class LostFoundMatchService
{
    public function __construct(private readonly GptClient $gpt) {}

    public function rank(LostFoundItem $item, Collection $candidates): Collection
    {
        if ($candidates->isEmpty()) {
            return collect();
        }

        $scores = $this->gptScores($item, $candidates);

        return $candidates
            ->map(fn (LostFoundItem $c) => array_merge($c->toArray(), [
                'ai_confidence' => $scores[$c->id]['confidence'] ?? null,
                'ai_match_reason' => $scores[$c->id]['reason'] ?? null,
            ]))
            ->sortByDesc(fn (array $a) => $a['ai_confidence'] ?? -1)
            ->values();
    }

    /**
     * @return array<string, array{confidence:int, reason:string}>
     */
    private function gptScores(LostFoundItem $item, Collection $candidates): array
    {
        if (! $this->gpt->isEnabled()) {
            return [];
        }

        $list = $candidates->values()
            ->map(fn (LostFoundItem $c, int $i) => "{$i}) [{$c->id}] {$c->title} — ".($c->description ?? ''))
            ->implode("\n");

        $system = 'You match lost & found reports for a Jordanian student platform. '
            .'Given a target report and candidate items from the opposite pool, score how likely '
            .'each candidate is the SAME physical item (0-100). Reply STRICT JSON only. Reasons in Arabic.';

        $user = <<<MSG
        Target ({$item->type}): {$item->title} — {$item->description}
        Candidates:
        {$list}

        Return JSON: { "matches": [ { "id": "<candidate id>", "confidence": 0-100, "reason": "سبب مختصر" } ] }
        MSG;

        try {
            $data = $this->gpt->chat([
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $user],
            ], ['json' => true, 'temperature' => 0.1])->json();

            $out = [];
            foreach ((array) ($data['matches'] ?? []) as $m) {
                if (! empty($m['id'])) {
                    $out[(string) $m['id']] = [
                        'confidence' => max(0, min(100, (int) ($m['confidence'] ?? 0))),
                        'reason' => (string) ($m['reason'] ?? ''),
                    ];
                }
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('lostfound.match_failed', ['error' => $e->getMessage()]);

            return [];
        }
    }
}
