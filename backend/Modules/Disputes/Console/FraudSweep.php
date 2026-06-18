<?php

namespace Rafeeq\Modules\Disputes\Console;

use Illuminate\Console\Command;
use Rafeeq\Modules\Disputes\Services\DisputeService;

/**
 * Periodic anti-fraud sweep: re-assesses the highest-risk accounts and
 * auto-freezes + opens investigation cases for any that crossed the threshold.
 * Scheduled in routes/console.php.
 */
class FraudSweep extends Command
{
    protected $signature = 'rafeeq:fraud-sweep {--limit=20 : How many top-risk accounts to evaluate}';

    protected $description = 'Re-assess top-risk accounts; auto-freeze + open dispute cases above threshold.';

    public function handle(DisputeService $disputes): int
    {
        $limit = (int) $this->option('limit');
        $results = $disputes->sweep($limit);

        $frozen = count(array_filter($results, fn ($r) => $r['frozen']));
        $opened = count(array_filter($results, fn ($r) => $r['dispute'] !== null));

        $this->info("Fraud sweep: evaluated ".count($results)." account(s), opened {$opened} case(s), froze {$frozen}.");

        return self::SUCCESS;
    }
}
