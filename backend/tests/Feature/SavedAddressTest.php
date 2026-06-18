<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Rafeeq\Core\Permissions\Models\Role;
use Rafeeq\Modules\Addresses\Models\SavedAddress;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;
use Tests\TestCase;

class SavedAddressTest extends TestCase
{
    use RefreshDatabase;

    private function makeStudent(string $phone = '0790000010'): User
    {
        Role::firstOrCreate(['name' => 'student'], ['label_ar' => 'طالب', 'label_en' => 'Student']);
        $u = User::create(['full_name' => 'Student', 'phone' => $phone, 'type' => UserType::Student, 'status' => UserStatus::Active, 'locale' => 'ar']);
        $u->assignRole('student');

        return $u;
    }

    public function test_first_address_becomes_default(): void
    {
        $student = $this->makeStudent();
        Sanctum::actingAs($student);

        $this->postJson('/api/v1/student/addresses', ['label' => 'home', 'address_text' => 'خلدا - عمان', 'lat' => 31.99, 'lng' => 35.85])
            ->assertCreated()
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.label', 'home');
    }

    public function test_setting_a_new_default_unsets_the_previous(): void
    {
        $student = $this->makeStudent();
        Sanctum::actingAs($student);

        $a = $this->postJson('/api/v1/student/addresses', ['label' => 'home', 'address_text' => 'A'])->json('data.id');
        $b = $this->postJson('/api/v1/student/addresses', ['label' => 'university', 'address_text' => 'B'])->json('data.id');

        $this->postJson("/api/v1/student/addresses/{$b}/default")->assertOk()->assertJsonPath('data.is_default', true);

        $this->assertDatabaseHas('saved_addresses', ['id' => $a, 'is_default' => false]);
        $this->assertDatabaseHas('saved_addresses', ['id' => $b, 'is_default' => true]);
    }

    public function test_deleting_default_promotes_another(): void
    {
        $student = $this->makeStudent();
        Sanctum::actingAs($student);

        $a = $this->postJson('/api/v1/student/addresses', ['address_text' => 'A'])->json('data.id'); // default
        $b = $this->postJson('/api/v1/student/addresses', ['address_text' => 'B'])->json('data.id');

        $this->deleteJson("/api/v1/student/addresses/{$a}")->assertOk();

        $this->assertDatabaseMissing('saved_addresses', ['id' => $a]);
        $this->assertDatabaseHas('saved_addresses', ['id' => $b, 'is_default' => true]);
    }

    public function test_cannot_modify_another_users_address(): void
    {
        $owner = $this->makeStudent('0790000010');
        $other = $this->makeStudent('0790000011');

        Sanctum::actingAs($owner);
        $id = $this->postJson('/api/v1/student/addresses', ['address_text' => 'A'])->json('data.id');

        Sanctum::actingAs($other);
        $this->deleteJson("/api/v1/student/addresses/{$id}")->assertStatus(403);
        $this->patchJson("/api/v1/student/addresses/{$id}", ['address_text' => 'hacked'])->assertStatus(403);
    }
}
