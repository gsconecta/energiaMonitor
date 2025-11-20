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
        // Verificar si el device_id ya está en uso antes de validar
        $deviceId = $request->input('device_id');
        if ($deviceId) {
            $dispositivoExistente = Dispositivo::where('device_id', $deviceId)
                ->whereNull('deleted_at')
                ->first();
            
            if ($dispositivoExistente) {
                return back()->withErrors([
                    'device_id' => 'Este dispositivo ya está siendo usado por otra organización o sitio.',
                ])->withInput();
            }
        }

        $validated = $request->validate([
            'sitio_id' => 'required|exists:sitios,id',
            'device_id' => [
                'required',
                'string',
                Rule::unique('dispositivos', 'device_id')->whereNull('deleted_at'),
            ],
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:produccion,consumo,red,bateria,otro',
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $dispositivo = Dispositivo::create($validated);

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
            'modelo' => 'nullable|string|max:255',
            'ip_local' => 'nullable|ip',
            'firmware' => 'nullable|string|max:255',
            'activo' => 'boolean',
        ]);

        $dispositivo->update($validated);

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