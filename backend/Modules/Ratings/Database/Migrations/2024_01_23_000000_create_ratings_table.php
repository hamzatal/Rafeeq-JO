<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ratings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('trip_id')->constrained('trips')->cascadeOnDelete();
            $table->foreignUuid('rater_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('ratee_id')->constrained('users')->cascadeOnDelete();
            $table->string('direction', 30); // student_rates_driver | driver_rates_student
            $table->unsignedTinyInteger('stars'); // 1..5
            $table->text('comment')->nullable();
            $table->timestamps();

            // One rating per rater per trip per direction.
            $table->unique(['trip_id', 'rater_id', 'direction']);
            $table->index('ratee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
