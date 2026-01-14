<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PvgisService
{
    private const BASE_URL = 'https://re.jrc.ec.europa.eu/api/v5_2';
    private const CACHE_TTL = 86400; // 24 horas (datos históricos/promedios)

    /**
     * Obtiene datos de radiación solar y meteorológicos desde PVGIS
     * 
     * @param float $lat Latitud
     * @param float $lng Longitud
     * @return array|null Datos de radiación solar, temperatura y viento
     */
    public function obtenerDatosRadiacion(float $lat, float $lng): ?array
    {
        $cacheKey = "pvgis_radiacion_{$lat}_{$lng}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($lat, $lng) {
            try {
                // Obtener datos de radiación solar (promedio mensual)
                // PVGIS proporciona datos históricos/promedios, no predicciones
                // PVGIS solo acepta años entre 2005 y 2020, usar 2020 (último año disponible)
                $year = 2020;
                
                $response = Http::timeout(30)
                    ->get(self::BASE_URL . '/seriescalc', [
                        'lat' => $lat,
                        'lon' => $lng,
                        'outputformat' => 'json',
                        'startyear' => $year,
                        'endyear' => $year,
                        'pvcalculation' => 0, // Solo datos de radiación, sin cálculo PV
                        'raddatabase' => 'PVGIS-SARAH2', // Base de datos SARAH2 (más precisa)
                    ]);

                if (!$response->successful()) {
                    Log::warning('Error en petición PVGIS', [
                        'status' => $response->status(),
                        'body' => substr($response->body(), 0, 500),
                    ]);
                    return null;
                }

                $data = $response->json();

                if (!is_array($data)) {
                    Log::warning('Respuesta PVGIS no es un array', [
                        'data' => $data,
                    ]);
                    return null;
                }

                // PVGIS puede devolver datos en diferentes formatos
                $outputs = $data['outputs'] ?? $data;
                
                // Obtener datos del día actual o promedio
                $radiacionSolar = null;
                $temperatura = null;
                $vientoVelocidad = null;

                // PVGIS devuelve datos horarios del año 2020
                // Como los datos son históricos, usamos el mismo día del año 2020 (mes y día actuales)
                // El formato de fecha en PVGIS es "YYYYMMDD:HHMM" (ej: "20200114:0010")
                if (isset($outputs['hourly']) && is_array($outputs['hourly'])) {
                    // Usar el mismo mes y día pero del año 2020, formato YYYYMMDD
                    $fechaBuscar = '2020' . now()->format('md'); // "20200114"
                    
                    $datosHoy = array_filter($outputs['hourly'], function($hora) use ($fechaBuscar) {
                        // El formato es "YYYYMMDD:HHMM", buscar que empiece con la fecha
                        return isset($hora['time']) && strpos($hora['time'], $fechaBuscar) === 0;
                    });

                    if (!empty($datosHoy)) {
                        // Calcular promedio de radiación solar del día actual
                        // PVGIS usa diferentes nombres de campos según la versión
                        $radiaciones = [];
                        $temperaturas = [];
                        $vientos = [];
                        
                        foreach ($datosHoy as $hora) {
                            // Intentar diferentes nombres de campos
                            $rad = $hora['G(i)'] ?? $hora['G_i'] ?? $hora['G'] ?? $hora['ghi'] ?? null;
                            $temp = $hora['T2m'] ?? $hora['T'] ?? $hora['temp'] ?? null;
                            $viento = $hora['WS10m'] ?? $hora['WS'] ?? $hora['ws'] ?? null;
                            
                            if ($rad !== null && $rad > 0) {
                                $radiaciones[] = $rad;
                            }
                            if ($temp !== null) {
                                $temperaturas[] = $temp;
                            }
                            if ($viento !== null && $viento > 0) {
                                $vientos[] = $viento;
                            }
                        }

                        if (!empty($radiaciones)) {
                            $radiacionSolar = round(array_sum($radiaciones) / count($radiaciones), 2);
                        } else {
                            Log::warning('No se encontraron datos de radiación en datos horarios', [
                                'count_datos_hoy' => count($datosHoy),
                                'primer_hora_keys' => !empty($datosHoy) ? array_keys(reset($datosHoy)) : 'no hay',
                            ]);
                        }
                        if (!empty($temperaturas)) {
                            $temperatura = round(array_sum($temperaturas) / count($temperaturas), 1);
                        }
                        if (!empty($vientos)) {
                            $vientoVelocidad = round(array_sum($vientos) / count($vientos), 2);
                        }
                    } else {
                        Log::warning('No hay datos horarios para la fecha buscada', [
                            'fecha_buscar' => $fechaBuscar,
                            'total_horas' => count($outputs['hourly']),
                            'primeras_3_fechas' => array_slice(array_column($outputs['hourly'], 'time'), 0, 3),
                        ]);
                    }
                }

                // Si no hay datos del día específico, calcular promedio de todas las horas del día
                // o usar promedios mensuales si están disponibles
                if ($radiacionSolar === null && isset($outputs['hourly']) && is_array($outputs['hourly'])) {
                    // Intentar obtener promedio del mes actual desde datos horarios
                    $mesActual = (int) now()->format('m');
                    $mesBuscar = str_pad($mesActual, 2, '0', STR_PAD_LEFT);
                    $fechaBuscarMes = '2020' . $mesBuscar; // "202001"
                    
                    $datosMes = array_filter($outputs['hourly'], function($hora) use ($fechaBuscarMes) {
                        return isset($hora['time']) && strpos($hora['time'], $fechaBuscarMes) === 0;
                    });
                    
                    if (!empty($datosMes)) {
                        $radiaciones = [];
                        $temperaturas = [];
                        $vientos = [];
                        
                        foreach ($datosMes as $hora) {
                            $rad = $hora['G(i)'] ?? $hora['G_i'] ?? $hora['G'] ?? $hora['ghi'] ?? null;
                            $temp = $hora['T2m'] ?? $hora['T'] ?? $hora['temp'] ?? null;
                            $viento = $hora['WS10m'] ?? $hora['WS'] ?? $hora['ws'] ?? null;
                            
                            if ($rad !== null && $rad > 0) {
                                $radiaciones[] = $rad;
                            }
                            if ($temp !== null) {
                                $temperaturas[] = $temp;
                            }
                            if ($viento !== null && $viento > 0) {
                                $vientos[] = $viento;
                            }
                        }
                        
                        if (!empty($radiaciones)) {
                            $radiacionSolar = round(array_sum($radiaciones) / count($radiaciones), 2);
                        }
                        if (!empty($temperaturas)) {
                            $temperatura = round(array_sum($temperaturas) / count($temperaturas), 1);
                        }
                        if (!empty($vientos)) {
                            $vientoVelocidad = round(array_sum($vientos) / count($vientos), 2);
                        }
                    }
                }
                
                // Si aún no hay datos, intentar usar promedios mensuales si están disponibles
                if ($radiacionSolar === null && isset($outputs['monthly']) && is_array($outputs['monthly'])) {
                    $mesActual = (int) now()->format('m');
                    
                    foreach ($outputs['monthly'] as $mes) {
                        if (isset($mes['month']) && (int)$mes['month'] === $mesActual) {
                            $radiacionSolar = $mes['H(i)_m'] ?? $mes['H_i_m'] ?? $mes['H_m'] ?? null;
                            $temperatura = $mes['T2m'] ?? $mes['T'] ?? null;
                            break;
                        }
                    }
                }

                // PVGIS solo devuelve radiación solar
                // Los demás datos (temperatura, viento, salida/puesta del sol) vienen de AEMET
                return [
                    'radiacion_solar' => $radiacionSolar,
                ];
            } catch (\Exception $e) {
                Log::error('Excepción al obtener datos PVGIS', [
                    'error' => $e->getMessage(),
                    'lat' => $lat,
                    'lng' => $lng,
                ]);
                return null;
            }
        });
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
            Log::warning('Error al calcular salida/puesta del sol', [
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
