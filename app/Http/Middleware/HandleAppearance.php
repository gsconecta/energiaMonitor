<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Leer la cookie directamente desde $_COOKIE para evitar errores de descifrado
        // si la cookie fue creada con una clave diferente
        $appearance = $_COOKIE['appearance'] ?? null;
        
        // Si no existe o está vacía, usar el valor por defecto
        if (empty($appearance)) {
            $appearance = 'system';
        }
        
        View::share('appearance', $appearance);

        return $next($request);
    }
}
