<?php

namespace Rafeeq\Modules\Parcels\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rafeeq\Core\Audit\AuditLogger;
use Rafeeq\Core\Exceptions\BusinessRuleException;
use Rafeeq\Core\Services\BaseService;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Parcels\Models\Parcel;
use Rafeeq\Shared\Enums\NotificationType;
use Rafeeq\Shared\Enums\ParcelSize;
use Rafeeq\Shared\Enums\ParcelStatus;

/**
 * Parcel delivery with a two-OTP chain of custody:
 *  - pickup_code: the sender hands it to the courier at pickup,
 *  - delivery_code: the receiver hands it to the courier at delivery.
 * Both ends are confirmed in-app, mirroring the rides anti-fraud model.
 */
class ParcelService extends BaseService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
    ) {}

    public function create(User $sender, array $data): Parcel
    {
        $size = ParcelSize::from($data['size'] ?? ParcelSize::Small->value);

        return $this->transaction(function () use ($sender, $data, $size) {
            $parcel = Parcel::create([
                'number' => $this->generateNumber(),
                'sender_id' => $sender->id,
                'receiver_name' => $data['receiver_name'],
                'receiver_phone' => $data['receiver_phone'],
                'from_point_id' => $data['from_point_id'] ?? null,
                'to_point_id' => $data['to_point_id'] ?? null,
                'from_address' => $data['from_address'] ?? null,
                'to_address' => $data['to_address'] ?? null,
                'category' => $data['category'] ?? 'general',
                'size' => $size,
                'description' => $data['description'] ?? null,
                'fee_fils' => $size->feeFils(),
                'status' => ParcelStatus::AwaitingPickup,
                'pickup_code' => $this->code(),
                'delivery_code' => $this->code(),
            ]);

            $this->event($parcel, 'created', $sender->id);
            $this->audit->log('parcel.created', $sender, auditable: $parcel);

            return $parcel;
        });
    }

    /** A courier accepts the parcel for delivery. */
    public function assign(Parcel $parcel, DriverProfile $courier): Parcel
    {
        if ($parcel->status !== ParcelStatus::AwaitingPickup) {
            throw new BusinessRuleException('الطرد غير متاح للإسناد.', 'PARCEL_NOT_AVAILABLE');
        }

        $parcel->forceFill(['courier_id' => $courier->id])->save();
        $this->event($parcel, 'assigned', $courier->user_id);
        $this->audit->log('parcel.assigned', auditable: $parcel);

        return $parcel->fresh();
    }

    /** Courier confirms pickup with the sender's pickup code. */
    public function confirmPickup(Parcel $parcel, string $code, ?float $lat = null, ?float $lng = null): Parcel
    {
        if ($parcel->status !== ParcelStatus::AwaitingPickup) {
            throw new BusinessRuleException('لا يمكن استلام هذا الطرد.', 'INVALID_STATE');
        }
        if (! hash_equals($parcel->pickup_code, $code)) {
            throw new BusinessRuleException('كود الاستلام غير صحيح.', 'INVALID_PICKUP_CODE');
        }

        $parcel->forceFill(['status' => ParcelStatus::InTransit, 'picked_up_at' => now()])->save();
        $this->event($parcel, 'picked_up', $parcel->courier?->user_id, $lat, $lng);
        $this->audit->log('parcel.picked_up', auditable: $parcel);

        if ($parcel->sender) {
            $this->notifications->notify(
                $parcel->sender,
                NotificationType::General,
                'تم استلام طردك',
                "الطرد {$parcel->number} في الطريق إلى المستلم.",
                ['parcel_id' => $parcel->id],
            );
        }

        return $parcel->fresh();
    }

    /** Courier confirms delivery with the receiver's delivery code. */
    public function confirmDelivery(Parcel $parcel, string $code, ?float $lat = null, ?float $lng = null): Parcel
    {
        if ($parcel->status !== ParcelStatus::InTransit) {
            throw new BusinessRuleException('الطرد ليس في الطريق.', 'INVALID_STATE');
        }
        if (! hash_equals($parcel->delivery_code, $code)) {
            throw new BusinessRuleException('كود التسليم غير صحيح.', 'INVALID_DELIVERY_CODE');
        }

        $parcel->forceFill(['status' => ParcelStatus::Delivered, 'delivered_at' => now()])->save();
        $this->event($parcel, 'delivered', $parcel->courier?->user_id, $lat, $lng);
        $this->audit->log('parcel.delivered', auditable: $parcel);

        if ($parcel->sender) {
            $this->notifications->notify(
                $parcel->sender,
                NotificationType::General,
                'تم تسليم طردك',
                "تم تسليم الطرد {$parcel->number} بنجاح.",
                ['parcel_id' => $parcel->id],
            );
        }

        return $parcel->fresh();
    }

    public function cancel(Parcel $parcel, User $actor): Parcel
    {
        if ($parcel->status->isFinal() || $parcel->status === ParcelStatus::InTransit) {
            throw new BusinessRuleException('لا يمكن إلغاء الطرد في حالته الحالية.', 'CANNOT_CANCEL');
        }
        $parcel->forceFill(['status' => ParcelStatus::Cancelled])->save();
        $this->event($parcel, 'cancelled', $actor->id);
        $this->audit->log('parcel.cancelled', $actor, auditable: $parcel);

        return $parcel->fresh();
    }

    private function event(Parcel $parcel, string $type, ?string $actorId, ?float $lat = null, ?float $lng = null): void
    {
        $parcel->events()->create([
            'type' => $type,
            'actor_id' => $actorId,
            'lat' => $lat,
            'lng' => $lng,
            'at' => now(),
        ]);
    }

    private function code(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function generateNumber(): string
    {
        $year = now()->format('Y');

        return DB::transaction(function () use ($year) {
            $prefix = "PCL-{$year}-";
            $last = Parcel::where('number', 'like', $prefix.'%')->lockForUpdate()
                ->orderByDesc('number')->value('number');
            $seq = $last ? ((int) Str::afterLast($last, '-')) + 1 : 1;

            return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
        });
    }
}
