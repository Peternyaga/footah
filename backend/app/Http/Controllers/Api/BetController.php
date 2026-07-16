<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BetController extends Controller
{
    public function __construct(private readonly BetService $bets) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['team_id' => ['required', 'integer', 'exists:teams,id']]);
        try {
            return response()->json(['data' => $this->bets->initiate($request->user(), (int) $data['team_id'])], 202);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }
}
