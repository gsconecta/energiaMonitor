<?php

namespace App\Http\Controllers;

use App\Models\CredencialShelly;
use App\Models\Organizacion;
use App\Models\Sitio;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SeleccionarContextoController extends Controller
{
    /**
     * Mostrar la página de selección de contexto
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $organizaciones = $user->organizacionesActivas()
            ->with(['sitios' => function ($query) {
                $query->activos()->withCount('dispositivos');
            }])
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'nombre' => $org->nombre,
                    'codigo' => $org->codigo,
                    'sitios' => $org->sitios->map(fn ($s) => [
                        'id' => $s->id,
                        'nombre' => $s->nombre,
                        'codigo' => $s->codigo,
                        'activa' => $s->activa,
                        'dispositivos_count' => $s->dispositivos_count,
                    ]),
                ];
            });

        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        $sitioActualId = $request->session()->get('sitio_actual_id');
        $credencialesShelly = $user->esAdminOTecnico() ? CredencialShelly::all() : [];

        return Inertia::render('SeleccionarContexto/Index', [
            'organizaciones' => $organizaciones,
            'organizacion_actual_id' => $organizacionActualId,
            'sitio_actual_id' => $sitioActualId,
            'credenciales_shelly' => $credencialesShelly,
        ]);
    }

    /**
     * Guardar la selección de organización y sitio en la sesión
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'organizacion_id' => 'required|exists:organizaciones,id',
            'sitio_id' => 'nullable|exists:sitios,id',
        ]);

        $user = auth()->user();

        // Verificar que el usuario pertenece a la organización
        $organizacion = Organizacion::findOrFail($validated['organizacion_id']);
        if (! $organizacion->tieneUsuario($user)) {
            return back()->withErrors([
                'organizacion_id' => 'No tienes acceso a esta organización',
            ]);
        }

        if (! empty($validated['sitio_id'])) {
            $sitio = Sitio::findOrFail($validated['sitio_id']);
        } else {
            $sitiosActivos = $organizacion->sitios()->activos()->get();

            if ($sitiosActivos->count() !== 1) {
                return back()->withErrors([
                    'sitio_id' => $sitiosActivos->isEmpty()
                        ? 'La organizacion seleccionada no tiene sitios activos'
                        : 'Selecciona un sitio para esta organizacion',
                ]);
            }

            $sitio = $sitiosActivos->first();
        }

        // Verificar que el sitio pertenece a la organización
        if ($sitio->organizacion_id !== $organizacion->id) {
            return back()->withErrors([
                'sitio_id' => 'El sitio no pertenece a la organización seleccionada',
            ]);
        }

        if (! $sitio->activa) {
            return back()->withErrors([
                'sitio_id' => 'El sitio seleccionado no esta activo',
            ]);
        }

        // Guardar en sesión
        $request->session()->put([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
        ]);

        return redirect()->intended(route('dashboard', absolute: false))
            ->with('success', 'Contexto seleccionado correctamente');
    }

    /**
     * Limpiar la selección de contexto (volver al selector)
     */
    public function destroy(Request $request)
    {
        $this->clearCurrentContext($request);

        return redirect()->route('seleccionar-contexto')
            ->with('success', 'Contexto limpiado');
    }

    /**
     * Limpiar el contexto actual y entrar al panel global.
     */
    public function enterPanel(Request $request)
    {
        $this->clearCurrentContext($request);

        return redirect()->route('admin.control-panel');
    }

    private function clearCurrentContext(Request $request): void
    {
        $request->session()->forget([
            'organizacion_actual_id',
            'sitio_actual_id',
            'is_impersonating',
        ]);
    }
}
