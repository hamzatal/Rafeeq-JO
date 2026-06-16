<?php

namespace Rafeeq\Modules\Drivers\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Shared\Enums\DocumentStatus;
use Rafeeq\Shared\Enums\DocumentType;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $driver_id
 * @property DocumentType $type
 * @property string $file_path
 * @property DocumentStatus $status
 * @property string|null $review_note
 */
class DriverDocument extends Model
{
    use HasUuid;

    protected $fillable = [
        'driver_id', 'type', 'file_path', 'status',
        'reviewed_by', 'review_note', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => DocumentType::class,
            'status' => DocumentStatus::class,
            'expires_at' => 'date',
        ];
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
