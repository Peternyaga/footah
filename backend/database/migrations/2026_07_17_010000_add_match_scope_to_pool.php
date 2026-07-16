<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('teams', 'match_id')) {
            Schema::table('teams', function (Blueprint $table): void {
                $table->unsignedBigInteger('match_id')->nullable()->after('id')->index();
            });
        }
        Schema::table('votes', function (Blueprint $table): void {
            $table->index('user_id', 'votes_user_id_foreign_index');
        });
        Schema::table('votes', function (Blueprint $table): void {
            $table->dropUnique(['user_id']);
            $table->unsignedBigInteger('match_id')->nullable()->after('user_id')->index();
            $table->unique(['user_id', 'match_id']);
        });
        Schema::table('bets', function (Blueprint $table): void {
            $table->index('user_id', 'bets_user_id_foreign_index');
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
            $table->dropIndex('votes_user_id_foreign_index');
        });
        Schema::table('bets', function (Blueprint $table): void {
            $table->dropUnique(['user_id', 'match_id']);
            $table->dropColumn('match_id');
            $table->unique('user_id');
            $table->dropIndex('bets_user_id_foreign_index');
        });
        Schema::table('teams', function (Blueprint $table): void {
            $table->dropColumn('match_id');
        });
    }
};
