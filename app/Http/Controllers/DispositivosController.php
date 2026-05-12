<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Sitio;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DispositivosController extends Controller
{
    /**
     * Mostrar listado de dispositivos.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $sitioActualId = $request->session()->get('sitio_actual_id');
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        $panelGlobalMode = $this->isGlobalPanelMode($request);
        $organizacionesIds = $panelGlobalMode
            ? collect()
            : $user->organizacionesActivas()->pluck('organizaciones.id');

        $query = Dispositivo::with([
            'sitio.organizacion',
            'ultimaLecturaRelacion',
        ])->withCount('lecturas');

        if (! $panelGlobalMode) {
            $query->whereHas('sitio', function ($q) use ($organizacionesIds, $organizacionActualId, $sitioActualId) {
                $q->whereIn('organizacion_id', $organizacionesIds);

                if ($organizacionActualId && $organizacionesIds->contains($organizacionActualId)) {
                    $q->where('organizacion_id', $organizacionActualId);
                }

                if ($sitioActualId) {
                    $q->where('id', $sitioActualId);
                }
            });
        }

        $dispositivos = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($dispositivo) {
                $ultimaLectura = $dispositivo->ultimaLecturaRelacion;

                return [
                    'id' => $dispositivo->id,
                    'device_id' => $dispositivo->device_id,
                    'nombre' => $dispositivo->nombre,
                    'modelo' => $dispositivo->modelo,
                    'ip_local' => $dispositivo->ip_local,
                    'firmware' => $dispositivo->firmware,
                    'activo' => $dispositivo->activo,
                    'num_fases' => $dispositivo->num_fases,
                    'nombre_canal_1' => $dispositivo->nombre_canal_1,
                    'nombre_canal_2' => $dispositivo->nombre_canal_2,
                    'nombre_canal_3' => $dispositivo->nombre_canal_3,
                    'color_canal_1' => $dispositivo->color_canal_1,
                    'color_canal_2' => $dispositivo->color_canal_2,
                    'color_canal_3' => $dispositivo->color_canal_3,
                    'tipo_canal_1' => $dispositivo->tipo_canal_1,
                    'tipo_canal_2' => $dispositivo->tipo_canal_2,
                    'tipo_canal_3' => $dispositivo->tipo_canal_3,
                    'invertir_sentido_canal_1' => (bool) $dispositivo->invertir_sentido_canal_1,
                    'invertir_sentido_canal_2' => (bool) $dispositivo->invertir_sentido_canal_2,
                    'invertir_sentido_canal_3' => (bool) $dispositivo->invertir_sentido_canal_3,
                    'sitio' => [
                        'id' => $dispositivo->sitio->id,
                        'nombre' => $dispositivo->sitio->nombre,
                        'organizacion' => [
                            'id' => $dispositivo->sitio->organizacion?->id,
                            'nombre' => $dispositivo->sitio->organizacion?->nombre ?? 'N/A',
                        ],
                    ],
                    'lecturas_count' => $dispositivo->lecturas_count,
                    'esta_online' => $ultimaLectura
                        ? $ultimaLectura->fecha_lectura->diffInMinutes(now()) < Dispositivo::ONLINE_THRESHOLD_MINUTES
                        : false,
                    'ultima_lectura' => $ultimaLectura ? $ultimaLectura->fecha_lectura->diffForHumans() : null,
                    'ultima_lectura_fecha' => $ultimaLectura ? $ultimaLectura->fecha_lectura->toISOString() : null,
                    'potencia_actual' => $ultimaLectura ? round(($ultimaLectura->potencia_total_w ?? 0) / 1000, 2) : 0,
                ];
            });

        $querySitios = Sitio::activos()->with('organizacion:id,nombre');

        if (! $panelGlobalMode) {
            $querySitios->whereIn('organizacion_id', $organizacionesIds);

            if ($organizacionActualId && $organizacionesIds->contains($organizacionActualId)) {
                $querySitios->where('organizacion_id', $organizacionActualId);
            }
        }

        $sitios = $querySitios->orderBy('organizacion_id')
            ->orderBy('nombre')
            ->get()
            ->map(fn ($sitio) => [
                'id' => $sitio->id,
                'nombre' => $sitio->nombre,
                'organizacion' => [
                    'id' => $sitio->organizacion?->id,
                    'nombre' => $sitio->organizacion?->nombre ?? 'N/A',
                ],
            ]);

        return Inertia::render('Dispositivos/Index', [
            'dispositivos' => $dispositivos,
            'sitios' => $sitios,
            'panel_global_mode' => $panelGlobalMode,
        ]);
    }

    /**
     * Mostrar detalles de un dispositivo.
     */
    public function show(Request $request, Dispositivo $dispositivo)
    {
        $dispositivo->load('sitio.organizacion');
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $ultimaLectura = $dispositivo->ultimaLectura();
        $lecturasCount = $dispositivo->lecturas()->count();

        $metricasEnergia = null;
        if ($ultimaLectura) {
            $metricasEnergia = $dispositivo->calcularMetricasEnergia(collect([$ultimaLectura]));
        }

        return Inertia::render('Dispositivos/Show', [
            'dispositivo' => [
                'id' => $dispositivo->id,
                'device_id' => $dispositivo->device_id,
                'nombre' => $dispositivo->nombre,
                'num_fases' => $dispositivo->num_fases,
                'fases_label' => $dispositivo->fases_label,
                'nombre_canal_1' => $dispositivo->nombre_canal_1,
                'nombre_canal_2' => $dispositivo->nombre_canal_2,
                'nombre_canal_3' => $dispositivo->nombre_canal_3,
                'color_canal_1' => $dispositivo->color_canal_1 ?? '#ef4444',
                'color_canal_2' => $dispositivo->color_canal_2 ?? '#22c55e',
                'color_canal_3' => $dispositivo->color_canal_3 ?? '#eab308',
                'tipo_canal_1' => $dispositivo->tipo_canal_1,
                'tipo_canal_2' => $dispositivo->tipo_canal_2,
                'tipo_canal_3' => $dispositivo->tipo_canal_3,
                'invertir_sentido_canal_1' => (bool) $dispositivo->invertir_sentido_canal_1,
                'invertir_sentido_canal_2' => (bool) $dispositivo->invertir_sentido_canal_2,
                'invertir_sentido_canal_3' => (bool) $dispositivo->invertir_sentido_canal_3,
                'modelo' => $dispositivo->modelo,
                'ip_local' => $dispositivo->ip_local,
                'firmware' => $dispositivo->firmware,
                'activo' => $dispositivo->activo,
                'configuracion' => $dispositivo->configuracion,
                'sitio' => [
                    'id' => $dispositivo->sitio->id,
                    'nombre' => $dispositivo->sitio->nombre,
                    'codigo' => $dispositivo->sitio->codigo,
                    'organizacion' => [
                        'id' => $dispositivo->sitio->organizacion->id,
                        'nombre' => $dispositivo->sitio->organizacion->nombre,
                    ],
                ],
                'lecturas_count' => $lecturasCount,
                'esta_online' => $dispositivo->estaOnline(),
                'ultima_lectura' => $ultimaLectura ? [
                    'fecha' => $ultimaLectura->fecha_lectura->toISOString(),
                    'fecha_human' => $ultimaLectura->fecha_lectura->diffForHumans(),
                    'potencia_total_kw' => round(($ultimaLectura->potencia_total_w ?? 0) / 1000, 2),
                    'energia_total_kwh' => round($ultimaLectura->energia_total_kwh ?? 0, 2),
                ] : null,
            ],
            'metricas_energia' => $metricasEnergia,
            'panel_global_mode' => $this->isGlobalPanelMode($request),
        ]);
    }

    /**
     * Mostrar formulario de creacion (redirige a index porque el formulario esta en un modal).
     */
    public function create()
    {
        return redirect()->route('dispositivos.index');
    }

    /**
     * Mostrar formulario de edicion (redirige a index porque el formulario esta en un modal).
     */
    public function edit(Dispositivo $dispositivo)
    {
        return redirect()->route('dispositivos.index');
    }

    /**
     * Almacenar nuevo dispositivo.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sitio_id' => 'required|exists:sitios,id',
            'device_id' => [
                'required',
                'string',
                Rule::unique('dispositivos', 'device_id')->whereNull('deleted_at'),
            ],
            'nombre' => 'required|string|max:255',
            'num_fases' => 'nullable|integer|in:1,2,3',
            'nombre_canal_1' => 'nullable|string|max:255',
            'nombre_canal_2' => 'nullable|string|max:255',
            'nombre_canal_3' => 'nullable|string|max:255',
            'color_canal_1' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_canal_2' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_canal_3' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'tipo_canal_1' => 'nullable|string|in:fotovoltaica,red_electrica',
            'tipo_canal_2' => 'nullable|string|in:fotovoltaica,red_electrica',
            'tipo_canal_3' => 'nullable|string|in:fotovoltaica,red_electrica',
            'invertir_sentido_canal_1' => 'boolean',
            'invertir_sentido_canal_2' => 'boolean',
            'invertir_sentido_canal_3' => 'boolean',
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $sitio = Sitio::findOrFail($validated['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivoExistente = Dispositivo::withTrashed()
            ->where('device_id', $validated['device_id'])
            ->first();

        if ($dispositivoExistente) {
            if (! $dispositivoExistente->trashed()) {
                return back()->withErrors([
                    'device_id' => 'Este dispositivo ya esta siendo usado por otra organizacion o sitio.',
                ])->withInput();
            }

            $dispositivoExistente->forceDelete();
        }

        try {
            Dispositivo::create($validated);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() == 23000) {
                $dispositivoExistente = Dispositivo::where('device_id', $validated['device_id'])->first();
                if ($dispositivoExistente) {
                    return back()->withErrors([
                        'device_id' => 'Este dispositivo ya esta siendo usado por otra organizacion o sitio.',
                    ])->withInput();
                }
            }

            throw $e;
        }

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo creado correctamente');
    }

    /**
     * Actualizar dispositivo.
     */
    public function update(Request $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $validated = $request->validate([
            'sitio_id' => 'required|exists:sitios,id',
            'device_id' => [
                'required',
                'string',
                Rule::unique('dispositivos', 'device_id')
                    ->ignore($dispositivo->id)
                    ->whereNull('deleted_at'),
            ],
            'nombre' => 'required|string|max:255',
            'num_fases' => 'nullable|integer|in:1,2,3',
            'nombre_canal_1' => 'nullable|string|max:255',
            'nombre_canal_2' => 'nullable|string|max:255',
            'nombre_canal_3' => 'nullable|string|max:255',
            'color_canal_1' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_canal_2' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'color_canal_3' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'tipo_canal_1' => 'nullable|string|in:fotovoltaica,red_electrica',
            'tipo_canal_2' => 'nullable|string|in:fotovoltaica,red_electrica',
            'tipo_canal_3' => 'nullable|string|in:fotovoltaica,red_electrica',
            'invertir_sentido_canal_1' => 'boolean',
            'invertir_sentido_canal_2' => 'boolean',
            'invertir_sentido_canal_3' => 'boolean',
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $sitio = Sitio::findOrFail($validated['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivo->update($validated);

        if (! isset($validated['num_fases']) || $validated['num_fases'] === null) {
            $dispositivo->actualizarNumFasesAuto();
        }

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo actualizado correctamente');
    }

    /**
     * Eliminar dispositivo (soft delete).
     */
    public function destroy(Request $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $dispositivo->delete();

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo eliminado correctamente');
    }

    /**
     * Activar/desactivar dispositivo.
     */
    public function toggleActivo(Request $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $dispositivo->update([
            'activo' => ! $dispositivo->activo,
        ]);

        return redirect()->route('dispositivos.index')
            ->with('success', 'Estado del dispositivo actualizado');
    }

    /**
     * Sincronizar manualmente un dispositivo.
     */
    public function sincronizar(Request $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        try {
            \Artisan::call('shelly:obtener-lecturas', [
                '--dispositivo' => $dispositivo->id,
            ]);

            return redirect()->back()
                ->with('success', 'Dispositivo sincronizado correctamente');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al sincronizar el dispositivo: '.$e->getMessage());
        }
    }

    private function isGlobalPanelMode(Request $request): bool
    {
        $user = $request->user();

        return $user !== null
            && $user->esAdminOTecnico()
            && ! $request->session()->has('organizacion_actual_id')
            && ! $request->session()->has('sitio_actual_id');
    }

    private function ensureCanAccessSitio(Request $request, Sitio $sitio): void
    {
        if ($this->isGlobalPanelMode($request)) {
            return;
        }

        $allowed = $request->user()
            ->organizacionesActivas()
            ->where('organizaciones.id', $sitio->organizacion_id)
            ->exists();

        abort_unless($allowed, 403, 'No tienes acceso a este sitio.');
    }

    private function ensureCanAccessDispositivo(Request $request, Dispositivo $dispositivo): void
    {
        $dispositivo->loadMissing('sitio');

        $this->ensureCanAccessSitio($request, $dispositivo->sitio);
    }
}
