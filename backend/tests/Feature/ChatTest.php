<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Chat\Models\ChatConversation;
use Rafeeq\Modules\Chat\Services\ChatService;
use Rafeeq\Modules\Drivers\Models\DriverProfile;
use Rafeeq\Modules\Routes\Models\Route;
use Rafeeq\Modules\Subscriptions\Models\Subscription;
use Rafeeq\Modules\Subscriptions\Models\SubscriptionPlan;
use Rafeeq\Modules\Trips\Models\Trip;
use Rafeeq\Modules\Trips\Services\TripService;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\DriverStatus;
use Rafeeq\Shared\Enums\SubscriptionStatus;
use Rafeeq\Shared\Enums\SubscriptionType;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * In-app chat between a student passenger and the trip's captain.
 */
class ChatTest extends TestCase
{
    use RefreshDatabase;

    private function seedRoles(): void
    {
        foreach ([['student', 'طالب'], ['driver', 'كابتن']] as [$n, $ar]) {
            Role::firstOrCreate(['name' => $n], ['label_ar' => $ar, 'label_en' => $n]);
        }
    }

    private function makeStudent(string $phone): User
    {
        $u = User::create(['full_name' => 'Student '.$phone, 'phone' => $phone, 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('student');

        return $u;
    }

    private function makeDriver(): array
    {
        $u = User::create(['full_name' => 'Captain Zaid', 'phone' => '0790000099', 'type' => UserType::Driver, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('driver');
        $d = DriverProfile::create(['user_id' => $u->id, 'status' => DriverStatus::Approved, 'verification_level' => 1]);

        return [$u, $d];
    }

    private function makeRoute(): Route
    {
        $uni = University::create(['name_ar' => 'ج', 'name_en' => 'U', 'code' => 'UJ', 'city' => 'Amman', 'is_active' => true]);

        return Route::create(['university_id' => $uni->id, 'name' => 'R', 'price_fils' => 1000, 'capacity' => 4, 'is_active' => true]);
    }

    private function giveSubscription(User $student, Route $route): void
    {
        $plan = SubscriptionPlan::create(['name' => 'M', 'type' => SubscriptionType::Monthly, 'price_fils' => 20000, 'rides_count' => 30, 'duration_days' => 30, 'is_active' => true]);
        Subscription::create(['student_id' => $student->id, 'plan_id' => $plan->id, 'route_id' => $route->id, 'status' => SubscriptionStatus::Active, 'starts_at' => now()->subDay(), 'ends_at' => now()->addDays(29), 'remaining_rides' => 30]);
    }

    /** Build a trip with one booked student passenger. */
    private function bootTrip(): array
    {
        $this->seedRoles();
        $student = $this->makeStudent('0790000010');
        [$driverUser, $driver] = $this->makeDriver();
        $route = $this->makeRoute();
        $this->giveSubscription($student, $route);

        /** @var TripService $service */
        $service = app(TripService::class);
        $trip = $service->schedule($driver, $route, now()->addHour()->toDateTimeString());
        $service->book($student, $trip);

        return [$student, $driverUser, $trip];
    }

    public function test_student_opens_thread_and_sends_message_captain_is_notified(): void
    {
        [$student, $driverUser, $trip] = $this->bootTrip();

        Sanctum::actingAs($student);
        $open = $this->postJson("/api/v1/chat/trips/{$trip->id}/open")->assertOk();
        $conversationId = $open->json('data.id');

        $this->postJson("/api/v1/chat/conversations/{$conversationId}/messages", ['body' => 'كم تبعد عن نقطة التجمع؟'])
            ->assertCreated()
            ->assertJsonPath('data.mine', true);

        // Captain receives a durable notification.
        $this->assertDatabaseHas('rafeeq_notifications', [
            'user_id' => $driverUser->id,
            'type' => 'general',
        ]);
    }

    public function test_captain_opens_same_thread_and_both_see_messages(): void
    {
        [$student, $driverUser, $trip] = $this->bootTrip();

        // Student sends first.
        Sanctum::actingAs($student);
        $open = $this->postJson("/api/v1/chat/trips/{$trip->id}/open")->assertOk();
        $cid = $open->json('data.id');
        $this->postJson("/api/v1/chat/conversations/{$cid}/messages", ['body' => 'مرحبا كابتن']);

        // Captain opens the same trip thread (must pass student id) → same conversation.
        Sanctum::actingAs($driverUser);
        $open2 = $this->postJson("/api/v1/chat/trips/{$trip->id}/open", ['student_user_id' => $student->id])->assertOk();
        $this->assertSame($cid, $open2->json('data.id'), 'Captain must reuse the same conversation.');

        $this->postJson("/api/v1/chat/conversations/{$cid}/messages", ['body' => 'أنا على بعد 3 دقائق'])->assertCreated();

        $msgs = $this->getJson("/api/v1/chat/conversations/{$cid}/messages")->assertOk();
        $this->assertCount(2, $msgs->json('data'));
        // For the captain, their own message is "mine".
        $this->assertSame('أنا على بعد 3 دقائق', $msgs->json('data.1.body'));
        $this->assertTrue($msgs->json('data.1.mine'));
    }

    public function test_marking_read_clears_unread_for_recipient(): void
    {
        [$student, $driverUser, $trip] = $this->bootTrip();

        Sanctum::actingAs($student);
        $cid = $this->postJson("/api/v1/chat/trips/{$trip->id}/open")->json('data.id');
        $this->postJson("/api/v1/chat/conversations/{$cid}/messages", ['body' => 'سؤال']);

        Sanctum::actingAs($driverUser);
        $this->postJson("/api/v1/chat/conversations/{$cid}/read")->assertOk()->assertJsonPath('data.marked', 1);

        $conv = ChatConversation::find($cid);
        $this->assertSame(0, app(ChatService::class)->unreadCount($driverUser, $conv));
    }

    public function test_non_participant_cannot_read_messages(): void
    {
        [$student, $driverUser, $trip] = $this->bootTrip();
        $intruder = $this->makeStudent('0790000077');

        Sanctum::actingAs($student);
        $cid = $this->postJson("/api/v1/chat/trips/{$trip->id}/open")->json('data.id');

        Sanctum::actingAs($intruder);
        $this->getJson("/api/v1/chat/conversations/{$cid}/messages")->assertStatus(403);
    }

    public function test_non_passenger_cannot_open_trip_thread(): void
    {
        [$student, $driverUser, $trip] = $this->bootTrip();
        $outsider = $this->makeStudent('0790000078');

        Sanctum::actingAs($outsider);
        $this->postJson("/api/v1/chat/trips/{$trip->id}/open")->assertStatus(403);
    }
}
