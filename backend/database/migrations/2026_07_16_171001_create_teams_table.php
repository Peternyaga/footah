<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 12)->unique();
            $table->string('name');
            $table->string('route')->nullable();
            $table->string('color', 20)->default('#ef634d');
            $table->string('color_secondary', 20)->default('#f0b24e');
            $table->boolean('active')->default(true);
            $table->unsignedTinyInteger('display_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
