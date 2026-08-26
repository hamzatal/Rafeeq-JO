<?php

namespace Rafeeq\Modules\Subscriptions\Console;

use Illuminate\Console\Command;
use Rafeeq\Core\Support\Clock;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Shared\Enums\SubscriptionStatus;

/**
 * Close subscriptions whose window has ended.
 *
 * 3.7 — there was no such job, so a subscription stayed `active` forever once its
 * `ends_at` passed. That is not cosmetic: every report and every eligibility check that
 * reads `status = 'active'` was wrong, and a rider could keep boarding on a subscription
 * that ended in March.
 *
 * `endOfDay` on purpose: a plan sold "until the 30th" is understood by the buyer as
 * including the 30th, and expiring it at 00:00 on the 30th takes a day they paid for.
 */
class ExpireSubscriptions extends Command
{
    protected $signature = 'rafeeq:expire-subscriptions {--dry-run}';

    protected $description = 'Mark subscriptions whose window has closed as expired.';

    public function handle(): int
    {
        $cutoff = Clock::now()->startOfDay();
        $dry = (bool) $this->option('dry-run');

        $query = Subscription::query()
            ->where('status', SubscriptionStatus::Active->value)
            ->whereNotNull('ends_at')
            // Ends BEFORE today's start, i.e. the whole of its last day has passed.
            ->where('ends_at', '<', $cutoff);

        if ($dry) {
            $this->info("Would expire {$query->count()} subscription(s).");

            return self::SUCCESS;
        }

        $expired = 0;
        $query->chunkById(500, function ($subs) use (&$expired) {
            foreach ($subs as $sub) {
                $sub->forceFill(['status' => SubscriptionStatus::Expired->value])->save();
                $expired++;
            }
        });

        $this->info("Expired {$expired} subscription(s).");

        return self::SUCCESS;
    }
}
