<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyApiKey
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key') 
            ?? $request->header('Authorization') 
            ?? $request->query('api_key');

        // Si viene en Authorization header, extraer el token (formato: Bearer {token} o solo {token})
        if ($request->header('Authorization')) {
            $authHeader = $request->header('Authorization');
            if (str_starts_with($authHeader, 'Bearer ')) {
                $apiKey = substr($authHeader, 7);
            } else {
                $apiKey = $authHeader;
            }
        }

        $validApiKey = config('app.api_key');

        if (empty($validApiKey)) {
            return response()->json([
                'error' => 'API key no configurada en el servidor'
            ], 500);
        }

        if (empty($apiKey) || $apiKey !== $validApiKey) {
            return response()->json([
                'error' => 'API key inválida o no proporcionada'
            ], 401);
        }

        return $next($request);
    }
}

