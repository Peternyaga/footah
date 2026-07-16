<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PoolSetting;
use App\Models\Team;
use App\Models\Vote;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoteController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function show(Request $request): JsonResponse
    {
        $vote = $request->user()->vote()->with('team')->first();

        return response()->json(['data' => $vote ? $this->voteData($vote) : null]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['team_id' => ['required', 'integer', 'exists:teams,id']]);
        $settings = PoolSetting::query()->firstOrFail();
        if (! $settings->acceptsBets()) {
            return response()->json(['message' => 'Voting is closed.'], 422);
        }

        $team = Team::query()->whereKey($data['team_id'])->where('active', true)->firstOrFail();
        $vote = Vote::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['team_id' => $team->id],
        );
        $vote->setRelation('team', $team);
        $this->audit->record('participant.voted', $request->user(), $vote, ['team_id' => $team->id], $request);

        return response()->json(['data' => $this->voteData($vote)]);
    }

    /** @return array<string, mixed> */
    private function voteData(Vote $vote): array
    {
        return [
            'team' => [
                'id' => $vote->team->id,
                'code' => $vote->team->code,
                'name' => $vote->team->name,
                'route' => $vote->team->route,
                'color' => $vote->team->color,
                'color_secondary' => $vote->team->color_secondary,
            ],
            'voted_at' => $vote->updated_at?->toIso8601String(),
        ];
    }
}
