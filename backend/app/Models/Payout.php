<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    protected $fillable = ['user_id', 'bet_id', 'amount', 'status', 'mpesa_receipt_number', 'paid_at'];

    protected function casts(): array
    {
        return ['paid_at' => 'immutable_datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bet(): BelongsTo
    {
        return $this->belongsTo(Bet::class);
    }
}
