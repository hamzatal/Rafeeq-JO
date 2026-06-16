<?php

namespace Rafeeq\Modules\Users\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Rafeeq\Core\Http\Controllers\Controller;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Auth\Resources\UserResource;

class UsersAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('roles')->latest();

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $query->where(function ($w) use ($search) {
                $w->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $this->ok(
            UserResource::collection($query->paginate((int) $request->query('per_page', 20)))
        );
    }

    public function show(User $user): JsonResponse
    {
        return $this->ok(new UserResource($user->load('roles')));
    }
}
