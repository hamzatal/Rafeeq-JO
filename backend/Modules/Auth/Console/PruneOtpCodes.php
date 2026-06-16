<?php

namespace Rafeeq\Modules\Auth\Console;

use Illuminate\Console\Command;
use Rafeeq\Modules\Auth\Models\OtpCode;

class PruneOtpCodes extends Command
{
    protected $signature = 'rafeeq:prune-otps {--hours=24 : Delete consumed/expired codes older than this}';

    protected $description = 'Delete consumed or expired OTP codes to keep the table small.';

    public function handle(): int
    {
        $cutoff = now()->subHours((int) $this->option('hours'));

        $deleted = OtpCode::query()
            ->where(function ($q) {
                $q->whereNotNull('consumed_at')->orWhere('expires_at', '<', now());
            })
            ->where('created_at', '<', $cutoff)
            ->delete();

        $this->info("Pruned {$deleted} OTP code(s).");

        return self::SUCCESS;
    }
}
