<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\DriverStatus;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', DriverStatus::values())->default(DriverStatus::Pending->value)->index();
            $table->unsignedSmallInteger('verification_level')->default(0);
            $table->text('national_id')->nullable(); // encrypted in model
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->unsignedInteger('total_trips')->default(0);
            $table->timestamp('face_verified_at')->nullable();
            $table->timestamp('liveness_verified_at')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_profiles');
    }
};
