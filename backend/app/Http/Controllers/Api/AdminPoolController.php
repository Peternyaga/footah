<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bet;
use App\Models\Payout;
use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\User;
use App\Services\AuditService;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminPoolController extends Controller
{
    public function __construct(private readonly AuditService $audit, private readonly PayoutService $payouts) {}

    public function overview(Request $request): JsonResponse
    {
        $match = $request->integer('match_id')
            ? PoolSetting::query()->findOrFail($request->integer('match_id'))
            : PoolSetting::current();
        $users = User::query()->where('role', User::ROLE_PARTICIPANT)
            ->with(['bets' => fn ($query) => $query->where('match_id', $match->id)->with(['team', 'payout'])])
            ->latest()->get();

        return response()->json(['data' => [
            'settings' => $match->load('winnerTeam'),
            'teams' => Team::query()->where('match_id', $match->id)->orderBy('display_order')->get(),
            'matches' => PoolSetting::query()->with(['winnerTeam', 'teams' => fn ($query) => $query->orderBy('display_order')])->latest('id')->get(),
            'registrations' => $users->map(function (User $user): array {
                $bet = $user->bets->first();

                return [
                    'id' => $user->public_id,
                    'name' => $user->name,
                    'phone_number' => $user->phone_number,
                    'created_at' => $user->created_at->toIso8601String(),
                    'bet' => $bet ? [
                        'id' => $bet->id,
                        'public_id' => $bet->public_id,
                        'team' => $bet->team->name,
                        'team_id' => $bet->team_id,
                        'amount' => $bet->amount,
                        'status' => $bet->status,
                        'mpesa_receipt_number' => $bet->mpesa_receipt_number,
                        'result_description' => $bet->result_description,
                        'payout' => $bet->payout ? [
                            'id' => $bet->payout->id,
                            'amount' => $bet->payout->amount,
                            'status' => $bet->payout->status,
                            'mpesa_receipt_number' => $bet->payout->mpesa_receipt_number,
                            'paid_at' => $bet->payout->paid_at?->toIso8601String(),
                        ] : null,
                    ] : null,
                ];
            }),
        ]]);
    }

    public function createMatch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'event_name' => ['required', 'string', 'max:160'],
            'entry_fee' => ['required', 'integer', 'min:1'],
            'betting_closes_at' => ['required', 'date', 'after:now'],
            'teams' => ['required', 'array', 'size:2'],
            'teams.*.name' => ['required', 'string', 'max:120'],
            'teams.*.route' => ['nullable', 'string', 'max:255'],
        ]);

        $match = DB::transaction(function () use ($data): PoolSetting {
            $match = PoolSetting::create([
                'event_name' => trim($data['event_name']),
                'entry_fee' => $data['entry_fee'],
                'betting_closes_at' => $data['betting_closes_at'],
                'status' => PoolSetting::STATUS_OPEN,
                'cost_deduction' => 0,
            ]);
            $palette = [['#ef634d', '#f0b24e'], ['#376fdc', '#58c6ff']];
            foreach ($data['teams'] as $index => $team) {
                Team::create([
                    'match_id' => $match->id,
                    'code' => 'M'.$match->id.($index === 0 ? 'A' : 'B'),
                    'name' => trim($team['name']),
                    'route' => $team['route'] ?? null,
                    'color' => $palette[$index][0],
                    'color_secondary' => $palette[$index][1],
                    'display_order' => $index + 1,
                    'active' => true,
                ]);
            }

            return $match;
        });
        $this->audit->record('match.created', $request->user(), $match, ['team_names' => collect($data['teams'])->pluck('name')->all()], $request);

        return response()->json(['data' => $match->load('teams')], 201);
    }

    public function updateMatch(Request $request, PoolSetting $match): JsonResponse
    {
        if ($match->status === PoolSetting::STATUS_SETTLED) {
            return response()->json(['message' => 'A settled match cannot be changed.'], 422);
        }
        $data = $request->validate([
            'event_name' => ['sometimes', 'required', 'string', 'max:160'],
            'entry_fee' => ['sometimes', 'integer', 'min:1'],
            'betting_closes_at' => ['sometimes', 'date'],
            'status' => ['sometimes', 'in:open,closed,postponed'],
        ]);
        $match->update($data);
        $this->audit->record('match.updated', $request->user(), $match, $data, $request);

        return response()->json(['data' => $match->fresh(['winnerTeam', 'teams'])]);
    }

    public function updateTeams(Request $request): JsonResponse
    {
        $data = $request->validate(['teams' => ['required', 'array', 'size:2'], 'teams.*.id' => ['required', 'integer', 'exists:teams,id'], 'teams.*.name' => ['required', 'string', 'max:120'], 'teams.*.route' => ['nullable', 'string', 'max:255']]);
        $matches = Team::query()->whereIn('id', collect($data['teams'])->pluck('id'))->pluck('match_id')->unique();
        if ($matches->count() !== 1 || PoolSetting::query()->whereKey($matches->first())->where('status', PoolSetting::STATUS_SETTLED)->exists()) {
            return response()->json(['message' => 'These teams cannot be edited after the match is settled.'], 422);
        }
        DB::transaction(function () use ($data): void {
            foreach ($data['teams'] as $item) {
                Team::query()->whereKey($item['id'])->update(['name' => trim($item['name']), 'route' => $item['route'] ?? null]);
            }
        });
        $this->audit->record('pool.teams_updated', $request->user(), null, ['team_ids' => collect($data['teams'])->pluck('id')->all()], $request);

        return response()->json(['data' => Team::query()->orderBy('display_order')->get()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate(['betting_closes_at' => ['sometimes', 'date'], 'cost_deduction' => ['sometimes', 'integer', 'min:0'], 'status' => ['sometimes', 'in:open,closed,postponed'], 'postponement_notice' => ['nullable', 'string', 'max:1000']]);
        $settings = PoolSetting::query()->firstOrFail();
        if ($settings->status === PoolSetting::STATUS_SETTLED) {
            return response()->json(['message' => 'Settled settings are immutable.'], 422);
        }
        $settings->update($data);
        $this->audit->record('pool.settings_updated', $request->user(), $settings, $data, $request);

        return response()->json(['data' => $settings->fresh()]);
    }

    public function confirmBet(Request $request, Bet $bet): JsonResponse
    {
        $data = $request->validate(['mpesa_receipt_number' => ['required', 'string', 'max:30', 'unique:bets,mpesa_receipt_number,'.$bet->id]]);
        if ($bet->status === Bet::STATUS_CONFIRMED) {
            return response()->json(['data' => $bet]);
        }
        $bet->update(['status' => Bet::STATUS_CONFIRMED, 'mpesa_receipt_number' => strtoupper($data['mpesa_receipt_number']), 'result_code' => 0, 'result_description' => 'Manually reconciled by the organiser.', 'confirmed_at' => now()]);
        $this->audit->record('bet.manually_confirmed', $request->user(), $bet, ['receipt' => $bet->mpesa_receipt_number], $request);

        return response()->json(['data' => $bet->fresh('team')]);
    }

    public function settle(Request $request): JsonResponse
    {
        $data = $request->validate(['winner_team_id' => ['required', 'integer', 'exists:teams,id']]);

        $team = Team::query()->whereKey($data['winner_team_id'])->whereNotNull('match_id')->firstOrFail();

        return response()->json(['data' => $this->payouts->settle($team, $request->user())]);
    }

    public function markPayoutPaid(Request $request, Payout $payout): JsonResponse
    {
        $data = $request->validate(['mpesa_receipt_number' => ['required', 'string', 'max:30']]);
        $payout->update(['status' => 'paid', 'mpesa_receipt_number' => strtoupper($data['mpesa_receipt_number']), 'paid_at' => now()]);
        $this->audit->record('payout.marked_paid', $request->user(), $payout, ['receipt' => $payout->mpesa_receipt_number], $request);

        return response()->json(['data' => $payout->fresh()]);
    }
}
