<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two-factor authentication (TOTP) for staff/admin accounts.
 *  - mfa_secret: base32 TOTP shared secret (stored encrypted via model cast)
 *  - mfa_enabled_at: when 2FA was confirmed/activated (null = disabled)
 *  - mfa_recovery_codes: hashed single-use recovery codes (encrypted json)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('mfa_secret')->nullable()->after('password');
            $table->timestamp('mfa_enabled_at')->nullable()->after('mfa_secret');
            $table->text('mfa_recovery_codes')->nullable()->after('mfa_enabled_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mfa_secret', 'mfa_enabled_at', 'mfa_recovery_codes']);
        });
    }
};
