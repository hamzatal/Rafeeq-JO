<?php

namespace Rafeeq\Shared\Enums;

/**
 * Notification categories. `critical` types trigger an SMS fallback when
 * push is unavailable or disabled, because they concern safety/money.
 */
enum NotificationType: string
{
    case PaymentApproved = 'payment_approved';
    case PaymentRejected = 'payment_rejected';
    case PaymentUnderReview = 'payment_under_review';
    case SubscriptionActivated = 'subscription_activated';
    case WalletCredited = 'wallet_credited';
    case WalletLowBalance = 'wallet_low_balance';
    case TripScheduled = 'trip_scheduled';
    case TripStarted = 'trip_started';
    case TripCancelled = 'trip_cancelled';
    case TripCompleted = 'trip_completed';
    case RideMatched = 'ride_matched';
    case RideOffer = 'ride_offer';
    case BoardingConfirmed = 'boarding_confirmed';
    case DropoffConfirmed = 'dropoff_confirmed';
    case RatingRequest = 'rating_request';
    case SosTriggered = 'sos_triggered';
    case AccountFrozen = 'account_frozen';
    case General = 'general';

    /** Category used to match a per-user preference toggle. */
    public function category(): string
    {
        return match ($this) {
            self::PaymentApproved, self::PaymentRejected, self::PaymentUnderReview,
            self::SubscriptionActivated, self::WalletCredited, self::WalletLowBalance => 'payments',
            self::TripScheduled, self::TripStarted, self::TripCancelled,
            self::TripCompleted, self::RideMatched, self::RideOffer,
            self::BoardingConfirmed, self::DropoffConfirmed => 'trips',
            self::RatingRequest => 'ratings',
            self::SosTriggered, self::AccountFrozen => 'safety',
            default => 'general',
        };
    }

    /** Critical notifications use SMS fallback when push fails/disabled. */
    public function isCritical(): bool
    {
        return in_array($this, [self::SosTriggered, self::AccountFrozen, self::TripCancelled], true);
    }

    /**
     * Android notification channel id (must match a channel created on the
     * device). Channels control sound, vibration and importance per category.
     */
    public function channelId(): string
    {
        return match (true) {
            $this->isCritical() => 'rafeeq_critical',
            in_array($this, [self::RideOffer, self::RideMatched], true) => 'rafeeq_rides',
            $this->category() === 'trips' => 'rafeeq_trips',
            $this->category() === 'payments' => 'rafeeq_payments',
            default => 'rafeeq_default',
        };
    }

    /** FCM/APNs delivery priority — high wakes the device immediately. */
    public function pushPriority(): string
    {
        return match (true) {
            $this->isCritical() => 'high',
            in_array($this, [self::RideOffer, self::RideMatched, self::TripStarted, self::BoardingConfirmed], true) => 'high',
            default => 'normal',
        };
    }

    /**
     * Notification sound. 'default' is always safe (device default). Ride offers
     * for captains use a distinct, attention-grabbing tone when bundled.
     */
    public function sound(): string
    {
        return match ($this) {
            self::SosTriggered, self::AccountFrozen => 'critical',
            self::RideOffer, self::RideMatched => 'ride_offer',
            default => 'default',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
