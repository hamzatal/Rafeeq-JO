<?php

namespace Rafeeq\Modules\Payments\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Rafeeq\Modules\Payments\Models\Payment;
use Rafeeq\Modules\Payments\Services\PaymentService;
use Rafeeq\Shared\Enums\PaymentStatus;

/**
 * Runs the slow GPT-Vision verification for an uploaded CliQ proof off the HTTP
 * request. On the `sync` queue driver it executes inline (tests / no worker).
 */
class VerifyPaymentProofJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** GPT-Vision can be slow; allow generous time before the job times out. */
    public int $timeout = 120;

    public int $tries = 2;

    public function __construct(public string $paymentId) {}

    public function handle(PaymentService $payments): void
    {
        $payment = Payment::find($this->paymentId);
        if ($payment && $payment->status === 'verifying') {
            $payments->runVerification($payment);
        }
    }

    /** If the job ultimately fails, don't leave the payment stuck in "verifying". */
    public function failed(\Throwable $e): void
    {
        $payment = Payment::find($this->paymentId);
        if ($payment && $payment->status === 'verifying') {
            $payment->forceFill(['status' => 'manual_review'])->save();
            $payment->request()->first()?->forceFill(['status' => PaymentStatus::UnderReview])->save();
        }
    }
}
