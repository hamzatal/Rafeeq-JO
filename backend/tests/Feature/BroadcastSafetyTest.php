<?php

namespace Tests\Feature;

use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Modules\Notifications\Jobs\BroadcastNotificationJob;
use Rafeeq\Modules\Notifications\Models\Notification;
use Rafeeq\Modules\Notifications\Services\NotificationService;
use Rafeeq\Modules\Notifications\Support\BroadcastAudience;
use Rafeeq\Modules\Students\Models\StudentProfile;
use Rafeeq\Modules\Universities\Models\University;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

/**
 * The three things that were wrong about sending a message to everyone.
 *
 *   1. **A retry re-delivered it.** `tries = 3` on a job that walks its audience with
 *      `chunkById` and inserts a row per user, with no idempotency: a job dying at
 *      recipient 6,000 of 10,000 was retried FROM THE FIRST, and the first 6,000
 *      received the same announcement again. Then a third time.
 *   2. **The count did not match the send.** `audience()` counted without excluding
 *      banned users and `send()` excluded them, so the number in the dashboard
 *      disagreed with the number in the confirmation and with reality — and the
 *      audience `match` existed twice, so any new filter had to be added in two places
 *      to work and in one place to be wrong.
 *   3. **Any text was allowed.** Length was the only validation, on a message that
 *      renders on a lock screen and, for critical types, travels through an SMS gateway
 *      that logs bodies.
 */
class BroadcastSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        Role::firstOrCreate(['name' => 'admin'], ['label_ar' => 'أدمن', 'label_en' => 'Admin']);
        $this->seed(RolesPermissionsSeeder::class);

        $admin = User::create([
            'full_name' => 'Admin', 'phone' => '0791119000', 'email' => 'a@rafeeq.invalid',
            'password' => 'secret-pass', 'type' => UserType::Admin, 'status' => UserStatus::Active, 'locale' => 'ar',
        ]);
        $admin->syncRoles(['admin']);

        return $admin;
    }

    private function student(int $i, UserStatus $status = UserStatus::Active, ?University $uni = null): User
    {
        $user = User::create([
            'full_name' => "S{$i}",
            'phone' => '07911190'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'password' => 'secret-pass',
            'type' => UserType::Student, 'status' => $status, 'locale' => 'ar',
        ]);

        if ($uni !== null) {
            StudentProfile::create(['user_id' => $user->id, 'university_id' => $uni->id, 'onboarded' => true]);
        }

        return $user;
    }

    /** ── 1. A retried broadcast delivers once ─────────────────────────── */
    public function test_a_retried_broadcast_does_not_notify_anyone_twice(): void
    {
        $this->student(1);
        $this->student(2);

        $job = new BroadcastNotificationJob(
            (new BroadcastAudience('students'))->toArray(),
            'خدمة اليرموك',
            'انطلقت الخدمة من حي الجامعة.',
        );

        /*
         * The same job object, handled twice. That is precisely what a retry is: Laravel
         * deserialises the SAME payload for every attempt, which is why the dedupe key
         * is generated in the constructor and not in `handle()`.
         */
        $job->handle(app(NotificationService::class));
        $job->handle(app(NotificationService::class));

        $this->assertSame(2, Notification::count(), 'A retry re-delivered the broadcast.');
    }

    /** Two DIFFERENT broadcasts with identical text are two notifications, not one. */
    public function test_two_separate_broadcasts_both_arrive(): void
    {
        $this->student(3);

        foreach ([1, 2] as $unused) {
            (new BroadcastNotificationJob(
                (new BroadcastAudience('students'))->toArray(),
                'تنبيه',
                'نفس النصّ.',
            ))->handle(app(NotificationService::class));
        }

        $this->assertSame(2, Notification::count(), 'Deduplication must be per broadcast, not per body.');
    }

    /** ── 2. The count is the send ─────────────────────────────────────── */
    public function test_the_audience_count_excludes_the_people_the_send_excludes(): void
    {
        $this->student(10);
        $this->student(11, UserStatus::Banned);
        Sanctum::actingAs($this->admin());

        $counts = $this->getJson('/api/v1/admin/notifications/audience')->assertOk()->json('data');

        $this->assertSame(1, $counts['students'], 'A banned user is counted but can never be sent to.');

        $estimated = $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'students',
            'title' => 'مرحباً',
            'body' => 'رسالة.',
        ])->assertOk()->json('data.estimated');

        $this->assertSame($counts['students'], $estimated, 'The compose count and the send estimate must be one query.');
    }

    public function test_a_banned_user_cannot_be_reached_even_by_name(): void
    {
        $banned = $this->student(12, UserStatus::Banned);

        (new BroadcastNotificationJob(
            (new BroadcastAudience('users', [$banned->id]))->toArray(),
            'عرض',
            'خصم.',
        ))->handle(app(NotificationService::class));

        $this->assertSame(0, Notification::where('user_id', $banned->id)->count());
    }

    /** The segment a campus-by-campus launch actually needs. */
    public function test_a_broadcast_can_target_one_university(): void
    {
        $yarmouk = University::create(['name_ar' => 'اليرموك', 'name_en' => 'YU', 'code' => 'YU', 'is_active' => true]);
        $just = University::create(['name_ar' => 'العلوم', 'name_en' => 'JUST', 'code' => 'JU', 'is_active' => true]);

        $inside = $this->student(20, uni: $yarmouk);
        $outside = $this->student(21, uni: $just);

        (new BroadcastNotificationJob(
            (new BroadcastAudience('students', universityId: $yarmouk->id))->toArray(),
            'خدمة اليرموك',
            'انطلقت.',
        ))->handle(app(NotificationService::class));

        $this->assertSame(1, Notification::where('user_id', $inside->id)->count());
        $this->assertSame(0, Notification::where('user_id', $outside->id)->count());
    }

    /** «حسابك موقوف، وهذه طريقة الاعتراض» — a message that could not be sent before. */
    public function test_a_broadcast_can_target_suspended_users(): void
    {
        $active = $this->student(22);
        $suspended = $this->student(23, UserStatus::Suspended);

        (new BroadcastNotificationJob(
            (new BroadcastAudience('students', status: 'suspended'))->toArray(),
            'حسابك قيد المراجعة',
            'تواصل مع الدعم.',
        ))->handle(app(NotificationService::class));

        $this->assertSame(1, Notification::where('user_id', $suspended->id)->count());
        $this->assertSame(0, Notification::where('user_id', $active->id)->count());
    }

    /** ── 3. The text is checked ───────────────────────────────────────── */
    public function test_a_body_carrying_a_phone_number_is_rejected(): void
    {
        $this->student(40);
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'students',
            'title' => 'تواصل معنا',
            'body' => 'اتصل بالدعم على 0791234567 لأي استفسار.',
        ])->assertStatus(422)->assertJsonValidationErrors('body');

        $this->assertSame(0, Notification::count());
    }

    public function test_a_title_carrying_an_email_is_rejected(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'students',
            'title' => 'راسلنا على support@rafeeq.jo',
            'body' => 'نصّ عادي.',
        ])->assertStatus(422)->assertJsonValidationErrors('title');
    }

    /**
     * A plate, a name and an amount are NOT blocked.
     *
     * Blocking them would push operators toward «لديك تحديث» — a notification that says
     * nothing, which is how people learn to swipe all of them away. This test is the one
     * that stops the guard being widened until it is useless.
     */
    public function test_a_name_a_plate_and_an_amount_are_allowed(): void
    {
        $this->student(41);
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/v1/admin/notifications/send', [
            'audience' => 'students',
            'title' => 'كابتن محمد في الطريق',
            'body' => 'فضّي i10 · اللوحة 42-1839 · الأجرة 1.750 د.أ',
        ])->assertOk();
    }
}
