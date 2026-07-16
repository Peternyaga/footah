<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\Team;
use App\Models\User;
use App\Models\Vote;
use App\Services\Payments\Mpesa\MpesaStkPushService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class BetService
{
    public function __construct(
        private readonly MpesaStkPushService $stkPush,
        private readonly AuditService $audit,
    ) {}

    /** @return array<string, mixed> */
    public function initiate(User $user, int $teamId): array
    {
        $team = Team::query()->with('match')->whereKey($teamId)->where('active', true)->firstOrFail();
        $settings = $team->match;
        if (! $settings) {
            throw new RuntimeException('This team is not assigned to a match.');
        }
        if (! $settings->acceptsBets()) {
            throw new RuntimeException('Betting is closed.');
        }

        $bet = DB::transaction(function () use ($user, $team, $settings): Bet {
            User::query()->whereKey($user->id)->lockForUpdate()->first();
            $existing = Bet::query()->where('user_id', $user->id)->where('match_id', $settings->id)->lockForUpdate()->first();

            if ($existing?->status === Bet::STATUS_CONFIRMED) {
                throw new RuntimeException('Your confirmed pick cannot be changed.');
            }
            if ($existing?->status === Bet::STATUS_PROCESSING && $existing->initiated_at?->gt(now()->subMinutes(2))) {
                throw new RuntimeException('An M-Pesa request is already processing.');
            }

            Vote::query()->updateOrCreate(['user_id' => $user->id, 'match_id' => $settings->id], ['team_id' => $team->id]);

            $values = [
                'team_id' => $team->id,
                'match_id' => $settings->id,
                'amount' => $settings->entry_fee,
                'status' => Bet::STATUS_PENDING,
                'merchant_request_id' => null,
                'checkout_request_id' => null,
                'mpesa_receipt_number' => null,
                'result_code' => null,
                'result_description' => null,
                'raw_request' => null,
                'raw_response' => null,
                'raw_callback' => null,
                'initiated_at' => now(),
                'confirmed_at' => null,
            ];

            if ($existing) {
                $existing->update($values);

                return $existing->fresh();
            }

            return Bet::create(array_merge($values, ['public_id' => (string) Str::uuid(), 'user_id' => $user->id]));
        });

        try {
            $result = $this->stkPush->initiate($bet, (string) $user->phone_number);
            $response = $result['response'];

            if ((string) ($response['ResponseCode'] ?? '') !== '0') {
                throw new RuntimeException((string) ($response['errorMessage'] ?? 'STK Push was rejected.'));
            }

            $bet->update([
                'status' => Bet::STATUS_PROCESSING,
                'merchant_request_id' => (string) ($response['MerchantRequestID'] ?? ''),
                'checkout_request_id' => (string) ($response['CheckoutRequestID'] ?? ''),
                'raw_request' => $result['request'],
                'raw_response' => $response,
                'result_description' => (string) ($response['CustomerMessage'] ?? 'STK Push sent.'),
            ]);
            $this->audit->record('bet.stk_requested', $user, $bet, ['team_id' => $team->id]);

            return ['id' => $bet->public_id, 'status' => Bet::STATUS_PROCESSING, 'message' => $bet->result_description];
        } catch (Throwable $exception) {
            $bet->update(['status' => Bet::STATUS_FAILED, 'result_description' => $exception->getMessage()]);
            $this->audit->record('bet.stk_failed', $user, $bet, ['message' => $exception->getMessage()]);
            throw $exception;
        }
    }
}
