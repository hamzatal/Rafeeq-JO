<?php

namespace Rafeeq\Modules\Payments\AI;

use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\Payments\Models\PaymentRequest;

/**
 * Verifies an uploaded CliQ transfer notification against the expected
 * payment request using GPT Vision.
 *
 * The model is asked to extract: amount, transfer time, reference, and
 * beneficiary, then we compare the extracted amount with the expected one
 * to produce a decision:
 *   - matched:       extracted amount == expected (within tolerance) & high confidence
 *   - mismatch:      amount clearly differs
 *   - manual_review: AI unavailable / low confidence / unreadable
 *
 * Without an OpenAI key the GptClient is the NullGptClient, so this always
 * returns manual_review — the platform stays fully functional via the
 * human review queue.
 */
class PaymentVerificationService
{
    /** Accept tiny rounding differences (in fils). */
    private const AMOUNT_TOLERANCE_FILS = 0;

    public function __construct(private readonly GptClient $gpt) {}

    /**
     * @return array{
     *   decision: string,
     *   confidence: int,
     *   verified_by: string,
     *   extracted: array<string, mixed>,
     *   available: bool
     * }
     */
    public function verify(PaymentRequest $request, string $imageUrl): array
    {
        if (! $this->gpt->isEnabled()) {
            return $this->manual(['available' => false]);
        }

        $expectedJod = round($request->amount_fils / 1000, 3);

        $prompt = <<<PROMPT
        You are a payment verification assistant for a Jordanian ride platform that accepts CliQ bank transfers.
        Analyse the attached transfer-notification screenshot and reply with a STRICT JSON object only, no prose.

        Expected payment:
        - amount: {$expectedJod} JOD
        - reference: {$request->number}

        Return JSON with these keys:
        {
          "amount_jod": number|null,        // amount detected in the image, in JOD
          "transferred_at": string|null,    // ISO-8601 if a date/time is visible
          "reference": string|null,         // any reference / note text found
          "beneficiary": string|null,       // recipient name/alias if visible
          "is_cliq": boolean,               // does it look like a CliQ/bank transfer receipt
          "amount_matches": boolean,        // does the detected amount equal the expected amount
          "confidence": number              // 0..100 your confidence in this reading
        }
        PROMPT;

        try {
            $result = $this->gpt->vision($prompt, $imageUrl, ['json' => true, 'max_tokens' => 500]);
        } catch (\Throwable $e) {
            Log::warning('[PaymentVerification] vision failed', ['request' => $request->id, 'error' => $e->getMessage()]);

            return $this->manual(['available' => true, 'error' => 'vision_failed']);
        }

        $data = $result->json();
        if (! is_array($data)) {
            return $this->manual(['available' => true, 'error' => 'unparseable']);
        }

        $confidence = (int) max(0, min(100, (int) ($data['confidence'] ?? 0)));
        $detectedFils = isset($data['amount_jod']) && is_numeric($data['amount_jod'])
            ? (int) round(((float) $data['amount_jod']) * 1000)
            : null;

        $extracted = [
            'amount_fils' => $detectedFils,
            'transferred_at' => $data['transferred_at'] ?? null,
            'reference' => $data['reference'] ?? null,
            'beneficiary' => $data['beneficiary'] ?? null,
            'is_cliq' => (bool) ($data['is_cliq'] ?? false),
            'raw' => $data,
        ];

        // Decide.
        $amountOk = $detectedFils !== null
            && abs($detectedFils - $request->amount_fils) <= self::AMOUNT_TOLERANCE_FILS;

        if ($confidence >= 80 && $amountOk && ($data['is_cliq'] ?? false)) {
            $decision = 'matched';
        } elseif ($detectedFils !== null && ! $amountOk && $confidence >= 70) {
            $decision = 'mismatch';
        } else {
            $decision = 'manual_review';
        }

        return [
            'decision' => $decision,
            'confidence' => $confidence,
            'verified_by' => 'ai',
            'extracted' => $extracted,
            'available' => true,
        ];
    }

    /** @param array<string, mixed> $extra */
    private function manual(array $extra = []): array
    {
        return [
            'decision' => 'manual_review',
            'confidence' => 0,
            'verified_by' => 'ai',
            'extracted' => $extra,
            'available' => $extra['available'] ?? false,
        ];
    }
}
