<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('route_stops', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('route_id')->constrained('routes')->cascadeOnDelete();
            $table->foreignUuid('pickup_point_id')->constrained('pickup_points')->cascadeOnDelete();
            $table->unsignedSmallInteger('stop_order')->default(0);
            $table->unsignedSmallInteger('eta_minutes')->nullable();
            $table->timestamps();

            $table->index(['route_id', 'stop_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
