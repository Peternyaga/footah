<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('team_id')->constrained()->restrictOnDelete();
            $table->timestamps();
        });

        DB::table('bets')->select(['user_id', 'team_id', 'created_at', 'updated_at'])->orderBy('id')->chunk(100, function ($bets): void {
            foreach ($bets as $bet) {
                DB::table('votes')->updateOrInsert(
                    ['user_id' => $bet->user_id],
                    ['team_id' => $bet->team_id, 'created_at' => $bet->created_at, 'updated_at' => $bet->updated_at],
                );
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
