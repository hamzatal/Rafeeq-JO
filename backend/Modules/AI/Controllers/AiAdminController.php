<?php

namespace Rafeeq\Modules\AI\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Core\Support\Safely;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\AI\Services\AdminInsightsService;
use Rafeeq\Modules\AI\Services\FraudMonitorService;

class AiAdminController extends Controller
{
    public function __construct(
        private readonly FraudMonitorService $fraud,
        private readonly AdminInsightsService $insights,
        private readonly GptClient $gpt,
    ) {}

    /** Smart command-center briefing: KPIs + GPT analysis + recommendations. */
    public function insights(): JsonResponse
    {
        return $this->ok($this->insights->build());
    }

    /** Highest-risk accounts for the safety center. */
    public function risks(Request $request): JsonResponse
    {
        return $this->ok($this->fraud->topRisks((int) $request->query('limit', 20)));
    }

    /**
     * Full risk assessment for one account + an optional GPT narrative
     * (recommended action). Falls back to a rule-based summary without a key.
     */
    public function risk(string $userId): JsonResponse
    {
        $assessment = $this->fraud->assess($userId);

        return $this->ok($assessment + ['narrative' => $this->riskNarrative($assessment)]);
    }

    /** @param array<string,mixed> $assessment */
    private function riskNarrative(array $assessment): string
    {
        $factors = collect($assessment['factors'] ?? [])->pluck('label')->implode('، ');
        $patterns = count($assessment['patterns'] ?? []);
        $rule = "درجة الخطر {$assessment['score']}/100 (مستوى {$assessment['level']})."
            .($factors !== '' ? " العوامل: {$factors}." : '')
            .($patterns > 0 ? " أنماط تواطؤ محتملة: {$patterns}." : '')
            .($assessment['score'] >= FraudMonitorService::FREEZE_THRESHOLD
                ? ' يُنصح بالتجميد الفوري والتحقيق.'
                : ($assessment['score'] >= 60 ? ' يُنصح بالمراجعة اليدوية.' : ' ضمن الحدود الآمنة.'));

        if (! $this->gpt->isEnabled()) {
            return $rule;
        }

        return Safely::value(function () use ($assessment) {
            $json = json_encode($assessment, JSON_UNESCAPED_UNICODE);
            $result = $this->gpt->chat([
                ['role' => 'system', 'content' => 'أنت محلّل سلامة لمنصة نقل جامعي. لخّص خطورة الحساب بالعربية في جملتين مع توصية إجراء واضحة.'],
                ['role' => 'user', 'content' => "تقييم الخطر (JSON): {$json}"],
            ], ['temperature' => 0.2, 'max_tokens' => 200]);

            return $result->stub || trim($result->content) === '' ? null : trim($result->content);
        }, default: $rule, context: 'ai.risk_narrative') ?? $rule;
    }
}
