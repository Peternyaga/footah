<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\Payout;
use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PayoutService
{
    public function __construct(private readonly AuditService $audit) {}

    /** @return array<string, mixed> */
    public function settle(Team $winner, User $admin): array
    {
        $result = DB::transaction(function () use ($winner): array {
            $settings = PoolSetting::query()->whereKey($winner->match_id)->lockForUpdate()->firstOrFail();
            if ($settings->status === PoolSetting::STATUS_SETTLED) {
                if ($settings->winner_team_id !== $winner->id) {
                    throw new RuntimeException('The pool is already settled with another winner.');
                }

                return $this->summary($settings);
            }

            $allBets = Bet::query()->where('match_id', $settings->id)->where('status', Bet::STATUS_CONFIRMED)->orderBy('id')->lockForUpdate()->get();
            $winningBets = $allBets->where('team_id', $winner->id)->values();
            $totalPool = (int) $allBets->sum('amount');
            $distributable = max(0, $totalPool - $settings->cost_deduction);
            $base = $winningBets->isEmpty() ? 0 : intdiv($distributable, $winningBets->count());
            $remainder = $winningBets->isEmpty() ? 0 : $distributable % $winningBets->count();

            foreach ($winningBets as $index => $bet) {
                Payout::updateOrCreate(
                    ['bet_id' => $bet->id],
                    ['user_id' => $bet->user_id, 'amount' => $base + ($index < $remainder ? 1 : 0), 'status' => 'pending']
                );
            }

            $settings->update(['status' => PoolSetting::STATUS_SETTLED, 'winner_team_id' => $winner->id, 'winner_declared_at' => now()]);

            return $this->summary($settings->fresh('winnerTeam'));
        });

        $this->audit->record('pool.settled', $admin, $winner, $result);

        return $result;
    }

    /** @return array<string, mixed> */
    private function summary(PoolSetting $settings): array
    {
        return [
            'winner_team_id' => $settings->winner_team_id,
            'winner' => $settings->winnerTeam?->name,
            'total_pool' => (int) Bet::query()->where('match_id', $settings->id)->where('status', Bet::STATUS_CONFIRMED)->sum('amount'),
            'cost_deduction' => $settings->cost_deduction,
            'payouts' => Payout::query()->whereHas('bet', fn ($query) => $query->where('match_id', $settings->id))->with('user:id,name')->orderBy('id')->get()->map(fn (Payout $payout): array => ['name' => $payout->user->name, 'amount' => $payout->amount, 'status' => $payout->status])->all(),
        ];
    }
}
