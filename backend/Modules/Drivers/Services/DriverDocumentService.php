<?php

namespace Rafeeq\Modules\Drivers\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverDocument;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Shared\Enums\DocumentStatus;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Enums\DriverStatus;

class DriverDocumentService extends BaseService
{
    private const DISK = 'secure';

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Upload (or replace) a document of a given type for the driver.
     * Stored on the private "secure" disk.
     */
    public function upload(DriverProfile $driver, DocumentType $type, UploadedFile $file, ?string $expiresAt = null): DriverDocument
    {
        $path = $file->store("drivers/{$driver->id}/documents", self::DISK);

        // Replace any previous document of the same type.
        $existing = $driver->documents()->where('type', $type->value)->first();
        if ($existing) {
            Storage::disk(self::DISK)->delete($existing->file_path);
            $existing->update([
                'file_path' => $path,
                'status' => DocumentStatus::Pending,
                'review_note' => null,
                'reviewed_by' => null,
                'expires_at' => $expiresAt,
            ]);
            $document = $existing;
        } else {
            $document = $driver->documents()->create([
                'type' => $type,
                'file_path' => $path,
                'status' => DocumentStatus::Pending,
                'expires_at' => $expiresAt,
            ]);
        }

        $this->audit->log('driver.document_uploaded', auditable: $document);

        return $document;
    }

    /** Admin review of a single document. */
    public function review(DriverDocument $document, bool $approve, ?string $note, User $reviewer): DriverDocument
    {
        $document->update([
            'status' => $approve ? DocumentStatus::Approved : DocumentStatus::Rejected,
            'review_note' => $note,
            'reviewed_by' => $reviewer->id,
        ]);

        // A rejection sends the driver back to pending for re-upload.
        if (! $approve) {
            $document->driver()->update(['status' => DriverStatus::Pending]);
        }

        $this->audit->log(
            $approve ? 'driver.document_approved' : 'driver.document_rejected',
            $reviewer,
            auditable: $document,
        );

        return $document->fresh();
    }

    /** Generate a temporary signed URL to view a private document. */
    public function temporaryUrl(DriverDocument $document, int $minutes = 5): string
    {
        return Storage::disk(self::DISK)->temporaryUrl($document->file_path, now()->addMinutes($minutes));
    }
}
