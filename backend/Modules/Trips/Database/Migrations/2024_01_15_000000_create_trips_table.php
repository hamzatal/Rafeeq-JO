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
            $table->foreignUuid('route_id')->constrained('routes')->cascadeOnDelete();
            $table->foreignUuid('driver_id')->constrained('driver_profiles')->cascadeOnDelete();
            $table->foreignUuid('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
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
