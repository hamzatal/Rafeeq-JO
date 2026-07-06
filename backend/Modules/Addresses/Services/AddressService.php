<?php

namespace Rafeeq\Modules\Addresses\Services;

use Illuminate\Database\Eloquent\Collection;
use Rafeeq\Core\Exceptions\AuthorizationException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Auth\Models\User;

class AddressService extends BaseService
{
    /** @return Collection<int, SavedAddress> */
    public function forUser(User $user)
    {
        return SavedAddress::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();
    }

    public function create(User $user, array $data): SavedAddress
    {
        return $this->transaction(function () use ($user, $data) {
            $makeDefault = (bool) ($data['is_default'] ?? false);

            // First address is the default automatically.
            if (! SavedAddress::where('user_id', $user->id)->exists()) {
                $makeDefault = true;
            }

            if ($makeDefault) {
                SavedAddress::where('user_id', $user->id)->update(['is_default' => false]);
            }

            return SavedAddress::create([
                'user_id' => $user->id,
                'label' => $data['label'] ?? 'other',
                'title' => $data['title'] ?? null,
                'address_text' => $data['address_text'],
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
                'is_default' => $makeDefault,
            ]);
        });
    }

    public function update(User $user, SavedAddress $address, array $data): SavedAddress
    {
        $this->assertOwner($user, $address);

        return $this->transaction(function () use ($user, $address, $data) {
            if (($data['is_default'] ?? false) === true) {
                SavedAddress::where('user_id', $user->id)->update(['is_default' => false]);
                $address->is_default = true;
            }

            $address->fill(array_filter([
                'label' => $data['label'] ?? null,
                'title' => $data['title'] ?? null,
                'address_text' => $data['address_text'] ?? null,
                'lat' => $data['lat'] ?? null,
                'lng' => $data['lng'] ?? null,
            ], fn ($v) => $v !== null));

            $address->save();

            return $address->fresh();
        });
    }

    public function delete(User $user, SavedAddress $address): void
    {
        $this->assertOwner($user, $address);
        $wasDefault = $address->is_default;
        $address->delete();

        // Promote another address to default if we removed the default one.
        if ($wasDefault) {
            $next = SavedAddress::where('user_id', $user->id)->orderBy('created_at')->first();
            $next?->forceFill(['is_default' => true])->save();
        }
    }

    public function setDefault(User $user, SavedAddress $address): SavedAddress
    {
        $this->assertOwner($user, $address);

        return $this->transaction(function () use ($user, $address) {
            SavedAddress::where('user_id', $user->id)->update(['is_default' => false]);
            $address->forceFill(['is_default' => true])->save();

            return $address->fresh();
        });
    }

    private function assertOwner(User $user, SavedAddress $address): void
    {
        if ($address->user_id !== $user->id) {
            throw new AuthorizationException;
        }
    }
}
