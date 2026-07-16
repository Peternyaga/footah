<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PoolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PoolController extends Controller
{
    public function __construct(private readonly PoolService $pool) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->pool->publicState($request->integer('match_id') ?: null)]);
    }

    public function receipt(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->pool->receipt($request->user(), $request->integer('match_id') ?: null)]);
    }
}
