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
            // Door-to-door pickup (student's home coordinates)
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->unsignedSmallInteger('pickup_order')->nullable(); // optimized sequence
            $table->enum('status', TripPassengerStatus::values())->default(TripPassengerStatus::Booked->value);
            $table->string('boarding_code', 8); // Trip OTP at boarding (security layer 6)
            $table->string('dropoff_code', 8)->nullable(); // OTP at drop-off (anti-fraud)
            $table->unsignedInteger('fare_fils')->default(0);
            $table->unsignedInteger('commission_fils')->default(0);
            $table->unsignedInteger('captain_share_fils')->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('boarded_at')->nullable();
            $table->timestamp('dropoff_confirmed_at')->nullable();
            $table->timestamps();

            $table->unique(['trip_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_passengers');
    }
};
