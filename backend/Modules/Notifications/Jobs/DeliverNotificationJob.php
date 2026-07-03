<?php

namespace Rafeeq\Modules\Notifications\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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
}
