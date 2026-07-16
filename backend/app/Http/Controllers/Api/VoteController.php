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
        $matchId = (int) ($request->query('match_id') ?: PoolSetting::current()->id);
        $vote = $request->user()->votes()->where('match_id', $matchId)->with('team')->first();

        return response()->json(['data' => $vote ? $this->voteData($vote) : null]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['team_id' => ['required', 'integer', 'exists:teams,id']]);
        $team = Team::query()->with('match')->whereKey($data['team_id'])->where('active', true)->firstOrFail();
        $settings = $team->match;
        if (! $settings) {
            return response()->json(['message' => 'This team is not assigned to a match.'], 422);
        }
        if (! $settings->acceptsBets()) {
            return response()->json(['message' => 'Voting is closed.'], 422);
        }

        $vote = Vote::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'match_id' => $settings->id],
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
