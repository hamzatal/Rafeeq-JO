<?php

namespace Rafeeq\Modules\Auth\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Support\Pii;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Masked unless the viewer holds `users.view_pii`, or is looking at
        // themselves. `users.view` used to reveal every phone number in the system to
        // every support agent — enough to contact a rider off-platform or to sell a
        // list. Support needs to CONFIRM a number, which the last two digits do.
        $reveal = $this->canRevealPii($request);

        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $reveal ? $this->phone : Pii::phone($this->phone),
            'email' => $reveal ? $this->email : Pii::email($this->email),
            'pii_masked' => ! $reveal,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'locale' => $this->locale,
            'avatar_url' => $this->avatar_path ? url($this->avatar_path) : null,
            'phone_verified' => $this->isPhoneVerified(),
            'mfa_enabled' => $this->hasMfaEnabled(),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * May this viewer see the unmasked contact details?
     *
     * Yes when it is their own record — a user reading their own profile — or when
     * they hold the dedicated permission. Deliberately NOT implied by `users.view`.
     */
    private function canRevealPii(Request $request): bool
    {
        $viewer = $request->user();
        if (! $viewer) {
            return false;
        }

        return $viewer->id === $this->id || $viewer->hasPermission('users.view_pii');
    }
}
