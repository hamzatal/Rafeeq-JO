<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\Gender;
use Rafeeq\Shared\Enums\RewardTier;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            // university_id / default_pickup_point_id FKs added in Phase 2.
            $table->uuid('university_id')->nullable()->index();
            $table->uuid('default_pickup_point_id')->nullable()->index();
            $table->string('student_number', 50)->nullable();
            $table->string('faculty', 120)->nullable();
            $table->enum('gender', Gender::values())->nullable();
            $table->enum('reward_tier', RewardTier::values())->default(RewardTier::Bronze->value);
            $table->boolean('onboarded')->default(false);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
