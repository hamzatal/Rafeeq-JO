<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();

            // Master channel switches.
            $table->boolean('push_enabled')->default(true);
            $table->boolean('sms_enabled')->default(true); // critical only by policy

            // Per-category in-app/push toggles.
            $table->boolean('payments')->default(true);
            $table->boolean('trips')->default(true);
            $table->boolean('ratings')->default(true);
            $table->boolean('safety')->default(true); // cannot be muted for critical
            $table->boolean('general')->default(true);

            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
