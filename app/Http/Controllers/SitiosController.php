<?php

namespace App\Http\Controllers;

use App\Models\Sitio;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SitiosController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $organizacionId = $request->get('organizacion_id');
        
        // Obtener organizaciones del usuario
        $organizaciones = auth()->user()
            ->organizacionesActivas()
            ->get()
            ->map(fn($org) => [
                'id' => $org->id,
                'nombre' => $org->nombre,
            ]);

        // Filtrar sitios por organización del usuario
        $query = Sitio::with('organizacion')
            ->whereHas('organizacion', function ($q) {
                $q->whereHas('users', function ($q2) {
                    $q2->where('user_id', auth()->id());
                });
            });

        if ($organizacionId) {
            $query->where('organizacion_id', $organizacionId);
        }

        $sitios = $query->withCount('dispositivos')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($sitio) {
                return [
                    'id' => $sitio->id,
                    'nombre' => $sitio->nombre,
                    'codigo' => $sitio->codigo,
                    'ubicacion' => $sitio->ubicacion,
                    'latitud' => $sitio->latitud,
                    'longitud' => $sitio->longitud,
                    'descripcion' => $sitio->descripcion,
                    'activa' => $sitio->activa,
                    'organizacion' => [
                        'id' => $sitio->organizacion->id,
                        'nombre' => $sitio->organizacion->nombre,
                    ],
                    'dispositivos_count' => $sitio->dispositivos_count,
                ];
            });

        return Inertia::render('Sitios/Index', [
            'sitios' => $sitios,
            'organizaciones' => $organizaciones,
            'organizacion_seleccionada' => $organizacionId,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $organizaciones = auth()->user()
            ->organizacionesActivas()
            ->get()
            ->map(fn($org) => [
                'id' => $org->id,
                'nombre' => $org->nombre,
            ]);

        return Inertia::render('Sitios/Create', [
            'organizaciones' => $organizaciones,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'organizacion_id' => 'required|exists:organizaciones,id',
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:255|unique:sitios,codigo',
            'ubicacion' => 'nullable|string|max:255',
            'latitud' => 'nullable|numeric|between:-90,90',
            'longitud' => 'nullable|numeric|between:-180,180',
            'descripcion' => 'nullable|string',
            'activa' => 'boolean',
        ]);

        // Verificar que el usuario pertenece a la organización
        $organizacion = Organizacion::findOrFail($validated['organizacion_id']);
        if (!$organizacion->tieneUsuario(auth()->user())) {
            return back()->withErrors([
                'organizacion_id' => 'No tienes acceso a esta organización'
            ]);
        }

        $sitio = Sitio::create($validated);

        // Si viene de la página de selección de contexto, volver ahí
        if ($request->header('Referer') && str_contains($request->header('Referer'), 'seleccionar-contexto')) {
            return redirect()
                ->route('seleccionar-contexto')
                ->with('success', 'Sitio creado correctamente');
        }

        return redirect()
            ->route('sitios.show', $sitio)
            ->with('success', 'Sitio creado correctamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(Sitio $sitio)
    {
        $this->authorize('view', $sitio);

        $sitio->load(['organizacion', 'dispositivos']);

        return Inertia::render('Sitios/Show', [
            'sitio' => [
                'id' => $sitio->id,
                'nombre' => $sitio->nombre,
                'codigo' => $sitio->codigo,
                'ubicacion' => $sitio->ubicacion,
                'latitud' => $sitio->latitud,
                'longitud' => $sitio->longitud,
                'descripcion' => $sitio->descripcion,
                'activa' => $sitio->activa,
                'organizacion' => [
                    'id' => $sitio->organizacion->id,
                    'nombre' => $sitio->organizacion->nombre,
                ],
                'dispositivos' => $sitio->dispositivos->map(fn($d) => [
                    'id' => $d->id,
                    'nombre' => $d->nombre,
                    'tipo' => $d->tipo,
                    'activo' => $d->activo,
                ]),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Sitio $sitio)
    {
        $this->authorize('update', $sitio);

        $organizaciones = auth()->user()
            ->organizacionesActivas()
            ->get()
            ->map(fn($org) => [
                'id' => $org->id,
                'nombre' => $org->nombre,
            ]);

        return Inertia::render('Sitios/Edit', [
            'sitio' => [
                'id' => $sitio->id,
                'organizacion_id' => $sitio->organizacion_id,
                'nombre' => $sitio->nombre,
                'codigo' => $sitio->codigo,
                'ubicacion' => $sitio->ubicacion,
                'latitud' => $sitio->latitud,
                'longitud' => $sitio->longitud,
                'descripcion' => $sitio->descripcion,
                'activa' => $sitio->activa,
            ],
            'organizaciones' => $organizaciones,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Sitio $sitio)
    {
        $this->authorize('update', $sitio);

        $validated = $request->validate([
            'organizacion_id' => 'required|exists:organizaciones,id',
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:255|unique:sitios,codigo,' . $sitio->id,
            'ubicacion' => 'nullable|string|max:255',
            'latitud' => 'nullable|numeric|between:-90,90',
            'longitud' => 'nullable|numeric|between:-180,180',
            'descripcion' => 'nullable|string',
            'activa' => 'boolean',
        ]);

        // Verificar que el usuario pertenece a la nueva organización
        $organizacion = Organizacion::findOrFail($validated['organizacion_id']);
        if (!$organizacion->tieneUsuario(auth()->user())) {
            return back()->withErrors([
                'organizacion_id' => 'No tienes acceso a esta organización'
            ]);
        }

        $sitio->update($validated);

        return redirect()
            ->route('sitios.show', $sitio)
            ->with('success', 'Sitio actualizado correctamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Sitio $sitio)
    {
        $this->authorize('delete', $sitio);

        $sitio->delete();

        return redirect()
            ->route('sitios.index')
            ->with('success', 'Sitio eliminado correctamente');
    }
}
