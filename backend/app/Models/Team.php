<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = ['code', 'name', 'route', 'color', 'color_secondary', 'active', 'display_order'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }

    public function bets(): HasMany
    {
        return $this->hasMany(Bet::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }
}
