<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // The bank's own transaction/reference number printed on the receipt.
            // Used to guarantee a single transfer can only be claimed once.
            $table->string('bank_reference', 120)->nullable()->after('verified_by');
            // SHA-256 of the uploaded image — detects re-uploading the same screenshot.
            $table->string('image_hash', 64)->nullable()->after('bank_reference');
            // Detected anti-fraud signals, e.g. ["duplicate_reference","beneficiary_mismatch"].
            $table->json('fraud_flags')->nullable()->after('image_hash');

            $table->index('bank_reference');
            $table->index('image_hash');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['bank_reference']);
            $table->dropIndex(['image_hash']);
            $table->dropColumn(['bank_reference', 'image_hash', 'fraud_flags']);
        });
    }
};
