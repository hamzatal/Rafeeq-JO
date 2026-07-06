<?php

namespace Rafeeq\Modules\Users\Services;

use Illuminate\Support\Facades\Hash;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

/**
 * Staff (admin team) management: create and maintain support / supervisor /
 * admin accounts and their roles. Gated behind the `users.manage` permission
 * (effectively admin-only), so only a top-level admin can add new admins.
 */
class StaffService
{
    /** Roles that can be assigned to a staff member. */
    public const STAFF_ROLES = ['support', 'supervisor', 'admin'];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{full_name:string, phone:string, email?:string|null, password:string, role:string}  $data
     */
    public function create(array $data, ?User $actor): User
    {
        $this->assertRole($data['role']);

        $user = User::create([
            'full_name' => $data['full_name'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => Hash::make($data['password']),
            'type' => UserType::from($data['role']),
            'status' => UserStatus::Active,
            'locale' => $data['locale'] ?? 'ar',
        ]);

        // Staff accounts are created pre-verified so they can sign in immediately.
        $user->forceFill(['phone_verified_at' => now(), 'email_verified_at' => now()])->save();
        $user->syncRoles([$data['role']]);

        $this->audit->log('staff.created', $actor, auditable: $user, changes: [
            'role' => $data['role'],
            'phone' => $user->phone,
        ]);

        return $user->fresh('roles');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data, ?User $actor): User
    {
        if (! $user->isStaff()) {
            throw new BusinessRuleException('هذا الحساب ليس ضمن فريق الإدارة.', 'NOT_STAFF');
        }

        $changes = [];

        if (array_key_exists('full_name', $data) && $data['full_name'] !== null) {
            $user->full_name = $data['full_name'];
            $changes['full_name'] = $data['full_name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
            $changes['email'] = $data['email'];
        }
        if (array_key_exists('status', $data) && $data['status'] !== null) {
            $user->status = UserStatus::from($data['status']);
            $changes['status'] = $data['status'];
        }
        $user->save();

        if (array_key_exists('role', $data) && $data['role'] !== null) {
            $this->assertRole($data['role']);
            $user->type = UserType::from($data['role']);
            $user->save();
            $user->syncRoles([$data['role']]);
            $changes['role'] = $data['role'];
        }

        if (array_key_exists('password', $data) && ! empty($data['password'])) {
            $user->forceFill(['password' => Hash::make($data['password'])])->save();
            $changes['password'] = 'reset';
        }

        $this->audit->log('staff.updated', $actor, auditable: $user, changes: $changes);

        return $user->fresh('roles');
    }

    private function assertRole(string $role): void
    {
        if (! in_array($role, self::STAFF_ROLES, true)) {
            throw new BusinessRuleException('الدور غير صالح.', 'INVALID_ROLE');
        }
    }
}
