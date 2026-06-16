<?php

namespace Rafeeq\Core\Permissions\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Rafeeq\Shared\Traits\HasUuid;

/**
 * @property string $id
 * @property string $name
 * @property string $label_ar
 * @property string $label_en
 * @property bool $is_system
 */
class Role extends Model
{
    use HasUuid;

    protected $fillable = ['name', 'label_ar', 'label_en', 'is_system'];

    protected $casts = ['is_system' => 'boolean'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'permission_role');
    }

    public function givePermissionTo(Permission|string $permission): void
    {
        $id = $permission instanceof Permission
            ? $permission->id
            : Permission::where('name', $permission)->value('id');

        if ($id) {
            $this->permissions()->syncWithoutDetaching([$id]);
        }
    }
}
