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

        // Función helper para crear la query base de dispositivos
        $crearQueryDispositivos = function() use ($sitioActualId) {
            return Dispositivo::with('sitio')
                ->whereHas('sitio', function ($q) use ($sitioActualId) {
                    $q->where('id', $sitioActualId);
                })
                ->activos();
        };

        // Obtener todos los dispositivos del sitio seleccionado para el selector
        $dispositivos = $crearQueryDispositivos()
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'tipo' => $d->tipo,
                'sitio' => [
                    'id' => $d->sitio->id,
                    'nombre' => $d->sitio->nombre,
                ],
            ]);

        // Obtener dispositivo (usar el primero del sitio si no se especifica)
        if ($dispositivoId) {
            // Verificar que el dispositivo pertenezca al sitio actual
            $dispositivo = $crearQueryDispositivos()
                ->where('id', $dispositivoId)
                ->first();
            
            // Si el dispositivo no pertenece al sitio, usar el primero disponible
            if (!$dispositivo) {
                $dispositivo = $crearQueryDispositivos()->first();
            }
        } else {
            $dispositivo = $crearQueryDispositivos()->first();
        }

        if (!$dispositivo) {
            return Inertia::render('Dashboard/Index', [
                'sinDispositivos' => true,
                'dispositivos' => [],
            ]);
        }

        // Obtener lecturas según período
        $lecturas = $this->obtenerLecturas($dispositivo, $periodo, $fechaDesde, $fechaHasta);

        // Calcular métricas
        $metricas = $this->calcularMetricas($lecturas, $dispositivo);

        // Preparar datos para la gráfica de balance energético
        $datosGrafica = $lecturas->map(function($lectura) {
            return [
                'fecha' => $lectura->fecha_lectura->toISOString(),
                'produccion_fotovoltaica_kw' => round(($lectura->obtenerPotenciaFotovoltaica() ?? 0) / 1000, 2),
                'red_electrica_kw' => round(($lectura->obtenerPotenciaRedElectrica() ?? 0) / 1000, 2),
                'consumo_casa_kw' => round(($lectura->calcularConsumoCasa() ?? 0) / 1000, 2),
            ];
        })->values();

        return Inertia::render('Dashboard/Index', [
            'dispositivo' => [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'device_id' => $dispositivo->device_id,
                'num_fases' => $dispositivo->num_fases,
                'nombre_canal_1' => $dispositivo->nombre_canal_1,
                'nombre_canal_2' => $dispositivo->nombre_canal_2,
                'nombre_canal_3' => $dispositivo->nombre_canal_3,
                'sitio' => [
                    'id' => $dispositivo->sitio->id,
                    'nombre' => $dispositivo->sitio->nombre,
                ],
            ],
            'dispositivos' => $dispositivos,
            'metricas' => $metricas,
            'datos_grafica' => $datosGrafica,
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
                'consumo_casa_kwh' => 0,
                'exportacion_neta_kwh' => 0,
                'generacion_fotovoltaica_kwh' => 0,
                'carga_baterias_kwh' => 0,
                'importacion_red_kwh' => 0,
                'exportacion_red_kwh' => 0,
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

        // Calcular energía retornada y por canal del período (diferencia entre primera y última lectura)
        // NOTA: Los valores en la BD pueden estar en Wh, no en kWh, por lo que dividimos por 1000
        $primeraLectura = $lecturas->first();
        $energiaRetornadaWh = ($ultimaLectura->energia_retornada_kwh ?? 0) - ($primeraLectura->energia_retornada_kwh ?? 0);
        $energiaCanal1Wh = ($ultimaLectura->energia_canal_1_kwh ?? 0) - ($primeraLectura->energia_canal_1_kwh ?? 0);
        $energiaCanal2Wh = ($ultimaLectura->energia_canal_2_kwh ?? 0) - ($primeraLectura->energia_canal_2_kwh ?? 0);
        $energiaCanal3Wh = ($ultimaLectura->energia_canal_3_kwh ?? 0) - ($primeraLectura->energia_canal_3_kwh ?? 0);
        
        // Convertir de Wh a kWh (dividir por 1000) si el valor es muy grande (probablemente está en Wh)
        // Si el valor es razonable (< 1000), asumimos que ya está en kWh
        $energiaRetornada = $energiaRetornadaWh > 1000 ? $energiaRetornadaWh / 1000 : $energiaRetornadaWh;
        $energiaCanal1 = $energiaCanal1Wh > 1000 ? $energiaCanal1Wh / 1000 : $energiaCanal1Wh;
        $energiaCanal2 = $energiaCanal2Wh > 1000 ? $energiaCanal2Wh / 1000 : $energiaCanal2Wh;
        $energiaCanal3 = $energiaCanal3Wh > 1000 ? $energiaCanal3Wh / 1000 : $energiaCanal3Wh;
        
        // Asegurar que no sean negativos (por si hay algún problema con los datos)
        $energiaRetornada = max(0, $energiaRetornada);
        $energiaCanal1 = max(0, $energiaCanal1);
        $energiaCanal2 = max(0, $energiaCanal2);
        $energiaCanal3 = max(0, $energiaCanal3);

        // Estado WiFi y conexión
        $wifiConectado = $ultimaLectura->wifi_conectado ?? false;
        $wifiRssi = $ultimaLectura->wifi_rssi ?? null;
        $uptimeSegundos = $ultimaLectura->uptime_segundos ?? null;

        // Calcular promedios de potencia (kW) para las métricas de balance energético
        // En lugar de energía acumulada, calculamos el promedio de potencia en el período
        $consumoCasaPromedio = 0;
        $exportacionNetaPromedio = 0;
        $generacionFVPromedio = 0;
        $cargaBateriasPromedio = 0;
        $importacionRedPromedio = 0;
        $exportacionRedPromedio = 0;

        $lecturasConDatos = 0;
        foreach ($lecturas as $lectura) {
            $consumo = $lectura->calcularConsumoCasa();
            $exportacion = $lectura->calcularExportacionNeta();
            $genFV = $lectura->obtenerGeneracionFotovoltaica();
            $carga = $lectura->obtenerCargaBaterias();
            $importacion = $lectura->obtenerImportacionRed();
            $exportacionRed = $lectura->obtenerExportacionRed();

            if ($consumo !== null || $genFV > 0 || $importacion > 0 || $exportacionRed > 0) {
                $consumoCasaPromedio += $consumo ?? 0;
                $exportacionNetaPromedio += $exportacion ?? 0;
                $generacionFVPromedio += $genFV;
                $cargaBateriasPromedio += $carga;
                $importacionRedPromedio += $importacion;
                $exportacionRedPromedio += $exportacionRed;
                $lecturasConDatos++;
            }
        }

        if ($lecturasConDatos > 0) {
            $consumoCasaPromedio = $consumoCasaPromedio / $lecturasConDatos;
            $exportacionNetaPromedio = $exportacionNetaPromedio / $lecturasConDatos;
            $generacionFVPromedio = $generacionFVPromedio / $lecturasConDatos;
            $cargaBateriasPromedio = $cargaBateriasPromedio / $lecturasConDatos;
            $importacionRedPromedio = $importacionRedPromedio / $lecturasConDatos;
            $exportacionRedPromedio = $exportacionRedPromedio / $lecturasConDatos;
        }

        return [
            'potencia_actual_kw' => round(($ultimaLectura->potencia_total_w ?? 0) / 1000, 2),
            'potencia_maxima_kw' => round($potenciaMaxima / 1000, 2),
            'potencia_promedio_kw' => round($potenciaPromedio / 1000, 2),
            'energia_total_kwh' => round(max(0, (function() use ($ultimaLectura, $primeraLectura) {
                $diferencia = ($ultimaLectura->energia_total_kwh ?? 0) - ($primeraLectura->energia_total_kwh ?? 0);
                // Convertir de Wh a kWh si el valor es muy grande
                return $diferencia > 1000 ? $diferencia / 1000 : $diferencia;
            })()), 2),
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
            'consumo_casa_kwh' => round($consumoCasaPromedio / 1000, 2),
            'exportacion_neta_kwh' => round($exportacionNetaPromedio / 1000, 2),
            'generacion_fotovoltaica_kwh' => round($generacionFVPromedio / 1000, 2),
            'carga_baterias_kwh' => round($cargaBateriasPromedio / 1000, 2),
            'importacion_red_kwh' => round($importacionRedPromedio / 1000, 2),
            'exportacion_red_kwh' => round($exportacionRedPromedio / 1000, 2),
            'estado_conexion' => $estaOnline ? 'online' : 'offline',
            'wifi_conectado' => $wifiConectado,
            'wifi_rssi' => $wifiRssi,
            'uptime_segundos' => $uptimeSegundos,
            'ultima_actualizacion' => $ultimaLectura->fecha_lectura?->toISOString(),
            'ultima_actualizacion_human' => $ultimaLectura->fecha_lectura?->diffForHumans(),
            'numero_lecturas' => $lecturas->count(),
        ];
    }

}