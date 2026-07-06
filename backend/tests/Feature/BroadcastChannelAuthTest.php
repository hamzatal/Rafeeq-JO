<?php

namespace Tests\Feature;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Chat\Events\ChatMessageSent;
use Rafeeq\Modules\Chat\Models\ChatConversation;
use Rafeeq\Modules\Chat\Support\ChatChannelPolicy;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Trips\Events\TripLocationUpdated;
use Rafeeq\Modules\Trips\Events\TripStatusChanged;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Models\TripPassenger;
use Rafeeq\Modules\Trips\Support\TripChannelPolicy;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\TripPassengerStatus;
use Rafeeq\Shared\Enums\TripStatus;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * Live GPS/status + chat must never be public. These lock the private-channel
 * guarantee and the subscriber authorization (only captain/riders/staff).
 */
class BroadcastChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $phone, UserType $type = UserType::Student): User
    {
        return User::create([
            'full_name' => 'U'.$phone, 'phone' => $phone, 'password' => 'secret-pass',
            'type' => $type, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
    }

    public function test_trip_and_chat_events_broadcast_on_private_channels(): void
    {
        $loc = new TripLocationUpdated('trip-1', 32.5, 35.8, null, now()->toIso8601String());
        $status = new TripStatusChanged('trip-1', 'started');
        $chat = new ChatMessageSent('conv-1', 'msg-1', 'user-1', 'hi', now()->toIso8601String());

        $this->assertInstanceOf(PrivateChannel::class, $loc->broadcastOn()[0]);
        $this->assertInstanceOf(PrivateChannel::class, $status->broadcastOn()[0]);
        $this->assertInstanceOf(PrivateChannel::class, $chat->broadcastOn()[0]);
    }

    public function test_only_trip_participants_and_staff_may_listen_to_a_trip(): void
    {
        $captainUser = $this->user('0790000201', UserType::Driver);
        $driver = DriverProfile::create([
            'user_id' => $captainUser->id, 'status' => DriverStatus::Approved, 'verification_level' => 1,
        ]);
        $rider = $this->user('0790000202');
        $stranger = $this->user('0790000203');

        $trip = Trip::create([
            'driver_id' => $driver->id, 'type' => 'pooled', 'is_express' => false,
            'fare_fils' => 1000, 'scheduled_at' => now()->addHour(),
            'status' => TripStatus::Started, 'capacity' => 4,
        ]);
        TripPassenger::create([
            'trip_id' => $trip->id, 'student_id' => $rider->id, 'subscription_id' => null,
            'status' => TripPassengerStatus::Booked, 'boarding_code' => '1111',
        ]);

        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'إدارة', 'label_en' => 'Admin']);
        $admin = $this->user('0790000204', UserType::Admin);
        $admin->assignRole('admin');

        $this->assertTrue(TripChannelPolicy::canListen($captainUser, $trip->id), 'captain allowed');
        $this->assertTrue(TripChannelPolicy::canListen($rider, $trip->id), 'rider allowed');
        $this->assertTrue(TripChannelPolicy::canListen($admin->fresh(), $trip->id), 'staff allowed');
        $this->assertFalse(TripChannelPolicy::canListen($stranger, $trip->id), 'stranger DENIED');
        $this->assertFalse(TripChannelPolicy::canListen($stranger, 'no-such-trip'), 'missing trip DENIED');
    }

    public function test_only_conversation_participants_may_listen_to_chat(): void
    {
        $student = $this->user('0790000210');
        $driver = $this->user('0790000211', UserType::Driver);
        $stranger = $this->user('0790000212');

        $conv = ChatConversation::create([
            'student_user_id' => $student->id,
            'driver_user_id' => $driver->id,
        ]);

        $this->assertTrue(ChatChannelPolicy::canListen($student, $conv->id));
        $this->assertTrue(ChatChannelPolicy::canListen($driver, $conv->id));
        $this->assertFalse(ChatChannelPolicy::canListen($stranger, $conv->id));
    }
}
