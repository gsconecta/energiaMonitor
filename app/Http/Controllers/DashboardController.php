<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Sitio;
use App\Models\Organizacion;
use App\Services\AemetService;
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
        $crearQueryDispositivos = function () use ($sitioActualId) {
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

        // Obtener la última lectura real del dispositivo (sin filtrar por período) para el componente de flujo energético
        $ultimaLecturaReal = $dispositivo->lecturas()
            ->orderBy('fecha_lectura', 'desc')
            ->first();

        // Calcular métricas
        $metricas = $this->calcularMetricas($lecturas, $dispositivo, $ultimaLecturaReal);

        // Preparar datos para la gráfica de balance energético
        $datosGrafica = $lecturas->map(function ($lectura) {
            return [
                'fecha' => $lectura->fecha_lectura->toISOString(),
                'produccion_fotovoltaica_kw' => round(($lectura->obtenerPotenciaFotovoltaica() ?? 0) / 1000, 2),
                'red_electrica_kw' => round(($lectura->obtenerPotenciaRedElectrica() ?? 0) / 1000, 2),
                'consumo_casa_kw' => round(($lectura->calcularConsumoCasa() ?? 0) / 1000, 2),
            ];
        })->values();

        // Obtener datos meteorológicos si el sitio tiene coordenadas o código AEMET manual
        $datosMeteorologicos = null;
        if ($sitioActual && (($sitioActual->latitud && $sitioActual->longitud) || $sitioActual->codigo_municipio_aemet)) {
            try {
                // Usar PVGIS solo para radiación solar (más preciso)
                // AEMET para el resto de datos del día actual (temperatura, viento, estado del cielo, salida/puesta del sol)
                $pvgisService = new \App\Services\PvgisService();
                $aemetService = new AemetService();

                $datosMeteorologicos = [];

                // Obtener radiación solar desde PVGIS (solo este dato)
                if ($sitioActual->latitud && $sitioActual->longitud) {
                    $datosPvgis = $pvgisService->obtenerDatosRadiacion(
                        $sitioActual->latitud,
                        $sitioActual->longitud
                    );

                    if ($datosPvgis && isset($datosPvgis['radiacion_solar'])) {
                        $datosMeteorologicos['radiacion_solar'] = $datosPvgis['radiacion_solar'];
                    }
                }

                // Obtener todos los demás datos desde AEMET (temperatura, viento, estado del cielo, salida/puesta del sol)
                $codigoMunicipio = $sitioActual->codigo_municipio_aemet;
                $codigoFuente = 'manual';

                if (!$codigoMunicipio && $sitioActual->latitud && $sitioActual->longitud) {
                    $codigoMunicipio = $aemetService->obtenerCodigoMunicipioDesdeCoordenadas(
                        $sitioActual->latitud,
                        $sitioActual->longitud
                    );
                    $codigoFuente = 'calculado';
                }

                if ($codigoMunicipio) {
                    $datosAemet = $aemetService->obtenerPrediccionMunicipio($codigoMunicipio);

                    // Si el código manual no funciona y hay coordenadas, intentar con el código calculado
                    if (!$datosAemet && $sitioActual->codigo_municipio_aemet && $sitioActual->latitud && $sitioActual->longitud) {
                        $codigoCalculado = $aemetService->obtenerCodigoMunicipioDesdeCoordenadas(
                            $sitioActual->latitud,
                            $sitioActual->longitud
                        );

                        if ($codigoCalculado && $codigoCalculado !== $codigoMunicipio) {
                            $datosAemet = $aemetService->obtenerPrediccionMunicipio($codigoCalculado);
                        }
                    }

                    // Usar datos de AEMET para todo excepto radiación solar
                    if ($datosAemet) {
                        $datosMeteorologicos['temperatura_actual'] = $datosAemet['temperatura_actual'] ?? null;
                        $datosMeteorologicos['temperatura_maxima'] = $datosAemet['temperatura_maxima'] ?? null;
                        $datosMeteorologicos['temperatura_minima'] = $datosAemet['temperatura_minima'] ?? null;
                        $datosMeteorologicos['viento_velocidad'] = $datosAemet['viento_velocidad'] ?? null;
                        $datosMeteorologicos['viento_direccion'] = $datosAemet['viento_direccion'] ?? null;
                        $datosMeteorologicos['estado_cielo'] = $datosAemet['estado_cielo'] ?? null;
                        $datosMeteorologicos['estado_cielo_codigo'] = $datosAemet['estado_cielo_codigo'] ?? null;
                        $datosMeteorologicos['salida_sol'] = $datosAemet['salida_sol'] ?? null;
                        $datosMeteorologicos['puesta_sol'] = $datosAemet['puesta_sol'] ?? null;
                    }

                    // Si AEMET no tiene salida/puesta del sol, calcular desde coordenadas
                    if (
                        (!isset($datosMeteorologicos['salida_sol']) || $datosMeteorologicos['salida_sol'] === null)
                        && $sitioActual->latitud && $sitioActual->longitud
                    ) {
                        $sol = $this->calcularSalidaPuestaSol($sitioActual->latitud, $sitioActual->longitud);
                        $datosMeteorologicos['salida_sol'] = $sol['salida'] ?? null;
                        $datosMeteorologicos['puesta_sol'] = $sol['puesta'] ?? null;
                    }
                } elseif ($sitioActual->latitud && $sitioActual->longitud) {
                    // Si no hay código de municipio, al menos calcular salida/puesta del sol desde coordenadas
                    $sol = $this->calcularSalidaPuestaSol($sitioActual->latitud, $sitioActual->longitud);
                    $datosMeteorologicos['salida_sol'] = $sol['salida'] ?? null;
                    $datosMeteorologicos['puesta_sol'] = $sol['puesta'] ?? null;
                }

                // Si no hay datos de ninguna fuente, crear estructura vacía
                if (!$datosMeteorologicos) {
                    $datosMeteorologicos = [
                        'temperatura_actual' => null,
                        'temperatura_maxima' => null,
                        'temperatura_minima' => null,
                        'viento_velocidad' => null,
                        'viento_direccion' => null,
                        'radiacion_solar' => null,
                        'salida_sol' => null,
                        'puesta_sol' => null,
                        'estado_cielo' => null,
                        'estado_cielo_codigo' => null,
                        'fecha_actualizacion' => now()->toISOString(),
                    ];
                } else {
                    // Asegurar que todos los campos estén presentes
                    $datosMeteorologicos['temperatura_maxima'] = $datosMeteorologicos['temperatura_maxima'] ?? null;
                    $datosMeteorologicos['temperatura_minima'] = $datosMeteorologicos['temperatura_minima'] ?? null;
                    $datosMeteorologicos['viento_direccion'] = $datosMeteorologicos['viento_direccion'] ?? null;
                    $datosMeteorologicos['estado_cielo'] = $datosMeteorologicos['estado_cielo'] ?? null;
                    $datosMeteorologicos['estado_cielo_codigo'] = $datosMeteorologicos['estado_cielo_codigo'] ?? null;
                    $datosMeteorologicos['fecha_actualizacion'] = $datosMeteorologicos['fecha_actualizacion'] ?? now()->toISOString();
                }
            } catch (\Exception $e) {
                // Silenciar errores de AEMET para no afectar el dashboard
                \Log::warning('Error al obtener datos meteorológicos', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

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
            'datos_meteorologicos' => $datosMeteorologicos,
            'periodo' => $periodo,
            'sinDispositivos' => false,
        ]);
    }

    private function obtenerLecturas($dispositivo, $periodo, $fechaDesde = null, $fechaHasta = null)
    {
        $query = $dispositivo->lecturas()->with('dispositivo');

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

    private function calcularMetricas($lecturas, $dispositivo, $ultimaLecturaReal = null)
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

        // Calcular valores instantáneos de la última lectura REAL (sin filtrar por período)
        // para el componente de flujo energético, que siempre debe mostrar tiempo real
        $lecturaParaFlujo = $ultimaLecturaReal ?? $ultimaLectura;
        $produccionFotovoltaicaActual = $lecturaParaFlujo ? ($lecturaParaFlujo->obtenerGeneracionFotovoltaica() ?? 0) : 0;
        $redElectricaActual = $lecturaParaFlujo ? ($lecturaParaFlujo->obtenerPotenciaRedElectrica() ?? 0) : 0;
        $exportacionActual = $lecturaParaFlujo ? ($lecturaParaFlujo->obtenerExportacionRed() ?? 0) : 0;
        $consumoTotalActual = $lecturaParaFlujo ? ($lecturaParaFlujo->calcularConsumoCasa() ?? 0) : 0;

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
            'energia_total_kwh' => round(max(0, (function () use ($ultimaLectura, $primeraLectura) {
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
            'produccion_fotovoltaica_actual_kw' => round($produccionFotovoltaicaActual / 1000, 2),
            'red_electrica_actual_kw' => round($redElectricaActual / 1000, 2),
            'exportacion_actual_kw' => round($exportacionActual / 1000, 2),
            'consumo_total_actual_kw' => round($consumoTotalActual / 1000, 2),
        ];
    }

    /**
     * Calcula la salida y puesta del sol para unas coordenadas dadas
     * 
     * @param float $lat Latitud
     * @param float $lng Longitud
     * @return array Con 'salida' y 'puesta' en formato HH:mm
     */
    private function calcularSalidaPuestaSol(float $lat, float $lng): array
    {
        try {
            $timezone = config('app.timezone', 'Europe/Madrid');
            $fecha = now($timezone);
            $timestamp = $fecha->getTimestamp();

            // Calcular salida del sol
            $salidaSol = date_sunrise(
                $timestamp,
                SUNFUNCS_RET_TIMESTAMP,
                $lat,
                $lng,
                90.833, // Ángulo del sol (corrección atmosférica)
                (new \DateTimeZone($timezone))->getOffset($fecha) / 3600
            );

            // Calcular puesta del sol
            $puestaSol = date_sunset(
                $timestamp,
                SUNFUNCS_RET_TIMESTAMP,
                $lat,
                $lng,
                90.833, // Ángulo del sol (corrección atmosférica)
                (new \DateTimeZone($timezone))->getOffset($fecha) / 3600
            );

            // Convertir timestamps a formato HH:mm
            $salida = $salidaSol ? date('H:i', $salidaSol) : null;
            $puesta = $puestaSol ? date('H:i', $puestaSol) : null;

            return [
                'salida' => $salida,
                'puesta' => $puesta,
            ];
        } catch (\Exception $e) {
            \Log::warning('Error al calcular salida/puesta del sol', [
                'error' => $e->getMessage(),
                'lat' => $lat,
                'lng' => $lng,
            ]);
            return [
                'salida' => null,
                'puesta' => null,
            ];
        }
    }

}