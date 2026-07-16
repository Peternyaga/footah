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

    public function overview(): JsonResponse
    {
        $users = User::query()->where('role', User::ROLE_PARTICIPANT)->with(['bet.team', 'bet.payout'])->latest()->get();

        return response()->json(['data' => [
            'settings' => PoolSetting::query()->with('winnerTeam')->first(),
            'teams' => Team::query()->orderBy('display_order')->get(),
            'registrations' => $users->map(fn (User $user): array => [
                'id' => $user->public_id,
                'name' => $user->name,
                'phone_number' => $user->phone_number,
                'created_at' => $user->created_at->toIso8601String(),
                'bet' => $user->bet ? [
                    'id' => $user->bet->id,
                    'public_id' => $user->bet->public_id,
                    'team' => $user->bet->team->name,
                    'team_id' => $user->bet->team_id,
                    'amount' => $user->bet->amount,
                    'status' => $user->bet->status,
                    'mpesa_receipt_number' => $user->bet->mpesa_receipt_number,
                    'result_description' => $user->bet->result_description,
                    'payout' => $user->bet->payout?->amount,
                ] : null,
            ]),
        ]]);
    }

    public function updateTeams(Request $request): JsonResponse
    {
        $data = $request->validate(['teams' => ['required', 'array', 'size:2'], 'teams.*.id' => ['required', 'integer', 'exists:teams,id'], 'teams.*.name' => ['required', 'string', 'max:120'], 'teams.*.route' => ['nullable', 'string', 'max:255']]);
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

        return response()->json(['data' => $this->payouts->settle(Team::findOrFail($data['winner_team_id']), $request->user())]);
    }

    public function markPayoutPaid(Request $request, Payout $payout): JsonResponse
    {
        $data = $request->validate(['mpesa_receipt_number' => ['required', 'string', 'max:30']]);
        $payout->update(['status' => 'paid', 'mpesa_receipt_number' => strtoupper($data['mpesa_receipt_number']), 'paid_at' => now()]);
        $this->audit->record('payout.marked_paid', $request->user(), $payout, ['receipt' => $payout->mpesa_receipt_number], $request);

        return response()->json(['data' => $payout->fresh()]);
    }
}
