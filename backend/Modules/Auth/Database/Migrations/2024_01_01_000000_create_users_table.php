<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\UserStatus;
use Rafeeq\Shared\Enums\UserType;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name', 150);
            $table->string('phone', 20)->unique();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('email', 150)->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->enum('type', UserType::values())->default(UserType::Student->value)->index();
            $table->enum('status', UserStatus::values())->default(UserStatus::Pending->value)->index();
            $table->string('locale', 5)->default('ar');
            $table->string('avatar_path')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
