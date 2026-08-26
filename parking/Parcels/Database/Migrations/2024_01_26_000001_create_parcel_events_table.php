<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcel_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('parcel_id')->constrained('parcels')->cascadeOnDelete();
            $table->string('type', 30); // created | assigned | picked_up | delivered | cancelled
            $table->foreignUuid('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('at');
            $table->timestamps();

            $table->index('parcel_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcel_events');
    }
};
