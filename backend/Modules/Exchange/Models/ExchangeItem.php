<?php

namespace Rafeeq\Modules\Exchange\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $owner_id
 * @property string $type
 * @property string $title
 * @property string $status
 */
class ExchangeItem extends Model
{
    use HasUuid;

    protected $fillable = [
        'owner_id', 'type', 'title', 'condition', 'description',
        'images', 'price_fils', 'status', 'reserved_by',
    ];

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'price_fils' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
