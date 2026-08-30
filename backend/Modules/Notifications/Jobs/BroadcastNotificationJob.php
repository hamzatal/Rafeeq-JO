<?php

namespace Rafeeq\Modules\Notifications\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Notifications\Support\BroadcastAudience;

/**
 * Fan-out an admin broadcast to a (potentially large) audience off the request
 * cycle. The HTTP request returns immediately with an estimated audience size;
 * the actual per-user delivery happens here, chunked, on the queue worker.
 *
 * Each individual delivery is best-effort inside NotificationService (never
 * throws), so one bad recipient can't fail the whole batch.
 */
class BroadcastNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Give large fan-outs room to finish; retry the whole batch a couple times. */
    public int $timeout = 600;

    public int $tries = 3;

    /**
     * One id for the whole broadcast, generated once and serialised with the job.
     *
     * ── Why it matters that this is in the CONSTRUCTOR ─────────────────────────
     *
     * `tries = 3` on a job that walks its audience with `chunkById` and inserts a row
     * per user means a job dying at recipient 6,000 of 10,000 is retried **from the
     * first recipient** — and the first 6,000 receive the same announcement again.
     * Then a third time.
     *
     * Laravel serialises the constructed job and deserialises the SAME payload for
     * every attempt, so an id assigned here is stable across retries. Assigning it in
     * `handle()` would give each attempt a fresh one and change nothing.
     *
     * `notify()` turns it into `(user_id, dedupe_key)`, which carries a unique index —
     * so attempt two skips exactly the users attempt one reached and finishes the rest.
     * Retrying is the right behaviour; retrying without re-delivering is what was
     * missing.
     */
    private readonly string $dedupeKey;

    /**
     * @param  array<string, mixed>  $audience  A serialised `BroadcastAudience`.
     * @param  array<string, mixed>  $data
     */
    public function __construct(
        private readonly array $audience,
        private readonly string $title,
        private readonly string $body,
        private readonly array $data = [],
    ) {
        $this->dedupeKey = 'bcast:'.Str::uuid()->toString();
    }

    public function handle(NotificationService $notifications): void
    {
        /*
         * The audience query is resolved by `BroadcastAudience`, not rebuilt here.
         * This job used to carry its own copy of the `match` — the same one the
         * controller used to compute the count the operator was shown — and the copies
         * had already drifted apart on whether banned users were included.
         */
        $query = BroadcastAudience::fromArray($this->audience)->query();

        $sent = 0;
        $chunk = max(1, (int) config('rafeeq.broadcast_chunk', 200));

        $query->select(['id', 'type', 'status'])->chunkById($chunk, function ($users) use (&$sent, $notifications) {
            $sent += $notifications->broadcast($users, $this->title, $this->body, $this->data, $this->dedupeKey);
        });

        Log::info('[Notifications] broadcast delivered', [
            'audience' => BroadcastAudience::fromArray($this->audience)->describe(),
            'dedupe_key' => $this->dedupeKey,
            'sent' => $sent,
            'attempt' => $this->attempts(),
        ]);
    }

    /**
     * 3.10 — a broadcast that died is a broadcast someone believes went out.
     *
     * Retries are now safe (see `$dedupeKey`), so this is no longer a duplicate-
     * delivery warning — it is the record that some recipients were never reached at
     * all. Logged with the audience so the blast radius is visible, and with the
     * dedupe key so a manual re-send can be matched against what already went out.
     * The title only, never the body.
     */
    public function failed(?\Throwable $e): void
    {
        Log::error('notifications.broadcast_failed', [
            'audience' => BroadcastAudience::fromArray($this->audience)->describe(),
            'dedupe_key' => $this->dedupeKey,
            'title' => $this->title,
            'attempts' => $this->attempts(),
            'error' => $e?->getMessage(),
        ]);
    }
}
