<?php

namespace Rafeeq\Modules\Auth\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Auth\Models\User;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'type' => $this->type->value,
            'type_label' => $this->type->labelAr(),
            'status' => $this->status->value,
            'status_label' => $this->status->labelAr(),
            'locale' => $this->locale,
            'avatar_url' => $this->avatar_path ? url($this->avatar_path) : null,
            'phone_verified' => $this->isPhoneVerified(),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
