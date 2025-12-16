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
     * Mostrar listado de dispositivos
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $sitioActualId = $request->session()->get('sitio_actual_id');
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        
        // Obtener IDs de organizaciones a las que el usuario pertenece
        $organizacionesIds = $user->organizacionesActivas()->pluck('organizaciones.id');
        
        // Construir la consulta de dispositivos
        $query = Dispositivo::with('sitio')
            ->withCount('lecturas')
            ->whereHas('sitio', function ($q) use ($organizacionesIds, $organizacionActualId, $sitioActualId) {
                // Filtrar por organizaciones del usuario
                $q->whereIn('organizacion_id', $organizacionesIds);
                
                // Si hay una organización seleccionada, filtrar por esa organización
                if ($organizacionActualId && $organizacionesIds->contains($organizacionActualId)) {
                    $q->where('organizacion_id', $organizacionActualId);
                }
                
                // Si hay un sitio seleccionado, filtrar por ese sitio
                if ($sitioActualId) {
                    $q->where('id', $sitioActualId);
                }
            });
        
        $dispositivos = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($dispositivo) {
                $ultimaLectura = $dispositivo->ultimaLectura();
                
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
                    'sitio' => [
                        'id' => $dispositivo->sitio->id,
                        'nombre' => $dispositivo->sitio->nombre,
                    ],
                    'lecturas_count' => $dispositivo->lecturas_count,
                    'esta_online' => $dispositivo->estaOnline(),
                    'ultima_lectura' => $ultimaLectura ? $ultimaLectura->fecha_lectura->diffForHumans() : null,
                    'ultima_lectura_fecha' => $ultimaLectura ? $ultimaLectura->fecha_lectura->toISOString() : null,
                    'potencia_actual' => $ultimaLectura ? round($ultimaLectura->potencia_total_w / 1000, 2) : 0,
                ];
            });

        // Obtener sitios según el contexto - solo sitios de organizaciones a las que el usuario pertenece
        $user = auth()->user();
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        
        // Obtener IDs de organizaciones a las que el usuario pertenece
        $organizacionesIds = $user->organizacionesActivas()->pluck('organizaciones.id');
        
        $querySitios = Sitio::activos()
            ->whereIn('organizacion_id', $organizacionesIds);
        
        // Si hay una organización seleccionada, filtrar por esa organización
        if ($organizacionActualId && $organizacionesIds->contains($organizacionActualId)) {
            $querySitios->where('organizacion_id', $organizacionActualId);
        }
        
        $sitios = $querySitios->get()->map(fn($sitio) => [
            'id' => $sitio->id,
            'nombre' => $sitio->nombre,
        ]);

        return Inertia::render('Dispositivos/Index', [
            'dispositivos' => $dispositivos,
            'sitios' => $sitios,
        ]);
    }

    /**
     * Mostrar detalles de un dispositivo
     */
    public function show(Dispositivo $dispositivo)
    {
        $user = auth()->user();
        
        // Cargar relaciones necesarias
        $dispositivo->load('sitio.organizacion');
        
        // Verificar que el usuario tiene acceso al sitio del dispositivo
        $organizacionesIds = $user->organizacionesActivas()->pluck('organizaciones.id');
        
        if (!$organizacionesIds->contains($dispositivo->sitio->organizacion_id)) {
            abort(403, 'No tienes acceso a este dispositivo');
        }

        $ultimaLectura = $dispositivo->ultimaLectura();
        $lecturasCount = $dispositivo->lecturas()->count();
        
        // Obtener lecturas de las últimas 24 horas para las gráficas
        $lecturas = $dispositivo->lecturas()
            ->where('fecha_lectura', '>=', now()->subDay())
            ->orderBy('fecha_lectura', 'asc')
            ->get();
        
        // Preparar datos para gráficas de potencia por canal
        $graficas = $this->prepararDatosGraficaCanales($lecturas);
        
        // Calcular métricas de energía si hay lecturas
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
                    'potencia_total_kw' => round($ultimaLectura->potencia_total_w / 1000, 2),
                    'energia_total_kwh' => round($ultimaLectura->energia_total_kwh ?? 0, 2),
                ] : null,
            ],
            'graficas' => $graficas,
            'metricas_energia' => $metricasEnergia,
        ]);
    }

    /**
     * Mostrar formulario de creación (redirige a index ya que el formulario está en un modal)
     */
    public function create()
    {
        return redirect()->route('dispositivos.index');
    }

    /**
     * Mostrar formulario de edición (redirige a index ya que el formulario está en un modal)
     */
    public function edit(Dispositivo $dispositivo)
    {
        return redirect()->route('dispositivos.index');
    }

    /**
     * Almacenar nuevo dispositivo
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
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        // Verificar si existe un dispositivo (incluyendo eliminados) con ese device_id
        // La restricción de unicidad en la BD no considera soft deletes, así que debemos manejarlo manualmente
        $dispositivoExistente = Dispositivo::withTrashed()
            ->where('device_id', $validated['device_id'])
            ->first();
        
        if ($dispositivoExistente) {
            if (!$dispositivoExistente->trashed()) {
                // El dispositivo existe y está activo
                return back()->withErrors([
                    'device_id' => 'Este dispositivo ya está siendo usado por otra organización o sitio.',
                ])->withInput();
            } else {
                // El dispositivo existe pero está eliminado (soft delete)
                // Como la restricción de unicidad en la BD no permite insertar, 
                // debemos hacer un hard delete primero y luego crear el nuevo
                $dispositivoExistente->forceDelete();
            }
        }

        try {
            $dispositivo = Dispositivo::create($validated);
            
            // Intentar detectar automáticamente el número de fases si no se proporcionó
            // Esto se actualizará cuando llegue la primera lectura
        } catch (\Illuminate\Database\QueryException $e) {
            // Si aún así falla (por ejemplo, condición de carrera), verificar nuevamente
            if ($e->getCode() == 23000) { // Integrity constraint violation
                $dispositivoExistente = Dispositivo::where('device_id', $validated['device_id'])->first();
                if ($dispositivoExistente) {
                    return back()->withErrors([
                        'device_id' => 'Este dispositivo ya está siendo usado por otra organización o sitio.',
                    ])->withInput();
                }
            }
            throw $e;
        }

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo creado correctamente');
    }

    /**
     * Actualizar dispositivo
     */
    public function update(Request $request, Dispositivo $dispositivo)
    {
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
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $dispositivo->update($validated);
        
        // Si no se especificó num_fases y hay lecturas, intentar detectarlo automáticamente
        if (!isset($validated['num_fases']) || $validated['num_fases'] === null) {
            $dispositivo->actualizarNumFasesAuto();
        }

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo actualizado correctamente');
    }

    /**
     * Eliminar dispositivo (soft delete)
     */
    public function destroy(Dispositivo $dispositivo)
    {
        $dispositivo->delete();

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo eliminado correctamente');
    }

    /**
     * Activar/Desactivar dispositivo
     */
    public function toggleActivo(Dispositivo $dispositivo)
    {
        $dispositivo->update([
            'activo' => !$dispositivo->activo
        ]);

        return redirect()->route('dispositivos.index')
            ->with('success', 'Estado del dispositivo actualizado');
    }

    /**
     * Sincronizar manualmente un dispositivo
     */
    public function sincronizar(Dispositivo $dispositivo)
    {
        try {
            // Ejecutar el comando de sincronización para este dispositivo específico
            \Artisan::call('shelly:obtener-lecturas', [
                '--dispositivo' => $dispositivo->id,
            ]);

            $output = \Artisan::output();
            
            return redirect()->route('dispositivos.index')
                ->with('success', 'Dispositivo sincronizado correctamente');
        } catch (\Exception $e) {
            return redirect()->route('dispositivos.index')
                ->with('error', 'Error al sincronizar el dispositivo: ' . $e->getMessage());
        }
    }

    /**
     * Preparar datos para gráfica de potencia por canales
     */
    private function prepararDatosGraficaCanales($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'canal1' => $lecturas->map(fn($l) => round($l->potencia_canal_1_w / 1000, 2))->toArray(),
            'canal2' => $lecturas->map(fn($l) => round($l->potencia_canal_2_w / 1000, 2))->toArray(),
            'canal3' => $lecturas->map(fn($l) => round($l->potencia_canal_3_w / 1000, 2))->toArray(),
        ];
    }

    /**
     * Obtener formato de fecha según el rango de lecturas
     */
    private function obtenerFormatoFecha($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return 'H:i';
        }

        $primera = $lecturas->first();
        $ultima = $lecturas->last();
        
        // Si las lecturas abarcan más de un día, mostrar fecha y hora
        if ($primera->fecha_lectura->format('Y-m-d') !== $ultima->fecha_lectura->format('Y-m-d')) {
            return 'd/m H:i';
        }
        
        // Si hay muchas lecturas (más de 24 horas de datos), mostrar fecha
        $diferenciaHoras = $primera->fecha_lectura->diffInHours($ultima->fecha_lectura);
        if ($diferenciaHoras > 24) {
            return 'd/m H:i';
        }
        
        return 'H:i';
    }
}