<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Financial reports join/filter trip_passengers by student_id and paid_at.
 * student_id is only the SECOND column of the unique(trip_id, student_id)
 * index, so a standalone index is required; paid_at had none. Prevents
 * sequential scans on the money-reporting hot path as data grows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->index('student_id', 'trip_passengers_student_id_index');
            $table->index('paid_at', 'trip_passengers_paid_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('trip_passengers', function (Blueprint $table) {
            $table->dropIndex('trip_passengers_student_id_index');
            $table->dropIndex('trip_passengers_paid_at_index');
        });
    }
};
