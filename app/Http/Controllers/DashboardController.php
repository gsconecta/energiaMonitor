<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Sitio;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Verificar si hay contexto seleccionado
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        $sitioActualId = $request->session()->get('sitio_actual_id');

        // Si no hay contexto seleccionado, redirigir al selector
        if (!$organizacionActualId || !$sitioActualId) {
            return redirect()->route('seleccionar-contexto');
        }

        // Verificar que el usuario aún tiene acceso
        $organizacionActual = Organizacion::find($organizacionActualId);
        $sitioActual = Sitio::find($sitioActualId);

        if (!$organizacionActual || !$organizacionActual->tieneUsuario($user)) {
            // El usuario ya no tiene acceso, limpiar sesión y redirigir al selector
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);
            return redirect()->route('seleccionar-contexto');
        }

        if (!$sitioActual || $sitioActual->organizacion_id !== $organizacionActual->id) {
            // El sitio ya no pertenece a la organización, limpiar y redirigir al selector
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);
            return redirect()->route('seleccionar-contexto');
        }

        $dispositivoId = $request->get('dispositivo_id');
        $periodo = $request->get('periodo', 'hoy');
        $fechaDesde = $request->get('fecha_desde');
        $fechaHasta = $request->get('fecha_hasta');

        // Obtener dispositivos del sitio seleccionado
        $queryDispositivos = Dispositivo::with('sitio')
            ->whereHas('sitio', function ($q) use ($sitioActualId) {
                $q->where('id', $sitioActualId);
            })
            ->activos();

        // Obtener dispositivo (usar el primero del sitio si no se especifica)
        $dispositivo = $dispositivoId 
            ? Dispositivo::with('sitio')->find($dispositivoId)
            : $queryDispositivos->first();

        if (!$dispositivo) {
            return Inertia::render('Dashboard/Index', [
                'sinDispositivos' => true,
                'dispositivos' => [],
            ]);
        }

        // Obtener todos los dispositivos del sitio seleccionado para el selector
        $dispositivos = $queryDispositivos
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'tipo' => $d->tipo,
                'sitio' => $d->sitio->nombre,
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
            'factor_potencia' => $this->prepararDatosGraficaFactorPotencia($lecturas),
            'energia' => $this->prepararDatosGraficaEnergia($lecturas),
        ];

        return Inertia::render('Dashboard/Index', [
            'dispositivo' => [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'tipo' => $dispositivo->tipo,
                'device_id' => $dispositivo->device_id,
                'sitio' => [
                    'id' => $dispositivo->sitio->id,
                    'nombre' => $dispositivo->sitio->nombre,
                ],
            ],
            'dispositivos' => $dispositivos,
            'metricas' => $metricas,
            'graficas' => $graficas,
            'periodo' => $periodo,
            'sinDispositivos' => false,
        ]);
    }

    private function obtenerLecturas($dispositivo, $periodo, $fechaDesde = null, $fechaHasta = null)
    {
        $query = $dispositivo->lecturas();

        // Si se proporcionan fechas personalizadas, usarlas
        if ($fechaDesde && $fechaHasta) {
            $query->whereBetween('fecha_lectura', [
                \Carbon\Carbon::parse($fechaDesde)->startOfDay(),
                \Carbon\Carbon::parse($fechaHasta)->endOfDay()
            ]);
        } else {
            // Usar períodos predefinidos
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
                'energia_retornada_kwh' => 0,
                'energia_canal_1_kwh' => 0,
                'energia_canal_2_kwh' => 0,
                'energia_canal_3_kwh' => 0,
                'voltaje_promedio' => 0,
                'corriente_promedio_1' => 0,
                'corriente_promedio_2' => 0,
                'corriente_promedio_3' => 0,
                'corriente_neutro_promedio' => 0,
                'factor_potencia_promedio' => 0,
                'estado_conexion' => 'offline',
                'wifi_conectado' => false,
                'wifi_rssi' => null,
                'uptime_segundos' => null,
                'ultima_actualizacion' => null,
                'ultima_actualizacion_human' => null,
                'numero_lecturas' => 0,
            ];
        }

        $ultimaLectura = $lecturas->last();

        // Verificar si está online (última lectura hace menos de 10 minutos)
        $estaOnline = $ultimaLectura && $ultimaLectura->fecha_lectura 
            ? $ultimaLectura->fecha_lectura->diffInMinutes(now()) <= 10 
            : false;

        // Calcular promedios con manejo de nulls
        $potenciaMaxima = $lecturas->whereNotNull('potencia_total_w')->max('potencia_total_w') ?? 0;
        $potenciaPromedio = $lecturas->whereNotNull('potencia_total_w')->avg('potencia_total_w') ?? 0;
        $voltajePromedio = $lecturas->whereNotNull('voltaje_promedio')->avg('voltaje_promedio') ?? 0;
        
        // Calcular corrientes promedio
        $corrientePromedio1 = $lecturas->whereNotNull('corriente_canal_1')->avg('corriente_canal_1') ?? 0;
        $corrientePromedio2 = $lecturas->whereNotNull('corriente_canal_2')->avg('corriente_canal_2') ?? 0;
        $corrientePromedio3 = $lecturas->whereNotNull('corriente_canal_3')->avg('corriente_canal_3') ?? 0;
        $corrienteNeutroPromedio = $lecturas->whereNotNull('corriente_neutro')->avg('corriente_neutro') ?? 0;

        // Calcular factor de potencia promedio solo con valores válidos
        $pfPromedios = collect([
            $lecturas->whereNotNull('pf_canal_1')->avg('pf_canal_1'),
            $lecturas->whereNotNull('pf_canal_2')->avg('pf_canal_2'),
            $lecturas->whereNotNull('pf_canal_3')->avg('pf_canal_3'),
        ])->filter(fn($val) => $val !== null);

        $factorPotenciaPromedio = $pfPromedios->isNotEmpty() 
            ? $pfPromedios->avg() 
            : 0;

        // Calcular energía retornada y por canal
        $energiaRetornada = $ultimaLectura->energia_retornada_kwh ?? 0;
        $energiaCanal1 = $ultimaLectura->energia_canal_1_kwh ?? 0;
        $energiaCanal2 = $ultimaLectura->energia_canal_2_kwh ?? 0;
        $energiaCanal3 = $ultimaLectura->energia_canal_3_kwh ?? 0;

        // Estado WiFi y conexión
        $wifiConectado = $ultimaLectura->wifi_conectado ?? false;
        $wifiRssi = $ultimaLectura->wifi_rssi ?? null;
        $uptimeSegundos = $ultimaLectura->uptime_segundos ?? null;

        return [
            'potencia_actual_kw' => round(($ultimaLectura->potencia_total_w ?? 0) / 1000, 2),
            'potencia_maxima_kw' => round($potenciaMaxima / 1000, 2),
            'potencia_promedio_kw' => round($potenciaPromedio / 1000, 2),
            'energia_total_kwh' => round($ultimaLectura->energia_total_kwh ?? 0, 2),
            'energia_retornada_kwh' => round($energiaRetornada, 2),
            'energia_canal_1_kwh' => round($energiaCanal1, 2),
            'energia_canal_2_kwh' => round($energiaCanal2, 2),
            'energia_canal_3_kwh' => round($energiaCanal3, 2),
            'voltaje_promedio' => round($voltajePromedio, 1),
            'corriente_promedio_1' => round($corrientePromedio1, 2),
            'corriente_promedio_2' => round($corrientePromedio2, 2),
            'corriente_promedio_3' => round($corrientePromedio3, 2),
            'corriente_neutro_promedio' => round($corrienteNeutroPromedio, 2),
            'factor_potencia_promedio' => round($factorPotenciaPromedio, 2),
            'estado_conexion' => $estaOnline ? 'online' : 'offline',
            'wifi_conectado' => $wifiConectado,
            'wifi_rssi' => $wifiRssi,
            'uptime_segundos' => $uptimeSegundos,
            'ultima_actualizacion' => $ultimaLectura->fecha_lectura?->toISOString(),
            'ultima_actualizacion_human' => $ultimaLectura->fecha_lectura?->diffForHumans(),
            'numero_lecturas' => $lecturas->count(),
        ];
    }

    private function prepararDatosGraficaPotencia($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'data' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'data' => $lecturas->map(fn($l) => round($l->potencia_total_w / 1000, 2))->toArray(),
        ];
    }

    private function prepararDatosGraficaVoltaje($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
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

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'canal1' => $lecturas->map(fn($l) => round($l->potencia_canal_1_w / 1000, 2))->toArray(),
            'canal2' => $lecturas->map(fn($l) => round($l->potencia_canal_2_w / 1000, 2))->toArray(),
            'canal3' => $lecturas->map(fn($l) => round($l->potencia_canal_3_w / 1000, 2))->toArray(),
        ];
    }

    private function prepararDatosGraficaCorrientes($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => [], 'neutro' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'canal1' => $lecturas->pluck('corriente_canal_1')->toArray(),
            'canal2' => $lecturas->pluck('corriente_canal_2')->toArray(),
            'canal3' => $lecturas->pluck('corriente_canal_3')->toArray(),
            'neutro' => $lecturas->pluck('corriente_neutro')->toArray(),
        ];
    }

    private function prepararDatosGraficaFactorPotencia($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'canal1' => $lecturas->pluck('pf_canal_1')->toArray(),
            'canal2' => $lecturas->pluck('pf_canal_2')->toArray(),
            'canal3' => $lecturas->pluck('pf_canal_3')->toArray(),
        ];
    }

    private function prepararDatosGraficaEnergia($lecturas)
    {
        if ($lecturas->isEmpty()) {
            return ['labels' => [], 'total' => [], 'retornada' => [], 'canal1' => [], 'canal2' => [], 'canal3' => []];
        }

        $formatoFecha = $this->obtenerFormatoFecha($lecturas);

        return [
            'labels' => $lecturas->map(fn($l) => $l->fecha_lectura->format($formatoFecha))->toArray(),
            'total' => $lecturas->pluck('energia_total_kwh')->toArray(),
            'retornada' => $lecturas->pluck('energia_retornada_kwh')->toArray(),
            'canal1' => $lecturas->pluck('energia_canal_1_kwh')->toArray(),
            'canal2' => $lecturas->pluck('energia_canal_2_kwh')->toArray(),
            'canal3' => $lecturas->pluck('energia_canal_3_kwh')->toArray(),
        ];
    }

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