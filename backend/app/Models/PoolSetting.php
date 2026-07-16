<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PoolSetting extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    public const STATUS_POSTPONED = 'postponed';

    public const STATUS_SETTLED = 'settled';

    protected $fillable = ['event_name', 'entry_fee', 'betting_closes_at', 'status', 'cost_deduction', 'winner_team_id', 'winner_declared_at', 'postponement_notice'];

    protected function casts(): array
    {
        return ['betting_closes_at' => 'immutable_datetime', 'winner_declared_at' => 'immutable_datetime'];
    }

    public function winnerTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'winner_team_id');
    }

    public function acceptsBets(): bool
    {
        return $this->status === self::STATUS_OPEN && now()->lt($this->betting_closes_at);
    }
}
