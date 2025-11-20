<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Sitio;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DispositivosController extends Controller
{
    /**
     * Mostrar listado de dispositivos
     */
    public function index(Request $request)
    {
        // Filtrar por sitio seleccionado si existe
        $sitioActualId = $request->session()->get('sitio_actual_id');
        
        $query = Dispositivo::with('sitio')
            ->withCount('lecturas');
            
        if ($sitioActualId) {
            $query->where('sitio_id', $sitioActualId);
        }
        
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

        // Obtener sitios según el contexto
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        
        $querySitios = Sitio::activos();
        if ($organizacionActualId) {
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
     * Almacenar nuevo dispositivo
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sitio_id' => 'required|exists:sitios,id',
            'device_id' => 'required|string|unique:dispositivos,device_id',
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
            'device_id' => 'required|string|unique:dispositivos,device_id,' . $dispositivo->id,
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