<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Dispositivo;
use App\Models\Alerta;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class ControlPanelController extends Controller
{
    public function index(Request $request)
    {
        // Limpiar contexto actual para "salir" del sitio donde estaba
        $request->session()->forget([
            'organizacion_actual_id',
            'sitio_actual_id',
            'is_impersonating'
        ]);
        // Verificar permisos (solo admin y tecnico pueden acceder)
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403, 'No tienes permisos para acceder al Panel de Control Global.');
        }

        // Obtener resumen global
        $totalOrganizaciones = Organizacion::activas()->count();
        $totalDispositivos = Dispositivo::activos()->count();

        // 1. Obtener los dispositivos offline (usando la heurística visual del Dashboard)
        $minutosOffline = 15; // Consideraremos offline si no hay lectura en los últimos 15 min
        $deadline = Carbon::now()->subMinutes($minutosOffline);

        $dispositivosOffline = Dispositivo::with(['sitio.organizacion'])
            ->activos()
            ->where(function ($query) use ($deadline) {
                $query->whereHas('lecturas', function ($q) use ($deadline) {
                    // La última lectura es muy antigua
                })->orWhereDoesntHave('lecturas');
            })
            ->get()
            ->filter(function ($disp) use ($deadline) {
                // Filtramos programáticamente para asegurar precisión con la última lectura real
                $ultimaLectura = $disp->lecturas()->orderBy('fecha_lectura', 'desc')->first();
                return !$ultimaLectura || $ultimaLectura->fecha_lectura < $deadline;
            })
            ->map(function ($disp) {
                $ultimaLectura = $disp->lecturas()->orderBy('fecha_lectura', 'desc')->first();
                return [
                    'id' => $disp->id,
                    'nombre' => $disp->nombre,
                    'sitio_nombre' => $disp->sitio->nombre ?? 'N/A',
                    'organizacion_nombre' => $disp->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $disp->sitio->organizacion_id ?? null,
                    'sitio_id' => $disp->sitio_id ?? null,
                    'ultima_conexion' => $ultimaLectura ? $ultimaLectura->fecha_lectura->diffForHumans() : 'Nunca',
                ];
            });

        // 2. Obtener Alertas Activas (Pendientes de resolver)
        // Simularemos las alertas si la tabla está vacía o usaremos un formato general
        $alertasPendientes = Alerta::with(['dispositivo.sitio.organizacion'])
            ->activas()
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($alerta) {
                return [
                    'id' => $alerta->id,
                    'tipo' => $alerta->titulo ?? 'Alerta',
                    'mensaje' => $alerta->descripcion,
                    'severidad' => $alerta->nivel ?? 'warning',
                    'dispositivo_nombre' => $alerta->dispositivo->nombre ?? 'N/A',
                    'organizacion_nombre' => $alerta->dispositivo->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $alerta->dispositivo->sitio->organizacion_id ?? null,
                    'sitio_id' => $alerta->dispositivo->sitio_id ?? null,
                    'fecha_creacion' => $alerta->created_at->diffForHumans(),
                ];
            });

        // 3. Obtener últimas lecturas (exitosas)
        $ultimasLecturas = \App\Models\Lectura::with(['dispositivo.sitio.organizacion'])
            ->orderBy('fecha_lectura', 'desc')
            ->take(50)
            ->get()
            ->map(function ($lectura) {
                return [
                    'id' => $lectura->id,
                    'dispositivo_nombre' => $lectura->dispositivo->nombre ?? 'N/A',
                    'sitio_nombre' => $lectura->dispositivo->sitio->nombre ?? 'N/A',
                    'organizacion_nombre' => $lectura->dispositivo->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $lectura->dispositivo->sitio->organizacion_id ?? null,
                    'sitio_id' => $lectura->dispositivo->sitio_id ?? null,
                    'fecha_lectura' => $lectura->fecha_lectura->diffForHumans(),
                    'potencia_total_w' => $lectura->potencia_total_w,
                    'estado' => 'ok', // Si está en la base de datos, fue exitosa
                ];
            });

        return Inertia::render('Admin/ControlPanel', [
            'metricasGlobales' => [
                'total_organizaciones' => $totalOrganizaciones,
                'total_dispositivos' => $totalDispositivos,
                'dispositivos_offline_count' => $dispositivosOffline->count(),
                'alertas_activas_count' => $alertasPendientes->count(),
            ],
            'dispositivosOffline' => $dispositivosOffline->values(),
            'alertasPendientes' => $alertasPendientes,
            'ultimasLecturas' => $ultimasLecturas,
        ]);
    }

    // Método para Supersonation (Impersonate)
    public function impersonate(Request $request, $organizacionId, $sitioId)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $organizacion = Organizacion::findOrFail($organizacionId);
        $sitio = \App\Models\Sitio::findOrFail($sitioId);

        // Guardar en sesión forzando el contexto
        $request->session()->put([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
            'is_impersonating' => true // Bandera útil para UI
        ]);

        return redirect()->route('dashboard')->with('success', 'Sesión de soporte iniciada en: ' . $organizacion->nombre);
    }
}
