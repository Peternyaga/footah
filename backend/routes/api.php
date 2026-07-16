<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminPoolController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BetController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\MpesaCallbackController;
use App\Http\Controllers\Api\PoolController;
use App\Http\Controllers\Api\VoteController;
use Illuminate\Support\Facades\Route;

Route::get('pool', [PoolController::class, 'show']);
Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('mpesa/callback', [MpesaCallbackController::class, 'store'])->middleware('throttle:120,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('me/vote', [VoteController::class, 'show']);
    Route::put('vote', [VoteController::class, 'store'])->middleware('throttle:20,1');
    Route::post('bets', [BetController::class, 'store'])->middleware('throttle:5,1');
    Route::get('me/bet', [PoolController::class, 'receipt']);
    Route::get('chat', [ChatController::class, 'index']);
    Route::post('chat', [ChatController::class, 'store'])->middleware('throttle:20,1');

    Route::prefix('admin')->middleware('admin')->group(function (): void {
        Route::get('overview', [AdminPoolController::class, 'overview']);
        Route::post('matches', [AdminPoolController::class, 'createMatch']);
        Route::patch('matches/{match}', [AdminPoolController::class, 'updateMatch']);
        Route::put('teams', [AdminPoolController::class, 'updateTeams']);
        Route::patch('settings', [AdminPoolController::class, 'updateSettings']);
        Route::post('bets/{bet}/confirm', [AdminPoolController::class, 'confirmBet']);
        Route::post('settle', [AdminPoolController::class, 'settle']);
        Route::post('payouts/{payout}/paid', [AdminPoolController::class, 'markPayoutPaid']);
    });
});
