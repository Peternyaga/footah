<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NormalizeAuthorizationHeader
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken()) {
            $authorization = $request->headers->get('X-Authorization');

            if (is_string($authorization) && preg_match('/^Bearer\s+\S+$/i', $authorization) === 1) {
                $request->headers->set('Authorization', $authorization);
                $request->server->set('HTTP_AUTHORIZATION', $authorization);
            }
        }

        return $next($request);
    }
}
