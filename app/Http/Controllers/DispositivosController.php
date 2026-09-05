<?php

namespace App\Http\Controllers;

use App\Http\Requests\GuardarDispositivoRequest;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use App\Models\Sitio;
use Illuminate\Http\Request;
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
            'modeloDispositivo',
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
                    'modelo' => $dispositivo->nombreModelo(),
                    'modelo_dispositivo_id' => $dispositivo->modelo_dispositivo_id,
                    'modo_canales' => $dispositivo->modoCanales()->value,
                    'driver' => $dispositivo->driver()->value,
                    'driver_label' => $dispositivo->driver()->label(),
                    'driver_disponible' => $dispositivo->driver()->disponible(),
                    'conexion' => $dispositivo->conexion(),
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
            'modelos' => $this->modelosParaFormulario(),
            'panel_global_mode' => $panelGlobalMode,
        ]);
    }

    /**
     * Mostrar detalles de un dispositivo.
     */
    public function show(Request $request, Dispositivo $dispositivo)
    {
        $dispositivo->load(['sitio.organizacion', 'modeloDispositivo']);
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
                'modelo' => $dispositivo->nombreModelo(),
                'modelo_dispositivo_id' => $dispositivo->modelo_dispositivo_id,
                'num_canales' => $dispositivo->modeloDispositivo?->num_canales ?? Lectura::MAX_CANALES,
                'modo_canales' => $dispositivo->modoCanales()->value,
                'driver_label' => $dispositivo->driver()->label(),
                'driver_disponible' => $dispositivo->driver()->disponible(),
                'conexion_resumen' => $this->resumenConexion($dispositivo),
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
    public function store(GuardarDispositivoRequest $request)
    {
        $atributos = $request->atributosParaGuardar();

        $sitio = Sitio::findOrFail($atributos['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivoExistente = Dispositivo::withTrashed()
            ->where('device_id', $atributos['device_id'])
            ->first();

        if ($dispositivoExistente) {
            if (! $dispositivoExistente->trashed()) {
                return back()->withErrors([
                    'device_id' => 'Este dispositivo ya esta siendo usado por otra organizacion o sitio.',
                ])->withInput();
            }

            $dispositivoExistente->forceDelete();
        }

        Dispositivo::create($atributos);

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo creado correctamente');
    }

    /**
     * Actualizar dispositivo.
     */
    public function update(GuardarDispositivoRequest $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $atributos = $request->atributosParaGuardar();

        $sitio = Sitio::findOrFail($atributos['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivo->update($atributos);

        if (($atributos['num_fases'] ?? null) === null) {
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
            $codigo = \Artisan::call('lecturas:obtener', [
                '--dispositivo' => $dispositivo->id,
            ]);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al sincronizar el dispositivo: '.$e->getMessage());
        }

        if ($codigo !== \Illuminate\Console\Command::SUCCESS) {
            return redirect()->back()
                ->with('error', 'No se pudo sincronizar el dispositivo: '.trim(\Artisan::output()));
        }

        return redirect()->back()
            ->with('success', 'Dispositivo sincronizado correctamente');
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

    private function modelosParaFormulario(): \Illuminate\Support\Collection
    {
        return ModeloDispositivo::orderBy('fabricante')->orderBy('nombre')->get()
            ->map(fn (ModeloDispositivo $modelo) => [
                'id' => $modelo->id,
                'fabricante' => $modelo->fabricante,
                'nombre' => $modelo->nombre,
                'activo' => $modelo->activo,
                'driver' => $modelo->driver->value,
                'driver_label' => $modelo->driver->label(),
                'driver_disponible' => $modelo->driver->disponible(),
                'num_canales' => $modelo->num_canales,
                'modo_canales_por_defecto' => $modelo->modo_canales_por_defecto->value,
                'modo_canales_configurable' => $modelo->modo_canales_configurable,
                'campos_conexion' => $modelo->driver->camposConexion(),
            ]);
    }

    private function resumenConexion(Dispositivo $dispositivo): ?string
    {
        $conexion = $dispositivo->conexion();

        if ($conexion === []) {
            return null;
        }

        $partes = [];

        if (isset($conexion['host'])) {
            $partes[] = $conexion['host'].(isset($conexion['port']) ? ':'.$conexion['port'] : '');
        }
        if (isset($conexion['unit_id'])) {
            $partes[] = "unidad {$conexion['unit_id']}";
        }
        if (isset($conexion['device_instance'])) {
            $partes[] = "instancia {$conexion['device_instance']}";
        }

        return implode(' · ', $partes);
    }
}
