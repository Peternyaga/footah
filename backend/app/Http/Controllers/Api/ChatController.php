<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): JsonResponse
    {
        $messages = ChatMessage::query()->with('user:id,name')->whereNull('moderated_at')->latest('id')->limit(100)->get()->reverse()->values();

        return response()->json(['data' => $messages->map(fn (ChatMessage $message): array => $this->data($message))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['message' => ['required', 'string', 'min:1', 'max:500']]);
        $message = ChatMessage::create(['user_id' => $request->user()->id, 'message' => trim($data['message'])])->load('user:id,name');
        $this->audit->record('chat.posted', $request->user(), $message, [], $request);

        return response()->json(['data' => $this->data($message)], 201);
    }

    /** @return array<string, mixed> */
    private function data(ChatMessage $message): array
    {
        return ['id' => $message->id, 'name' => $message->user->name, 'message' => $message->message, 'created_at' => $message->created_at->toIso8601String()];
    }
}
