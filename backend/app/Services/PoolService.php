<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\User;

class PoolService
{
    /** @return array<string, mixed> */
    public function publicState(): array
    {
        $settings = PoolSetting::query()->with('winnerTeam')->firstOrFail();
        $teams = Team::query()
            ->where('active', true)
            ->orderBy('display_order')
            ->withCount('votes')
            ->withCount(['bets as backers' => fn ($query) => $query->where('status', Bet::STATUS_CONFIRMED)])
            ->withSum(['bets as pooled' => fn ($query) => $query->where('status', Bet::STATUS_CONFIRMED)], 'amount')
            ->get();
        $totalPool = (int) Bet::query()->where('status', Bet::STATUS_CONFIRMED)->sum('amount');
        $status = $settings->acceptsBets()
            ? PoolSetting::STATUS_OPEN
            : ($settings->status === PoolSetting::STATUS_OPEN ? PoolSetting::STATUS_CLOSED : $settings->status);

        return [
            'event_name' => $settings->event_name,
            'entry_fee' => $settings->entry_fee,
            'betting_closes_at' => $settings->betting_closes_at->toIso8601String(),
            'status' => $status,
            'cost_deduction' => $settings->cost_deduction,
            'total_pool' => $totalPool,
            'confirmed_entries' => (int) $teams->sum('backers'),
            'winner' => $settings->winnerTeam ? $this->teamData($settings->winnerTeam) : null,
            'postponement_notice' => $settings->postponement_notice,
            'teams' => $teams->map(fn (Team $team): array => array_merge($this->teamData($team), [
                'backers' => (int) $team->backers,
                'votes' => (int) $team->votes_count,
                'pooled' => (int) ($team->pooled ?? 0),
            ]))->values(),
        ];
    }

    /** @return array<string, mixed>|null */
    public function receipt(User $user): ?array
    {
        $bet = $user->bet()->with(['team', 'payout'])->first();
        if (! $bet) {
            return null;
        }

        $settings = PoolSetting::query()->first();
        $isWinner = $settings?->winner_team_id === $bet->team_id && $bet->status === Bet::STATUS_CONFIRMED;

        return [
            'id' => $bet->public_id,
            'team' => $this->teamData($bet->team),
            'amount' => $bet->amount,
            'status' => $bet->status,
            'mpesa_receipt_number' => $bet->mpesa_receipt_number,
            'result_description' => $bet->result_description,
            'initiated_at' => $bet->initiated_at?->toIso8601String(),
            'confirmed_at' => $bet->confirmed_at?->toIso8601String(),
            'payout' => $bet->payout?->amount,
            'fellow_winners' => $isWinner
                ? User::query()->whereHas('bet', fn ($query) => $query->where('team_id', $bet->team_id)->where('status', Bet::STATUS_CONFIRMED))->orderBy('name')->pluck('name')
                : [],
        ];
    }

    /** @return array<string, mixed> */
    private function teamData(Team $team): array
    {
        return ['id' => $team->id, 'code' => $team->code, 'name' => $team->name, 'route' => $team->route, 'color' => $team->color, 'color_secondary' => $team->color_secondary];
    }
}
