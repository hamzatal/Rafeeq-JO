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
            // Separate from users.view on purpose. "Can see the user list" and "can
            // read everyone's phone number and email" are different powers, and
            // bundling them meant every support agent held the stronger one. Support
            // work needs to confirm a number, not read it.
            'users.view_pii' => ['عرض بيانات الاتصال الكاملة', 'View full contact details'],
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
            // Approving a CliQ receipt only confirms a transfer that already
            // happened at the bank, so support supervisors may hold it.
            'payments.approve' => ['اعتماد المدفوعات', 'Approve payments'],
            // Creating balance out of nothing, reversing the ledger and paying
            // money out are a different class of act. They are admin-only and
            // deliberately NOT bundled with payments.approve, otherwise one
            // non-admin role could credit a wallet and then approve its payout.
            'wallet.credit' => ['شحن المحافظ يدوياً', 'Credit wallets manually'],
            'wallet.reverse' => ['عكس حركات المحفظة', 'Reverse wallet entries'],
            'payouts.approve' => ['اعتماد سحب الأرباح', 'Approve captain payouts'],
            // Checked by TripChannelPolicy but was never defined, so staff were
            // silently barred from live trip channels.
            'trips.view' => ['متابعة الرحلات', 'View trips'],
        ],
        /*
         * Safety. The one admin surface that had NO permission at all.
         *
         * `admin/safety/*` was gated on `role:admin,supervisor` alone, while every
         * comparable surface had already been moved to a permission — disputes to
         * `users.manage`, zone prices to `settings.manage`, payments to
         * `payments.approve`. It was simply missed by that pass, and what it exposes
         * is the most sensitive data in the system: GPS-fraud findings, cancellation
         * patterns, and live SOS incidents naming a rider and their location.
         *
         * Split into read and act for the same reason `users.view` is split from
         * `users.view_pii`: reading a safety queue and CLOSING an open SOS are
         * different powers, and an incident marked resolved by mistake is a person
         * nobody is looking for any more.
         */
        'safety' => [
            'safety.view' => ['عرض مركز السلامة', 'View safety centre'],
            'safety.resolve' => ['إغلاق بلاغات السلامة', 'Resolve safety incidents'],
        ],
        'platform' => [
            'settings.manage' => ['إدارة الإعدادات', 'Manage settings'],
            'audit.view' => ['عرض سجل التدقيق', 'View audit logs'],
            'analytics.view' => ['عرض التحليلات', 'View analytics'],
            'coupons.manage' => ['إدارة الكوبونات', 'Manage coupons'],
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
            'trips.view',
        ]);

        // Supervisor: everything support has + escalate, approvals, analytics
        $this->sync($roleModels['supervisor'], $permModels, [
            'support.view', 'support.respond', 'support.escalate',
            'complaints.view', 'complaints.resolve',
            'users.view', 'users.view_pii', 'drivers.view', 'drivers.review', 'drivers.approve', 'drivers.suspend',
            'payments.view', 'payments.approve',
            'trips.view',
            'analytics.view',
            'coupons.manage',
            // Supervisors ARE the safety team — they need the queue and the ability
            // to close an incident, or the rota has to escalate every SOS to an admin.
            'safety.view', 'safety.resolve',
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
