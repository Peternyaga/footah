<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table): void {
            $table->unsignedBigInteger('match_id')->nullable()->after('id')->index();
        });
        Schema::table('votes', function (Blueprint $table): void {
            $table->dropUnique(['user_id']);
            $table->unsignedBigInteger('match_id')->nullable()->after('user_id')->index();
            $table->unique(['user_id', 'match_id']);
        });
        Schema::table('bets', function (Blueprint $table): void {
            $table->dropUnique(['user_id']);
            $table->unsignedBigInteger('match_id')->nullable()->after('user_id')->index();
            $table->unique(['user_id', 'match_id']);
        });

        $matchId = DB::table('pool_settings')->orderBy('id')->value('id');
        if ($matchId) {
            DB::table('teams')->whereNull('match_id')->update(['match_id' => $matchId]);
            DB::table('votes')->whereNull('match_id')->update(['match_id' => $matchId]);
            DB::table('bets')->whereNull('match_id')->update(['match_id' => $matchId]);
        }
    }

    public function down(): void
    {
        Schema::table('votes', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'match_id']);
            $table->dropColumn('match_id');
            $table->unique('user_id');
        });
        Schema::table('bets', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'match_id']);
            $table->dropColumn('match_id');
            $table->unique('user_id');
        });
        Schema::table('teams', function (Blueprint $table): void {
            $table->dropColumn('match_id');
        });
    }
};
