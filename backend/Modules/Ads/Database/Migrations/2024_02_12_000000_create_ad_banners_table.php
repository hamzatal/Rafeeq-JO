<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-app advertising banners, fully managed from the admin dashboard.
 *
 * Each banner targets a placement slot (e.g. the student home screen), is
 * shown only while active and within its optional date window, and is ordered
 * by `sort_order`. Keeping this DB-driven lets the business run promotions
 * without shipping an app update.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_banners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title', 150);
            $table->string('image_url', 500);
            $table->string('link_url', 500)->nullable();
            // Slot the banner renders in (student_home, student_wallet, driver_home, ...).
            $table->string('placement', 40)->index();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedSmallInteger('sort_order')->default(0);
            // Optional scheduling window; null bounds mean "no limit" on that side.
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_banners');
    }
};
