<?php

namespace Rafeeq\Core\Retention;

use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Rafeeq\Core\Support\Clock;

/**
 * One command that enforces every retention promise.
 *
 * Before this, four of the six commitments in the privacy notice had no
 * implementation at all, and `driver_locations` — a captain's movement history
 * OUTSIDE any trip — had none whatsoever, so it grew forever. Splitting the work
 * across nine hand-written commands is how that happens: each one is a place for a
 * promise to be forgotten.
 *
 * So the periods live in RetentionPolicy, this command reads them, and
 * `rafeeq:retention-report` prints what is actually enforced. A promise the code
 * cannot show you is not a promise.
 *
 *   php artisan rafeeq:prune-retention                 # everything due
 *   php artisan rafeeq:prune-retention --only=audit_logs
 *   php artisan rafeeq:prune-retention --dry-run       # counts, deletes nothing
 */
class PruneRetentionCommand extends Command
{
    protected $signature = 'rafeeq:prune-retention
        {--only= : Run a single policy key}
        {--dry-run : Report what would be deleted without deleting it}';

    protected $description = 'Enforce every data-retention policy (see Core\Retention\RetentionPolicy).';

    /** Deleted in batches so a large backlog cannot hold a lock or exhaust memory. */
    private const BATCH = 2000;

    public function handle(): int
    {
        $only = $this->option('only');
        $dry = (bool) $this->option('dry-run');
        $policies = RetentionPolicy::all();

        if ($only !== null && ! isset($policies[$only])) {
            $this->error("No policy named '{$only}'. Known: ".implode(', ', array_keys($policies)));

            return self::FAILURE;
        }

        $total = 0;
        $rows = [];

        foreach ($policies as $key => $policy) {
            if ($only !== null && $key !== $only) {
                continue;
            }

            $cutoff = Clock::now()->subDays($policy['days']);
            $deleted = $dry
                ? $this->count($key, $cutoff)
                : $this->prune($key, $cutoff);

            $total += $deleted;
            $rows[] = [$key, $policy['days'].'d', number_format($deleted)];
        }

        $this->table(['policy', 'keeps', $dry ? 'would delete' : 'deleted'], $rows);

        if (! $dry && $total > 0) {
            // Logged, because a retention run that nobody can evidence is not evidence.
            Log::info('retention.pruned', ['total' => $total, 'at' => Clock::now()->toIso8601String()]);
        }

        return self::SUCCESS;
    }

    private function count(string $key, \DateTimeInterface $cutoff): int
    {
        return match ($key) {
            'audit_logs' => $this->auditQuery($cutoff)->count(),
            'driver_documents_rejected' => $this->rejectedDocsQuery($cutoff)->count(),
            'rafeeq_notifications' => $this->notificationsQuery($cutoff)->count(),
            'trip_tracking' => $this->trackingQuery($cutoff)->count(),
            'risk_flags' => $this->riskFlagsQuery($cutoff)->count(),
            default => DB::table(RetentionPolicy::all()[$key]['table'])
                ->where(RetentionPolicy::column($key), '<', $cutoff)->count(),
        };
    }

    private function prune(string $key, \DateTimeInterface $cutoff): int
    {
        return match ($key) {
            'audit_logs' => $this->deleteInBatches(fn () => $this->auditQuery($cutoff)),
            'driver_documents_rejected' => $this->pruneRejectedDocuments($cutoff),
            'rafeeq_notifications' => $this->deleteInBatches(fn () => $this->notificationsQuery($cutoff)),
            'trip_tracking' => $this->deleteInBatches(fn () => $this->trackingQuery($cutoff)),
            'risk_flags' => $this->deleteInBatches(fn () => $this->riskFlagsQuery($cutoff)),
            default => $this->deleteInBatches(fn () => DB::table(RetentionPolicy::all()[$key]['table'])
                ->where(RetentionPolicy::column($key), '<', $cutoff)),
        };
    }

    /**
     * Audit entries that document MONEY are exempt.
     *
     * Trimming the audit trail of a wallet movement or a payout would destroy the only
     * defence in a later dispute, and the statutory retention period for accounting
     * records is longer than this window. So the filter is on the action, not the date
     * alone — which is why this cannot be a generic `where created_at <`.
     */
    private function auditQuery(\DateTimeInterface $cutoff): Builder
    {
        $q = DB::table('audit_logs')->where('created_at', '<', $cutoff);

        foreach (RetentionPolicy::exemptAuditPrefixes() as $prefix) {
            $q->where('action', 'not like', $prefix.'%');
        }

        return $q;
    }

    /** Read notifications go sooner than unread ones — an unread one may still matter. */
    private function notificationsQuery(\DateTimeInterface $cutoff): Builder
    {
        return DB::table('rafeeq_notifications')
            ->where(function ($q) use ($cutoff) {
                $q->where('created_at', '<', $cutoff)
                    ->orWhere(fn ($q2) => $q2->whereNotNull('read_at')
                        ->where('read_at', '<', Clock::now()->subDays(14)));
            });
    }

    /**
     * Tracking points for finished trips — AND for trips that are stuck.
     *
     * The old command filtered on `Completed|Cancelled` only, so a trip left in
     * `Started` because a captain closed the app kept its GPS trail permanently. That
     * is the exact case where the data is least justified and most sensitive.
     */
    private function trackingQuery(\DateTimeInterface $cutoff): Builder
    {
        return DB::table('trip_tracking')
            ->whereIn('trip_id', function ($q) use ($cutoff) {
                $q->select('id')->from('trips')
                    ->where(function ($t) use ($cutoff) {
                        $t->whereIn('status', ['completed', 'cancelled'])
                            ->where('updated_at', '<', $cutoff)
                            // Stranded: never finished, and untouched for the window.
                            ->orWhere(fn ($s) => $s->whereNotIn('status', ['completed', 'cancelled'])
                                ->where('updated_at', '<', $cutoff));
                    });
            });
    }

    /**
     * Resolved risk flags only. An UNRESOLVED flag is an open fraud case, and deleting
     * it because it aged would close an investigation by timeout.
     */
    private function riskFlagsQuery(\DateTimeInterface $cutoff): Builder
    {
        return DB::table('risk_flags')
            ->whereNotNull('resolved_at')
            ->where('created_at', '<', $cutoff);
    }

    private function rejectedDocsQuery(\DateTimeInterface $cutoff): Builder
    {
        return DB::table('driver_documents')
            ->where('status', 'rejected')
            ->where('updated_at', '<', $cutoff);
    }

    /**
     * Rejected identity documents: the FILE first, then the row.
     *
     * These are the most sensitive files in the system — national ID, licence,
     * insurance, criminal record certificate — and they were never deleted, not on
     * rejection and not on resignation. The file goes first because a row without a
     * file is a bookkeeping gap, while a file without a row is an orphan nobody will
     * ever find again.
     */
    private function pruneRejectedDocuments(\DateTimeInterface $cutoff): int
    {
        $disk = Storage::disk(config('filesystems.default'));
        $deleted = 0;

        $this->rejectedDocsQuery($cutoff)
            ->select('id', 'file_path')
            ->orderBy('id')
            ->chunk(500, function ($docs) use (&$deleted, $disk) {
                foreach ($docs as $doc) {
                    if ($doc->file_path) {
                        $disk->delete($doc->file_path);
                    }
                }
                $deleted += DB::table('driver_documents')
                    ->whereIn('id', collect($docs)->pluck('id'))->delete();
            });

        return $deleted;
    }

    /**
     * Delete in bounded batches.
     *
     * A single unbounded DELETE on a table that has never been pruned can lock it for
     * minutes and blow the memory limit. The callback rebuilds the query each round
     * because the previous batch changed what matches.
     */
    private function deleteInBatches(callable $query): int
    {
        $total = 0;

        do {
            $ids = $query()->limit(self::BATCH)->pluck('id');
            if ($ids->isEmpty()) {
                break;
            }

            // Delete by primary key: the filter may involve a subquery, and deleting
            // through one is both slower and driver-dependent.
            $table = $query()->from;
            $total += DB::table($table)->whereIn('id', $ids)->delete();
        } while ($ids->count() === self::BATCH);

        return $total;
    }
}
