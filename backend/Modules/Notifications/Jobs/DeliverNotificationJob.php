<?php

namespace Rafeeq\Modules\Notifications\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Rafeeq\Modules\Notifications\Services\NotificationService;

/**
 * Delivers a notification's external channels (push + critical SMS fallback) off
 * the HTTP request. The in-app record is already created synchronously; this only
 * handles the slow outbound FCM/SMS calls. Runs inline on the `sync` driver.
 */
class DeliverNotificationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 2;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        public string $userId,
        public string $typeValue,
        public string $title,
        public string $body,
        public array $data,
        public bool $wantsPush,
        public bool $wantsSmsFallback,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $notifications->deliverExternal(
            $this->userId,
            $this->typeValue,
            $this->title,
            $this->body,
            $this->data,
            $this->wantsPush,
            $this->wantsSmsFallback,
        );
    }

    /**
     * 3.10 — record WHY a delivery gave up.
     *
     * Without this the row in `failed_jobs` holds a serialised closure and a stack
     * trace, and answering "did this rider ever get told their trip was cancelled?"
     * means unserialising a payload by hand. The notification TYPE and the recipient
     * are the two facts an operator needs, and neither survives otherwise.
     *
     * The body is not logged. A critical notification falls back to SMS, so its text
     * can name a person or a place, and a log is a much wider audience than the one
     * recipient it was written for.
     */
    public function failed(?\Throwable $e): void
    {
        Log::error('notifications.delivery_failed', [
            'user_id' => $this->userId,
            'type' => $this->typeValue,
            'wanted_push' => $this->wantsPush,
            'wanted_sms' => $this->wantsSmsFallback,
            'attempts' => $this->attempts(),
            'error' => $e?->getMessage(),
        ]);
    }
}
