<?php

namespace Rafeeq\Core\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Rafeeq\Core\Support\Clock;

/**
 * Prove the queue is actually usable, and complain about failed jobs.
 *
 * 3.10 — the worker's healthcheck was `php artisan queue:monitor default --max=10000
 * || exit 0`. That `|| exit 0` made it incapable of ever failing: the worker could be
 * dead, Redis could be unreachable, and the container would still report healthy. A
 * healthcheck that cannot fail is worse than no healthcheck, because it is believed.
 *
 * And nothing watched `failed_jobs`. A job failing repeatedly in silence is how a
 * notification backlog builds for a week, or a payout sits unprocessed — the kind of
 * failure whose first symptom is a customer complaint.
 *
 *   php artisan rafeeq:worker-alive                     # healthcheck: connectivity
 *   php artisan rafeeq:worker-alive --alert-on-failures # hourly: failed-job alarm
 */
class WorkerAliveCommand extends Command
{
    protected $signature = 'rafeeq:worker-alive
        {--alert-on-failures : Exit non-zero when failed jobs exceed the threshold}';

    protected $description = 'Verify the queue backend is reachable, and alarm on failed jobs.';

    public function handle(): int
    {
        // Connectivity first: this is the thing that actually breaks, and the thing
        // `queue:monitor` does not prove — it reports depth, and a depth of zero looks
        // identical whether the queue is empty or unreachable.
        try {
            Redis::connection()->ping();
        } catch (\Throwable $e) {
            $this->error('queue backend unreachable: '.$e->getMessage());

            return self::FAILURE;
        }

        if (! $this->option('alert-on-failures')) {
            $this->info('queue backend reachable');

            return self::SUCCESS;
        }

        $threshold = (int) config('rafeeq.failed_jobs_alert_threshold', 10);
        $recentWindow = Clock::now()->subHours(24);

        $total = DB::table('failed_jobs')->count();
        $recent = DB::table('failed_jobs')->where('failed_at', '>=', $recentWindow)->count();

        $this->line("failed jobs: {$total} total, {$recent} in the last 24h (threshold {$threshold})");

        if ($recent >= $threshold) {
            // Logged at error level so whatever ships logs raises it — the scheduler
            // also mails on non-zero exit.
            Log::error('queue.failed_jobs_over_threshold', [
                'recent_24h' => $recent,
                'total' => $total,
                'threshold' => $threshold,
                'top_queues' => DB::table('failed_jobs')
                    ->where('failed_at', '>=', $recentWindow)
                    ->selectRaw('queue, count(*) as n')
                    ->groupBy('queue')->orderByDesc('n')->limit(5)
                    ->pluck('n', 'queue')->all(),
            ]);

            $this->error("{$recent} job(s) failed in the last 24h — over the threshold of {$threshold}.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
