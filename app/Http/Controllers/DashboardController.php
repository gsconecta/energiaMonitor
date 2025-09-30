<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Nave;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $dispositivoId = $request->get('dispositivo_id');
        $periodo = $request->get('periodo', 'hoy');
        $fechaDesde = $request->get('fecha_desde');
        $fechaHasta = $request->get('fecha_hasta');

        // Obtener dispositivo (usar el primero si no se especifica)
        $dispositivo = $dispositivoId 
            ? Dispositivo::with('nave')->find($dispositivoId)
            : Dispositivo::with('nave')->activos()->first();

        if (!$dispositivo) {
            return Inertia::render('Dashboard/Index', [
                'sinDispositivos' => true,
                'dispositivos' => [],
            ]);
        }

        // Obtener todos los dispositivos para el selector
        $dispositivos = Dispositivo::with('nave')
            ->activos()
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'tipo' => $d->tipo,
                'nave' => $d->nave->nombre,
            ]);

        // Obtener lecturas según período
        $lecturas = $this->obtenerLecturas($dispositivo, $periodo, $fechaDesde, $fechaHasta);

        // Calcular métricas
        $metricas = $this->calcularMetricas($lecturas, $dispositivo);

        // Preparar datos para gráficas
        $graficas = [
            'potencia' => $this->prepararDatosGraficaPotencia($lecturas),
            'voltaje' => $this->prepararDatosGraficaVoltaje($lecturas),
            'canales' => $this->prepararDatosGraficaCanales($lecturas),
            'corrientes' => $this->prepararDatosGraficaCorrientes($lecturas),
        ];

        return Inertia::render('Dashboard/Index', [
            'dispositivo' => [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'tipo' => $dispositivo->tipo,
                'device_id' => $dispositivo->device_id,
                'nave' => [
                    'id' => $dispositivo->nave->id,
                    'nombre' => $dispositivo->nave->nombre,
                ],
            ],
            'dispositivos' => $dispositivos,
            'metricas' => $metricas,
            'graficas' => $graficas,
            'periodo' => $periodo,
            'sinDispositivos' => false,
        ]);
    }

    private function obtenerLecturas($dispositivo, $periodo)
    {
        $query = $dispositivo->lecturas();

        switch ($periodo) {
            case 'hoy':
                $query->whereDate('fecha_lectura', today());
                break;
            case 'ayer':
                $query->whereDate('fecha_lectura', today()->subDay());
                break;
            case 'semana':
                $query->whereBetween('fecha_lectura', [
                    now()->startOfWeek(),
                    now()->endOfWeek()
                ]);
                break;
            case 'mes':
                $query->whereMonth('fecha_lectura', now()->month)
                      ->whereYear('fecha_lectura', now()->year);
                break;
        }

        return $query->orderBy('fecha_lectura', 'asc')->get();
    }

    private function calcularMetricas($lecturas, $dispositivo)
    {
        if ($lecturas->isEmpty()) {
            return [
                'potencia_actual_kw' => 0,
                'potencia_maxima_kw' => 0,
                'potencia_promedio_kw' => 0,
                'energia_total_kwh' => 0,
                'voltaje_promedio' => 0,
                'factor_potencia_promedio' => 0,
                'estado_conexion' => 'offline',
                'ultima_actualizacion' => null,
                'numero_lecturas' => 0,
            ];
        }

        $ultimaLectura = $lecturas->last();

        // Verificar si está online (última lectura hace menos de 10 minutos)
        $estaOnline = $ultimaLectura->fecha_lectura->diffInMinutes(now()) <= 10;

        return [
            'potencia_actual_kw' => round($ultimaLectura->potencia_total_w / 1000, 2),
            'potencia_maxima_kw' => round($lecturas->max('potencia_total_w') / 1000, 2),
            'potencia_promedio_kw' => round($lecturas->avg('potencia_total_w') / 1000, 2),
            'energia_total_kwh' => round($ultimaLectura->energia_total_kwh, 2),
            'voltaje_promedio' => round($lecturas->avg('voltaje_promedio'), 1),
            'factor_potencia_promedio' => round(
                ($lecturas->avg('pf_canal_1') + $lecturas->avg('pf_canal_2') + $lecturas->avg('pf_canal_3')) / 3, 
                2
            ),
            'estado_conexion' => $estaOnline ? 'online' : 'offline',
            'ultima_actualizacion' => $ultimaLectura->fecha_lectura->toISOString(),
            'ultima_actualizacion_human' => $ultimaLectura->fecha_lectura->diffForHumans(),
            'numero_lecturas' => $lecturas->count(),
        ];
    }

    private function prepararDatosGraficaPotencia($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'data' => []];
        }

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format('H:i'))->toArray(),
            'data' => $lecturas->map(fn($l) => round($l->potencia_total_w / 1000, 2))->toArray(),
        ];
    }

    private function prepararDatosGraficaVoltaje($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format('H:i'))->toArray(),
            'canal1' => $lecturas->pluck('voltaje_canal_1')->toArray(),
            'canal2' => $lecturas->pluck('voltaje_canal_2')->toArray(),
            'canal3' => $lecturas->pluck('voltaje_canal_3')->toArray(),
        ];
    }

    private function prepararDatosGraficaCanales($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format('H:i'))->toArray(),
            'canal1' => $lecturas->map(fn($l) => round($l->potencia_canal_1_w / 1000, 2))->toArray(),
            'canal2' => $lecturas->map(fn($l) => round($l->potencia_canal_2_w / 1000, 2))->toArray(),
            'canal3' => $lecturas->map(fn($l) => round($l->potencia_canal_3_w / 1000, 2))->toArray(),
        ];
    }

    private function prepararDatosGraficaCorrientes($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format('H:i'))->toArray(),
            'canal1' => $lecturas->pluck('corriente_canal_1')->toArray(),
            'canal2' => $lecturas->pluck('corriente_canal_2')->toArray(),
            'canal3' => $lecturas->pluck('corriente_canal_3')->toArray(),
        ];
    }
}