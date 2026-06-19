<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Rafeeq\Shared\Enums\RewardTier;

/**
 * Removes the denormalised `reward_tier` column from `student_profiles`.
 *
 * The single source of truth for a user's reward tier is `reward_accounts.tier`
 * (Rewards module). The profile column was never updated after creation (it stayed
 * at the Bronze default), so it could silently drift. The StudentProfileResource now
 * derives the tier from the reward account, keeping the API response shape identical.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('student_profiles', 'reward_tier')) {
            Schema::table('student_profiles', function (Blueprint $table) {
                $table->dropColumn('reward_tier');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('student_profiles', 'reward_tier')) {
            Schema::table('student_profiles', function (Blueprint $table) {
                $table->string('reward_tier', 20)->default(RewardTier::Bronze->value);
            });
        }
    }
};
