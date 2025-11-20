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
                    'tipo' => $dispositivo->tipo,
                    'modelo' => $dispositivo->modelo,
                    'ip_local' => $dispositivo->ip_local,
                    'firmware' => $dispositivo->firmware,
                    'activo' => $dispositivo->activo,
                    'sitio' => [
                        'id' => $dispositivo->sitio->id,
                        'nombre' => $dispositivo->sitio->nombre,
                    ],
                    'lecturas_count' => $dispositivo->lecturas_count,
                    'esta_online' => $dispositivo->estaOnline(),
                    'ultima_lectura' => $ultimaLectura ? $ultimaLectura->fecha_lectura->diffForHumans() : null,
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
            'tipo' => 'required|in:produccion,consumo,red,bateria,otro',
            'num_fases' => 'nullable|integer|in:1,2,3',
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
            'tipo' => 'required|in:produccion,consumo,red,bateria,otro',
            'num_fases' => 'nullable|integer|in:1,2,3',
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
}