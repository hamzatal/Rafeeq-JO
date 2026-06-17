<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\TripStatus;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('route_id')->nullable()->constrained('routes')->nullOnDelete();
            $table->foreignUuid('driver_id')->nullable()->constrained('driver_profiles')->nullOnDelete();
            $table->foreignUuid('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            // Pooled (door-to-door) trips: origin zone + destination university (no fixed route).
            $table->uuid('zone_id')->nullable()->index();
            $table->foreignUuid('university_id')->nullable()->constrained('universities')->nullOnDelete();
            $table->string('type', 20)->default('scheduled'); // scheduled | pooled
            $table->timestamp('scheduled_at')->index();
            $table->enum('status', TripStatus::values())->default(TripStatus::Scheduled->value)->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedSmallInteger('capacity')->default(4); // private car
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};
