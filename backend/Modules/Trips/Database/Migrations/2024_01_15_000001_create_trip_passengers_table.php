<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\TripPassengerStatus;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trip_passengers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->foreignUuid('pickup_point_id')->nullable()->constrained('pickup_points')->nullOnDelete();
            $table->enum('status', TripPassengerStatus::values())->default(TripPassengerStatus::Booked->value);
            $table->string('boarding_code', 8); // Trip OTP (security layer 6)
            $table->timestamp('boarded_at')->nullable();
            $table->timestamps();

            $table->unique(['trip_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_passengers');
    }
};
