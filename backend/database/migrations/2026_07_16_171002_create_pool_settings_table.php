<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pool_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('event_name')->default('2026 World Cup Final');
            $table->unsignedInteger('entry_fee')->default(100);
            $table->timestampTz('betting_closes_at');
            $table->string('status', 20)->default('open')->index();
            $table->unsignedInteger('cost_deduction')->default(0);
            $table->foreignId('winner_team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->timestampTz('winner_declared_at')->nullable();
            $table->text('postponement_notice')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pool_settings');
    }
};
