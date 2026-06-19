<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Rafeeq\Shared\Enums\NotificationType;

/**
 * Push delivery hints (channel / priority / sound) drive the per-category
 * sound + importance on the device. This locks the mapping.
 */
class NotificationTypeTest extends TestCase
{
    public function test_critical_types_use_critical_channel_and_high_priority(): void
    {
        foreach ([NotificationType::SosTriggered, NotificationType::AccountFrozen] as $type) {
            $this->assertTrue($type->isCritical());
            $this->assertSame('rafeeq_critical', $type->channelId());
            $this->assertSame('high', $type->pushPriority());
            $this->assertSame('critical', $type->sound());
        }
    }

    public function test_ride_offer_uses_rides_channel_with_distinct_sound_and_high_priority(): void
    {
        $type = NotificationType::RideOffer;

        $this->assertSame('rafeeq_rides', $type->channelId());
        $this->assertSame('ride_offer', $type->sound());
        $this->assertSame('high', $type->pushPriority());
    }

    public function test_general_type_uses_default_channel_and_normal_priority(): void
    {
        $type = NotificationType::General;

        $this->assertSame('rafeeq_default', $type->channelId());
        $this->assertSame('default', $type->sound());
        $this->assertSame('normal', $type->pushPriority());
    }

    public function test_payment_types_map_to_payments_channel(): void
    {
        $this->assertSame('rafeeq_payments', NotificationType::PaymentApproved->channelId());
        $this->assertSame('payments', NotificationType::PaymentApproved->category());
    }
}
