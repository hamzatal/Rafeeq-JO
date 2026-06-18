<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-authorisation holds on the prepaid wallet.
 *
 * Before a ride starts, the student's fare is RESERVED (held) so we know the
 * funds (incl. the platform commission) are available before the captain
 * drives. A hold does NOT move money; available balance = balance_fils -
 * held_fils. At boarding the hold is CAPTURED (real debit + captain payout);
 * on cancellation/no-show it is RELEASED. This guarantees the commission can
 * never be bypassed and protects the captain from wasted trips.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Running total of active holds; available = balance_fils - held_fils.
        Schema::table('wallets', function (Blueprint $table) {
            $table->bigInteger('held_fils')->default(0)->after('balance_fils');
        });

        Schema::create('wallet_holds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('amount_fils');
            // active | captured | released
            $table->string('status', 16)->default('active')->index();
            $table->string('reason', 64)->nullable();
            // Logical reference (e.g. trip_id) so a hold can be found/captured.
            $table->uuid('reference')->nullable()->index();
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();

            $table->index(['wallet_id', 'status']);
            $table->index(['reference', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_holds');
        Schema::table('wallets', function (Blueprint $table) {
            $table->dropColumn('held_fils');
        });
    }
};
