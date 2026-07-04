<?php

namespace Rafeeq\Modules\Reports\Services;

use Rafeeq\Modules\Complaints\Models\Complaint;
use Rafeeq\Modules\Disputes\Models\Dispute;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Payments\Models\PaymentRequest;
use Rafeeq\Modules\Payouts\Models\PayoutRequest;
use Rafeeq\Modules\Safety\Models\SosIncident;
use Rafeeq\Modules\Support\Models\SupportTicket;
use Rafeeq\Shared\Enums\ComplaintStatus;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\PaymentStatus;
use Rafeeq\Shared\Enums\TicketStatus;

/**
 * Admin "command center" data: how many items are waiting for a human action
 * right now (drives the sidebar red badges) + a recent activity feed (drives the
 * dashboard "what's new" panel). Every query is defensive so a single failing
 * module never breaks the whole overview.
 */
class OverviewService
{
    /** Counts of items that need admin attention — keyed to match sidebar routes. */
    public function counts(): array
    {
        return [
            // New captains that submitted their documents and await review.
            'drivers_pending' => $this->safe(fn () => DriverProfile::query()
                ->where('status', DriverStatus::UnderReview->value)->count()),
            // Wallet top-up requests with a proof uploaded, awaiting verification.
            'payments_pending' => $this->safe(fn () => PaymentRequest::query()
                ->whereIn('status', [PaymentStatus::Submitted->value, PaymentStatus::UnderReview->value])->count()),
            // Captain withdrawal requests awaiting payout.
            'withdrawals_pending' => $this->safe(fn () => PayoutRequest::query()
                ->where('status', PayoutRequest::STATUS_PENDING)->count()),
            // Complaints still needing handling.
            'complaints_open' => $this->safe(fn () => Complaint::query()
                ->whereIn('status', [ComplaintStatus::Open->value, ComplaintStatus::Investigating->value])->count()),
            // Financial disputes still open.
            'disputes_open' => $this->safe(fn () => Dispute::query()
                ->whereIn('status', ['open', 'investigating'])->count()),
            // Support tickets awaiting staff.
            'support_open' => $this->safe(fn () => SupportTicket::query()
                ->whereIn('status', [TicketStatus::Open->value, TicketStatus::Escalated->value])->count()),
            // Live SOS incidents not yet resolved.
            'sos_active' => $this->safe(fn () => SosIncident::query()
                ->whereNull('resolved_at')->count()),
        ];
    }

    /**
     * A merged, newest-first feed of things that just happened and may need
     * attention. Each entry: { type, id, at (ISO8601), href }.
     */
    public function activity(int $limit = 12): array
    {
        $items = [];

        $push = function (string $type, string $href, $rows) use (&$items) {
            foreach ($rows as $r) {
                $items[] = [
                    'type' => $type,
                    'id' => (string) $r->id,
                    'at' => optional($r->created_at)->toIso8601String(),
                    'href' => $href,
                ];
            }
        };

        $this->safe(fn () => $push(
            'driver_pending',
            '/drivers',
            DriverProfile::query()->where('status', DriverStatus::UnderReview->value)
                ->latest()->limit($limit)->get(['id', 'created_at']),
        ));
        $this->safe(fn () => $push(
            'payment_pending',
            '/payments',
            PaymentRequest::query()->whereIn('status', [PaymentStatus::Submitted->value, PaymentStatus::UnderReview->value])
                ->latest()->limit($limit)->get(['id', 'created_at']),
        ));
        $this->safe(fn () => $push(
            'withdrawal_pending',
            '/withdrawals',
            PayoutRequest::query()->where('status', PayoutRequest::STATUS_PENDING)
                ->latest()->limit($limit)->get(['id', 'created_at']),
        ));
        $this->safe(fn () => $push(
            'complaint_open',
            '/complaints',
            Complaint::query()->whereIn('status', [ComplaintStatus::Open->value, ComplaintStatus::Investigating->value])
                ->latest()->limit($limit)->get(['id', 'created_at']),
        ));
        $this->safe(fn () => $push(
            'sos_active',
            '/safety',
            SosIncident::query()->whereNull('resolved_at')
                ->latest()->limit($limit)->get(['id', 'created_at']),
        ));

        // Newest first, then cap.
        usort($items, fn ($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        return array_slice($items, 0, $limit);
    }

    /** Run a query defensively; a failure (e.g. missing table in a partial env) yields 0/[]. */
    private function safe(callable $fn)
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return 0;
        }
    }
}
