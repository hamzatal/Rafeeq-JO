<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Rafeeq\Modules\Auth\Models\User;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $phone = env('SEED_ADMIN_PHONE', '+962790000000');

        /** @var User $admin */
        $admin = User::updateOrCreate(
            ['email' => env('SEED_ADMIN_EMAIL', 'hamza.t.a.altal@gmail.com')],
            [
                'phone' => $phone,
                'full_name' => env('SEED_ADMIN_NAME', 'Hamza Al-Tal'),
                'password' => Hash::make(env('SEED_ADMIN_PASSWORD', '@GBq9961066384$')),
                'type' => UserType::Admin,
                'status' => UserStatus::Active,
                'phone_verified_at' => now(),
                'email_verified_at' => now(),
                'locale' => 'ar',
            ],
        );

        $admin->syncRoles(['admin']);

        $this->command?->info("Admin seeded: {$admin->email} (login by email + SEED_ADMIN_PASSWORD).");
    }
}
