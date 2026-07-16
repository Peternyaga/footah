<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\Mpesa\MpesaCallbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MpesaCallbackController extends Controller
{
    public function __construct(private readonly MpesaCallbackService $callbacks) {}

    public function store(Request $request): JsonResponse
    {
        $payload = $request->all();
        if (! is_string(data_get($payload, 'Body.stkCallback.CheckoutRequestID'))) {
            return response()->json(['ResultCode' => 1, 'ResultDesc' => 'Invalid callback payload.'], 422);
        }

        $bet = $this->callbacks->handle($payload);

        return response()->json(['ResultCode' => 0, 'ResultDesc' => $bet ? 'Accepted' : 'Accepted; transaction not found.']);
    }
}
