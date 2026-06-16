<?php

namespace Rafeeq\Core\Permissions\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $name
 * @property string $group
 * @property string $label_ar
 * @property string $label_en
 */
class Permission extends Model
{
    use HasUuid;

    protected $fillable = ['name', 'group', 'label_ar', 'label_en'];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'permission_role');
    }
}
