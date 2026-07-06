<?php

namespace Rafeeq\Modules\Drivers\Services;

use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Enums\DriverStatus;

class DriverService extends BaseService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function forUser(User $user): DriverProfile
    {
        return DriverProfile::firstOrCreate(['user_id' => $user->id]);
    }

    public function updateProfile(User $user, array $data): DriverProfile
    {
        $profile = $this->forUser($user);

        if (in_array($profile->status, [DriverStatus::Approved, DriverStatus::UnderReview], true)
            && array_key_exists('national_id', $data)) {
            throw new BusinessRuleException('لا يمكن تعديل البيانات أثناء/بعد الاعتماد.', 'DRIVER_LOCKED');
        }

        $profile->fill(array_filter([
            'national_id' => $data['national_id'] ?? null,
        ], fn ($v) => $v !== null));

        $profile->save();

        return $profile->fresh(['documents', 'vehicles']);
    }

    /**
     * Submit the driver profile for admin review. Requires the mandatory
     * documents to be uploaded and at least one vehicle.
     */
    public function submitForReview(User $user): DriverProfile
    {
        $profile = $this->forUser($user)->load(['documents', 'vehicles']);

        if ($profile->status === DriverStatus::Approved) {
            throw new BusinessRuleException('حسابك معتمد بالفعل.', 'ALREADY_APPROVED');
        }

        if ($profile->vehicles->isEmpty()) {
            throw new BusinessRuleException('أضف مركبة واحدة على الأقل قبل الإرسال.', 'NO_VEHICLE');
        }

        $uploaded = $profile->documents->pluck('type')->all();
        $missing = array_filter(
            DocumentType::requiredForApproval(),
            fn (DocumentType $t) => ! in_array($t, $uploaded, true),
        );

        if (! empty($missing)) {
            $labels = implode('، ', array_map(fn (DocumentType $t) => $t->labelAr(), $missing));
            throw new BusinessRuleException("الوثائق الناقصة: {$labels}", 'MISSING_DOCUMENTS');
        }

        $profile->forceFill([
            'status' => DriverStatus::UnderReview,
            'submitted_at' => now(),
        ])->save();

        $this->audit->log('driver.submitted_for_review', $user, auditable: $profile);

        return $profile->fresh(['documents', 'vehicles']);
    }
}
