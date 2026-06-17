<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number', 20)->unique(); // PCL-YYYY-#####
            $table->foreignUuid('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('courier_id')->nullable()->constrained('driver_profiles')->nullOnDelete();

            $table->string('receiver_name');
            $table->string('receiver_phone', 20);

            $table->foreignUuid('from_point_id')->nullable()->constrained('pickup_points')->nullOnDelete();
            $table->foreignUuid('to_point_id')->nullable()->constrained('pickup_points')->nullOnDelete();
            $table->string('from_address')->nullable();
            $table->string('to_address')->nullable();

            $table->string('category', 40)->default('general');
            $table->string('size', 10)->default('small');
            $table->text('description')->nullable();
            $table->bigInteger('fee_fils')->default(0);

            $table->string('status', 20)->default('created');

            // OTPs: sender shares pickup code at handover; receiver shares delivery code.
            $table->string('pickup_code', 6);
            $table->string('delivery_code', 6);
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();

            $table->index(['sender_id', 'status']);
            $table->index(['courier_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcels');
    }
};
