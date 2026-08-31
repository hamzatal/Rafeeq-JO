<?php

namespace Rafeeq\Modules\Drivers\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Shared\Enums\DocumentStatus;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Enums\DriverStatus;

class DriverReviewService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** Approve a driver — requires all mandatory documents to be approved. */
    public function approve(DriverProfile $driver, User $reviewer, ?string $note = null): DriverProfile
    {
        $driver->load('documents');

        foreach (DocumentType::requiredForApproval() as $type) {
            $doc = $driver->documents->firstWhere('type', $type);
            if (! $doc || $doc->status !== DocumentStatus::Approved) {
                throw new BusinessRuleException(
                    "لا يمكن الاعتماد قبل قبول وثيقة: {$type->labelAr()}",
                    'DOCUMENTS_NOT_APPROVED',
                );
            }
        }

        $driver->forceFill([
            'status' => DriverStatus::Approved,
            'reviewed_by' => $reviewer->id,
            'review_note' => $note,
            'verification_level' => max($driver->verification_level, 3),
        ])->save();

        $this->audit->log('driver.approved', $reviewer, auditable: $driver);

        return $driver->fresh();
    }

    public function reject(DriverProfile $driver, User $reviewer, string $note): DriverProfile
    {
        $driver->forceFill([
            'status' => DriverStatus::Rejected,
            'reviewed_by' => $reviewer->id,
            'review_note' => $note,
        ])->save();

        $this->audit->log('driver.rejected', $reviewer, auditable: $driver);

        return $driver->fresh();
    }

    public function suspend(DriverProfile $driver, User $reviewer, string $note): DriverProfile
    {
        $driver->forceFill([
            'status' => DriverStatus::Suspended,
            'reviewed_by' => $reviewer->id,
            'review_note' => $note,
        ])->save();

        $this->audit->log('driver.suspended', $reviewer, auditable: $driver);

        return $driver->fresh();
    }

    /**
     * Fleet-wide aggregates for the four cards above the captain queue.
     *
     * ── Why every field here has a denominator ────────────────────────────────
     *
     * The approved screen 35 captions read «89% من الإجمالي» and «أقدم طلب قبل 3
     * أيام» — a share and an age, not bare counts. A card that shows «112» with a
     * progress bar and no divisor is a bar filled to an invented fraction, which is
     * what an earlier revision of this dashboard actually shipped.
     *
     * So: `total` is the divisor for the three status counts, `rated_count` is the
     * divisor behind the mean (a 4.7 average over two ratings is not the same claim
     * as one over two thousand), and `oldest_pending_at` is a timestamp the caller
     * turns into an age. `rating_avg` is null — not 0.0 — when nobody has been rated,
     * because a zero average would read as a fleet that is failing.
     *
     * Three cheap aggregate queries, not a scan: `count(*) GROUP BY status`, one
     * `avg`, one `min`.
     */
    public function fleetStats(): array
    {
        $counts = DriverProfile::query()
            ->selectRaw('status, count(*) as tally')
            ->groupBy('status')
            ->pluck('tally', 'status');

        $rated = DriverProfile::query()->where('rating_count', '>', 0);
        $ratedCount = (clone $rated)->count();
        $average = $ratedCount > 0 ? (clone $rated)->avg('rating_avg') : null;

        $waiting = [DriverStatus::Pending->value, DriverStatus::UnderReview->value];

        return [
            'total' => (int) $counts->sum(),
            'by_status' => collect(DriverStatus::cases())
                ->mapWithKeys(fn (DriverStatus $s) => [$s->value => (int) ($counts[$s->value] ?? 0)])
                ->all(),
            'rating_avg' => $average === null ? null : round((float) $average, 2),
            'rated_count' => $ratedCount,
            'oldest_pending_at' => DriverProfile::query()
                ->whereIn('status', $waiting)
                ->whereNotNull('submitted_at')
                ->min('submitted_at'),
            /* The «ناقص N» pill needs to know what N counts against. */
            'required_documents' => count(DocumentType::requiredForApproval()),
        ];
    }
}
