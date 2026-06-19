<?php

namespace Rafeeq\Modules\Payments\AI;

use Illuminate\Support\Facades\Log;
use Rafeeq\Infrastructure\Gpt\Contracts\GptClient;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Settings\Services\SettingService;

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

    public function __construct(
        private readonly GptClient $gpt,
        private readonly SettingService $settings,
    ) {}

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
        $expectedName = trim((string) ($request->user?->full_name ?? ''));
        $expectedAlias = trim((string) ($this->settings->cliq()['alias'] ?? ''));

        $prompt = <<<PROMPT
        You are a payment verification assistant for a Jordanian ride platform that accepts CliQ bank transfers.
        Analyse the attached transfer-notification screenshot and reply with a STRICT JSON object only, no prose.

        Expected payment:
        - amount: {$expectedJod} JOD
        - reference: {$request->number}
        - sender full name (account holder): {$expectedName}
        - our beneficiary CliQ alias (the money must be sent TO this): {$expectedAlias}

        Return JSON with these keys:
        {
          "amount_jod": number|null,        // amount detected in the image, in JOD
          "transferred_at": string|null,    // ISO-8601 if a date/time is visible
          "reference": string|null,         // the note/reference the SENDER wrote (should match our reference)
          "bank_reference": string|null,    // the BANK transaction/reference id printed on the receipt (unique per transfer)
          "beneficiary": string|null,       // recipient name/alias as printed
          "beneficiary_matches": boolean,   // does the recipient/alias match our beneficiary alias above
          "sender_name": string|null,       // the SENDER's name as printed on the receipt
          "name_matches": boolean,          // does the sender name reasonably match the expected full name
                                            // (allow Arabic/English transliteration & partial first+last match)
          "is_cliq": boolean,               // does it look like a genuine CliQ/bank transfer receipt
          "looks_edited": boolean,          // any sign of tampering/editing of the screenshot
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
            'bank_reference' => isset($data['bank_reference']) ? (string) $data['bank_reference'] : null,
            'beneficiary' => $data['beneficiary'] ?? null,
            'beneficiary_matches' => array_key_exists('beneficiary_matches', $data) ? (bool) $data['beneficiary_matches'] : null,
            'sender_name' => $data['sender_name'] ?? null,
            'name_matches' => array_key_exists('name_matches', $data) ? (bool) $data['name_matches'] : null,
            'looks_edited' => array_key_exists('looks_edited', $data) ? (bool) $data['looks_edited'] : null,
            'is_cliq' => (bool) ($data['is_cliq'] ?? false),
            'raw' => $data,
        ];

        // Decide.
        $amountOk = $detectedFils !== null
            && abs($detectedFils - $request->amount_fils) <= self::AMOUNT_TOLERANCE_FILS;

        // Each check only gates when we have the expected value AND the model
        // returned a verdict; otherwise it is neutral (a human confirms).
        $nameKnown = $expectedName !== '' && array_key_exists('name_matches', $data);
        $nameOk = ! $nameKnown || (bool) $data['name_matches'];

        $aliasKnown = $expectedAlias !== '' && array_key_exists('beneficiary_matches', $data);
        $aliasOk = ! $aliasKnown || (bool) $data['beneficiary_matches'];

        $edited = (bool) ($data['looks_edited'] ?? false);

        if ($confidence >= 80 && $amountOk && $nameOk && $aliasOk && ! $edited && ($data['is_cliq'] ?? false)) {
            $decision = 'matched';
        } elseif ($detectedFils !== null && ! $amountOk && $confidence >= 70) {
            $decision = 'mismatch';
        } else {
            // Amount matches but name/beneficiary mismatch, or edited/low-confidence
            // -> never auto-approve; route to a human reviewer.
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
