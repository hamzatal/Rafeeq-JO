<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Rafeeq\Core\Permissions\Models\Permission;
use Rafeeq\Core\Permissions\Models\Role;

class RolesPermissionsSeeder extends Seeder
{
    /** System roles: name => [label_ar, label_en] */
    private array $roles = [
        'student' => ['طالب', 'Student'],
        'driver' => ['كابتن', 'Driver'],
        'support' => ['دعم فني', 'Support'],
        'supervisor' => ['مشرف دعم', 'Supervisor'],
        'admin' => ['إدارة', 'Admin'],
    ];

    /** group => [ permissionName => [label_ar, label_en] ] */
    private array $permissions = [
        'users' => [
            'users.view' => ['عرض المستخدمين', 'View users'],
            'users.manage' => ['إدارة المستخدمين', 'Manage users'],
        ],
        'drivers' => [
            'drivers.view' => ['عرض الكباتن', 'View drivers'],
            'drivers.review' => ['مراجعة وثائق الكباتن', 'Review driver documents'],
            'drivers.approve' => ['اعتماد الكباتن', 'Approve drivers'],
            'drivers.suspend' => ['إيقاف الكباتن', 'Suspend drivers'],
        ],
        'support' => [
            'support.view' => ['عرض التذاكر', 'View tickets'],
            'support.respond' => ['الرد على التذاكر', 'Respond to tickets'],
            'support.escalate' => ['تصعيد التذاكر', 'Escalate tickets'],
        ],
        'complaints' => [
            'complaints.view' => ['عرض الشكاوى', 'View complaints'],
            'complaints.resolve' => ['معالجة الشكاوى', 'Resolve complaints'],
        ],
        'payments' => [
            'payments.view' => ['عرض المدفوعات', 'View payments'],
            'payments.approve' => ['اعتماد المدفوعات', 'Approve payments'],
        ],
        'platform' => [
            'settings.manage' => ['إدارة الإعدادات', 'Manage settings'],
            'audit.view' => ['عرض سجل التدقيق', 'View audit logs'],
            'analytics.view' => ['عرض التحليلات', 'View analytics'],
        ],
    ];

    public function run(): void
    {
        // Permissions
        $permModels = [];
        foreach ($this->permissions as $group => $perms) {
            foreach ($perms as $name => [$ar, $en]) {
                $permModels[$name] = Permission::updateOrCreate(
                    ['name' => $name],
                    ['group' => $group, 'label_ar' => $ar, 'label_en' => $en],
                );
            }
        }

        // Roles
        $roleModels = [];
        foreach ($this->roles as $name => [$ar, $en]) {
            $roleModels[$name] = Role::updateOrCreate(
                ['name' => $name],
                ['label_ar' => $ar, 'label_en' => $en, 'is_system' => true],
            );
        }

        // Support: tickets + complaints + view drivers/users
        $this->sync($roleModels['support'], $permModels, [
            'support.view', 'support.respond',
            'complaints.view',
            'users.view', 'drivers.view',
        ]);

        // Supervisor: everything support has + escalate, approvals, analytics
        $this->sync($roleModels['supervisor'], $permModels, [
            'support.view', 'support.respond', 'support.escalate',
            'complaints.view', 'complaints.resolve',
            'users.view', 'drivers.view', 'drivers.review', 'drivers.approve', 'drivers.suspend',
            'payments.view', 'payments.approve',
            'analytics.view',
        ]);

        // Admin: all permissions (also bypasses checks as superuser).
        $this->sync($roleModels['admin'], $permModels, array_keys($permModels));
    }

    private function sync(Role $role, array $permModels, array $names): void
    {
        $ids = collect($names)
            ->map(fn ($n) => $permModels[$n]->id ?? null)
            ->filter()
            ->all();

        $role->permissions()->sync($ids);
    }
}
