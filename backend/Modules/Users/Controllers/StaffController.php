<?php

namespace Rafeeq\Modules\Users\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Resources\UserResource;
use Rafeeq\Modules\Users\Requests\StoreStaffRequest;
use Rafeeq\Modules\Users\Requests\UpdateStaffRequest;
use Rafeeq\Modules\Users\Services\StaffService;
use Rafeeq\Shared\Enums\UserType;

/**
 * Admin team management. All routes are gated by `users.manage`
 * (admin-only), so only a top-level admin can add or edit staff/admins.
 */
class StaffController extends Controller
{
    public function __construct(private readonly StaffService $staff) {}

    /** List staff accounts (support / supervisor / admin). */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('roles')
            ->whereIn('type', [UserType::Support->value, UserType::Supervisor->value, UserType::Admin->value])
            ->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($w) use ($search) {
                $w->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $this->ok(
            UserResource::collection($query->paginate((int) $request->query('per_page', 30)))
        );
    }

    /** Assignable staff roles with bilingual labels. */
    public function roles(): JsonResponse
    {
        $roles = Role::whereIn('name', StaffService::STAFF_ROLES)->get()
            ->map(fn (Role $r) => [
                'name' => $r->name,
                'label_ar' => $r->label_ar,
                'label_en' => $r->label_en,
            ])->values();

        return $this->ok($roles);
    }

    public function store(StoreStaffRequest $request): JsonResponse
    {
        $user = $this->staff->create($request->validated(), $request->user());

        return $this->created(new UserResource($user), 'تم إنشاء حساب الموظف.');
    }

    public function update(UpdateStaffRequest $request, User $user): JsonResponse
    {
        $updated = $this->staff->update($user, $request->validated(), $request->user());

        return $this->ok(new UserResource($updated), 'تم تحديث حساب الموظف.');
    }
}
