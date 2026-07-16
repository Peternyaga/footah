<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Bet extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_TIMEOUT = 'timeout';

    protected $fillable = ['public_id', 'user_id', 'match_id', 'team_id', 'amount', 'status', 'merchant_request_id', 'checkout_request_id', 'mpesa_receipt_number', 'result_code', 'result_description', 'raw_request', 'raw_response', 'raw_callback', 'initiated_at', 'confirmed_at'];

    public function match(): BelongsTo
    {
        return $this->belongsTo(PoolSetting::class, 'match_id');
    }

    protected $hidden = ['raw_request', 'raw_response', 'raw_callback'];

    protected function casts(): array
    {
        return ['raw_request' => 'array', 'raw_response' => 'array', 'raw_callback' => 'array', 'initiated_at' => 'immutable_datetime', 'confirmed_at' => 'immutable_datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function payout(): HasOne
    {
        return $this->hasOne(Payout::class);
    }
}
