<?php

namespace Rafeeq\Modules\Safety\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $user_id
 * @property string|null $trip_id
 * @property string $status
 * @property Carbon|null $resolved_at
 * @property-read User|null $user
 * @property-read Trip|null $trip
 */
class SosIncident extends Model
{
    use HasUuid;

    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'trip_id', 'lat', 'lng', 'status', 'note', 'handled_by', 'resolved_at'];

    /**
     * The person who pressed the button.
     *
     * The admin safety queue listed incidents by `user_id` alone — a UUID. So the screen
     * whose purpose is «اتصال بالطالب» could not name, let alone reach, the student it
     * was about; an operator had to copy a UUID into the users page while an incident was
     * open. `docs/design/src/06-admin-3.html` screen 38 is annotated «غير موجودة عملياً
     * اليوم — أخطر فجوة في المشروع», and this is the concrete shape of that gap.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    protected function casts(): array
    {
        return ['lat' => 'float', 'lng' => 'float', 'resolved_at' => 'datetime'];
    }
}
