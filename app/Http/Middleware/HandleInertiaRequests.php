<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $shared = [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => !isset($_COOKIE['sidebar_state']) || $_COOKIE['sidebar_state'] === 'true',
            'organizacion_actual' => null,
            'sitio_actual' => null,
        ];

        // Compartir contexto actual si el usuario está autenticado
        if ($request->user()) {
            $organizacionActualId = $request->session()->get('organizacion_actual_id');
            $sitioActualId = $request->session()->get('sitio_actual_id');

            if ($organizacionActualId && $sitioActualId) {
                $organizacion = \App\Models\Organizacion::find($organizacionActualId);
                $sitio = \App\Models\Sitio::find($sitioActualId);

                if ($organizacion && $sitio) {
                    $shared['organizacion_actual'] = [
                        'id' => $organizacion->id,
                        'nombre' => $organizacion->nombre,
                        'codigo' => $organizacion->codigo,
                        'tipo_perfil' => $organizacion->tipo_perfil,
                    ];
                    $shared['sitio_actual'] = [
                        'id' => $sitio->id,
                        'nombre' => $sitio->nombre,
                        'codigo' => $sitio->codigo,
                    ];
                }
            }
        }

        return $shared;
    }
}
