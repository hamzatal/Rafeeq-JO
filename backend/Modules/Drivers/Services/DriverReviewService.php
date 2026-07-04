<?php

namespace Rafeeq\Modules\Drivers\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Shared\Enums\DocumentStatus;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\NotificationType;

class DriverReviewService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
    ) {}

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

        // Tell the captain their account is live so they know to start working.
        if ($driver->user) {
            $this->notifications->notify(
                $driver->user,
                NotificationType::DriverApproved,
                'تم اعتماد حسابك 🎉',
                'صار حسابك مفعّلاً. تقدر تبدأ استقبال الرحلات الآن — فعّل حالة "متصل" لتصلك العروض.',
                ['kind' => 'driver_review', 'status' => 'approved'],
            );
        }

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

        // Let the captain know, with the reason, so they can fix and resubmit.
        if ($driver->user) {
            $this->notifications->notify(
                $driver->user,
                NotificationType::DriverRejected,
                'لم يتم اعتماد حسابك',
                $note !== '' ? "السبب: {$note}. عدّل وثائقك وأعد الإرسال." : 'يرجى مراجعة وثائقك وإعادة إرسالها.',
                ['kind' => 'driver_review', 'status' => 'rejected'],
            );
        }

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
}
