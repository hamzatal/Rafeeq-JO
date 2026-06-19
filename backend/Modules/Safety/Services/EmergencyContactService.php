<?php

namespace Rafeeq\Modules\Safety\Services;

use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Safety\Models\EmergencyContact;
use Rafeeq\Shared\Support\Phone;

/**
 * Manages a user's emergency / guardian contacts.
 *
 * These contacts are NOT platform accounts — they are simply phone numbers a
 * student can reach (call/SMS) in an emergency, and which Rafeeq alerts by SMS
 * when an SOS is triggered. This replaces the idea of a separate guardian app.
 */
class EmergencyContactService extends BaseService
{
    /** A reasonable cap to avoid abuse / SMS fan-out. */
    public const MAX_CONTACTS = 5;

    public function __construct(private readonly AuditLogger $audit) {}

    /** @return Collection<int, EmergencyContact> */
    public function list(User $user): Collection
    {
        return EmergencyContact::where('user_id', $user->id)
            ->orderByDesc('is_primary')
            ->orderBy('created_at')
            ->get();
    }

    /**
     * @param  array{name:string, phone:string, relation?:string|null, is_primary?:bool, notify_on_sos?:bool}  $data
     */
    public function create(User $user, array $data): EmergencyContact
    {
        return $this->transaction(function () use ($user, $data) {
            $count = EmergencyContact::where('user_id', $user->id)->count();
            if ($count >= self::MAX_CONTACTS) {
                throw ValidationException::withMessages([
                    'contacts' => ['لا يمكن إضافة أكثر من '.self::MAX_CONTACTS.' جهات اتصال طوارئ.'],
                ]);
            }

            $phone = $this->requireValidPhone($data['phone']);

            // First contact is primary by default.
            $isPrimary = (bool) ($data['is_primary'] ?? false) || $count === 0;

            $contact = EmergencyContact::create([
                'user_id' => $user->id,
                'name' => trim($data['name']),
                'phone' => $phone,
                'relation' => $data['relation'] ?? null,
                'is_primary' => $isPrimary,
                'notify_on_sos' => $data['notify_on_sos'] ?? true,
            ]);

            if ($isPrimary) {
                $this->demoteOthers($user, $contact->id);
            }

            $this->audit->log('emergency_contact.created', $user, auditable: $contact);

            return $contact;
        });
    }

    /**
     * @param  array{name?:string, phone?:string, relation?:string|null, is_primary?:bool, notify_on_sos?:bool}  $data
     */
    public function update(User $user, EmergencyContact $contact, array $data): EmergencyContact
    {
        return $this->transaction(function () use ($user, $contact, $data) {
            if (array_key_exists('phone', $data) && $data['phone'] !== null) {
                $contact->phone = $this->requireValidPhone($data['phone']);
            }
            if (array_key_exists('name', $data) && $data['name'] !== null) {
                $contact->name = trim($data['name']);
            }
            if (array_key_exists('relation', $data)) {
                $contact->relation = $data['relation'];
            }
            if (array_key_exists('notify_on_sos', $data) && $data['notify_on_sos'] !== null) {
                $contact->notify_on_sos = (bool) $data['notify_on_sos'];
            }

            $makePrimary = (bool) ($data['is_primary'] ?? false);
            if ($makePrimary) {
                $contact->is_primary = true;
            }

            $contact->save();

            if ($makePrimary) {
                $this->demoteOthers($user, $contact->id);
            }

            $this->audit->log('emergency_contact.updated', $user, auditable: $contact);

            return $contact;
        });
    }

    public function delete(User $user, EmergencyContact $contact): void
    {
        $this->transaction(function () use ($user, $contact) {
            $wasPrimary = $contact->is_primary;
            $contact->delete();

            // Promote another contact to primary so there is always one.
            if ($wasPrimary) {
                $next = EmergencyContact::where('user_id', $user->id)->orderBy('created_at')->first();
                $next?->forceFill(['is_primary' => true])->save();
            }

            $this->audit->log('emergency_contact.deleted', $user);
        });
    }

    /** Contacts that opted into SOS alerts (used by SosService). */
    public function sosRecipients(User $user): Collection
    {
        return EmergencyContact::where('user_id', $user->id)
            ->where('notify_on_sos', true)
            ->get();
    }

    private function requireValidPhone(string $raw): string
    {
        $normalized = Phone::normalize($raw);
        if ($normalized === null) {
            throw ValidationException::withMessages([
                'phone' => ['رقم الهاتف غير صالح. استخدم رقم أردني صحيح (07XXXXXXXX).'],
            ]);
        }

        return $normalized;
    }

    private function demoteOthers(User $user, string $keepId): void
    {
        EmergencyContact::where('user_id', $user->id)
            ->where('id', '!=', $keepId)
            ->where('is_primary', true)
            ->update(['is_primary' => false]);
    }
}
