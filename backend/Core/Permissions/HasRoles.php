<?php

namespace Rafeeq\Core\Permissions;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Rafeeq\Core\Permissions\Models\Role;

/**
 * Gives a User model role/permission capabilities.
 * Resolved permissions are cached per-request to avoid N+1 lookups.
 */
trait HasRoles
{
    private ?Collection $cachedPermissions = null;

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function hasRole(string $role): bool
    {
        return $this->roles->contains('name', $role);
    }

    /** @param array<int, string>|string $roles */
    public function hasAnyRole(array|string $roles): bool
    {
        $roles = (array) $roles;

        return $this->roles->whereIn('name', $roles)->isNotEmpty();
    }

    public function assignRole(string $role): void
    {
        $roleId = Role::where('name', $role)->value('id');

        if ($roleId) {
            $this->roles()->syncWithoutDetaching([$roleId]);
            $this->cachedPermissions = null;
        }
    }

    public function syncRoles(array $roleNames): void
    {
        $ids = Role::whereIn('name', $roleNames)->pluck('id')->all();
        $this->roles()->sync($ids);
        $this->cachedPermissions = null;
    }

    public function hasPermission(string $permission): bool
    {
        return $this->resolvePermissions()->contains($permission)
            || $this->hasRole('admin'); // admin is a superuser
    }

    /** @return Collection<int, string> */
    public function resolvePermissions(): Collection
    {
        if ($this->cachedPermissions !== null) {
            return $this->cachedPermissions;
        }

        return $this->cachedPermissions = $this->roles
            ->loadMissing('permissions')
            ->flatMap(fn (Role $role) => $role->permissions->pluck('name'))
            ->unique()
            ->values();
    }
}
