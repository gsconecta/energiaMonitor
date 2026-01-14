<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AemetService
{
    private const BASE_URL = 'https://opendata.aemet.es/opendata/api';
    private const CACHE_MUNICIPIOS_TTL = 86400; // 24 horas
    private const CACHE_PREDICCION_TTL = 3600; // 1 hora

    /**
     * Obtiene información del municipio desde coordenadas usando Nominatim (OpenStreetMap)
     * Devuelve un array con 'codigo' (postcode) y 'nombre' del municipio
     */
    public function obtenerInfoMunicipioDesdeNominatim(float $lat, float $lng): ?array
    {
        try {
            $cacheKey = "nominatim_info_{$lat}_{$lng}";
            
            return Cache::remember($cacheKey, 86400, function () use ($lat, $lng) {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'User-Agent' => 'EnergiaMonitor/1.0 (Laravel Application)',
                    ])
                    ->get('https://nominatim.openstreetmap.org/reverse', [
                        'lat' => $lat,
                        'lon' => $lng,
                        'format' => 'json',
                    ]);
                
                if (!$response->successful()) {
                    Log::warning('Error en petición Nominatim', [
                        'status' => $response->status(),
                        'lat' => $lat,
                        'lon' => $lng,
                    ]);
                    return null;
                }
                
                $data = $response->json();
                
                $nombreMunicipio = $data['address']['town'] 
                    ?? $data['address']['city'] 
                    ?? $data['address']['municipality']
                    ?? $data['address']['village']
                    ?? null;
                
                $postcode = isset($data['address']['postcode']) ? trim($data['address']['postcode']) : null;
                
                if ($postcode && strlen($postcode) >= 5) {
                    $codigo = substr($postcode, 0, 5);
                } else {
                    $codigo = null;
                }
                
                return [
                    'codigo' => $codigo,
                    'nombre' => $nombreMunicipio,
                ];
            });
        } catch (\Exception $e) {
            Log::error('Error al obtener información desde Nominatim', [
                'error' => $e->getMessage(),
                'lat' => $lat,
                'lng' => $lng,
            ]);
            return null;
        }
    }
    
    /**
     * Busca un municipio en el catálogo de AEMET por nombre (normalizado)
     */
    private function buscarMunicipioPorNombre(array $municipios, string $nombreBuscado): ?array
    {
        if (empty($nombreBuscado)) {
            return null;
        }
        
        // Normalizar el nombre buscado: minúsculas, sin acentos, sin espacios extra
        $nombreNormalizado = $this->normalizarNombre($nombreBuscado);
        
        $mejorCoincidencia = null;
        $mejorPuntuacion = 0;
        
        foreach ($municipios as $municipio) {
            $nombreMunicipio = $municipio['nombre'] ?? '';
            
            if (empty($nombreMunicipio)) {
                continue;
            }
            
            $nombreMunicipioNormalizado = $this->normalizarNombre($nombreMunicipio);
            
            // Coincidencia exacta
            if ($nombreNormalizado === $nombreMunicipioNormalizado) {
                return $municipio;
            }
            
            // Coincidencia parcial (contiene)
            if (stripos($nombreMunicipioNormalizado, $nombreNormalizado) !== false) {
                $puntuacion = strlen($nombreNormalizado) / strlen($nombreMunicipioNormalizado);
                if ($puntuacion > $mejorPuntuacion) {
                    $mejorPuntuacion = $puntuacion;
                    $mejorCoincidencia = $municipio;
                }
            }
        }
        
        return $mejorCoincidencia;
    }
    
    /**
     * Normaliza un nombre de municipio para comparación
     */
    private function normalizarNombre(string $nombre): string
    {
        // Convertir a minúsculas
        $nombre = mb_strtolower($nombre, 'UTF-8');
        
        // Eliminar acentos
        $nombre = str_replace(
            ['á', 'à', 'ä', 'â', 'é', 'è', 'ë', 'ê', 'í', 'ì', 'ï', 'î', 'ó', 'ò', 'ö', 'ô', 'ú', 'ù', 'ü', 'û', 'ñ', 'ç'],
            ['a', 'a', 'a', 'a', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'n', 'c'],
            $nombre
        );
        
        // Eliminar espacios extra y trim
        $nombre = trim(preg_replace('/\s+/', ' ', $nombre));
        
        return $nombre;
    }

    /**
     * Obtiene el código de municipio más cercano a las coordenadas dadas
     * Estrategia mejorada:
     * 1. Obtener nombre del municipio desde Nominatim
     * 2. Buscar ese municipio en el catálogo de AEMET por nombre
     * 3. Si no se encuentra, usar búsqueda por proximidad geográfica
     */
    public function obtenerCodigoMunicipioDesdeCoordenadas(float $lat, float $lng): ?string
    {
        try {
            // Obtener información del municipio desde Nominatim (nombre y código postal)
            $infoNominatim = $this->obtenerInfoMunicipioDesdeNominatim($lat, $lng);
            
            // Obtener catálogo de municipios de AEMET
            $municipios = $this->obtenerCatalogoMunicipios();
            
            if (!is_array($municipios) || empty($municipios)) {
                Log::warning('No se pudieron obtener municipios de AEMET o el catálogo está vacío', [
                    'tipo' => gettype($municipios),
                    'vacio' => empty($municipios),
                ]);
                return null;
            }
            
            // Estrategia 1: Si Nominatim devolvió un nombre, buscar por nombre en el catálogo de AEMET
            if ($infoNominatim && !empty($infoNominatim['nombre'])) {
                $municipioEncontrado = $this->buscarMunicipioPorNombre($municipios, $infoNominatim['nombre']);
                
                if ($municipioEncontrado) {
                    $codigoMunicipio = $this->extraerCodigoMunicipio($municipioEncontrado);
                    
                    if ($codigoMunicipio) {
                        return $codigoMunicipio;
                    }
                }
            }
            
            // Estrategia 2: Si Nominatim devolvió un código postal, intentar usarlo directamente
            // (puede funcionar en algunos casos, aunque no es confiable)
            if ($infoNominatim && !empty($infoNominatim['codigo'])) {
                $codigoPostal = $infoNominatim['codigo'];
                
                // Verificar si este código existe en el catálogo de AEMET
                foreach ($municipios as $municipio) {
                    $codigoMunicipio = $this->extraerCodigoMunicipio($municipio);
                    if ($codigoMunicipio === $codigoPostal) {
                        return $codigoMunicipio;
                    }
                }
            }
            
            // Estrategia 3: Búsqueda por proximidad geográfica (fallback)
            $municipioMasCercano = null;
            $distanciaMinima = PHP_FLOAT_MAX;

            foreach ($municipios as $municipio) {
                // AEMET usa 'latitud_dec' y 'longitud_dec' para valores decimales
                // También puede tener 'latitud'/'longitud' en formato DMS o 'lat'/'lon'
                $municipioLat = $municipio['latitud_dec'] 
                    ?? $municipio['latitud'] 
                    ?? $municipio['lat'] 
                    ?? null;
                $municipioLng = $municipio['longitud_dec'] 
                    ?? $municipio['longitud'] 
                    ?? $municipio['lon'] 
                    ?? $municipio['lng'] 
                    ?? null;
                
                // Si no tiene coordenadas, saltar
                if ($municipioLat === null || $municipioLng === null) {
                    continue;
                }

                $distancia = $this->calcularDistanciaHaversine(
                    $lat,
                    $lng,
                    (float) $municipioLat,
                    (float) $municipioLng
                );

                if ($distancia < $distanciaMinima) {
                    $distanciaMinima = $distancia;
                    $municipioMasCercano = $municipio;
                }
            }

            if ($municipioMasCercano) {
                $codigoMunicipio = $this->extraerCodigoMunicipio($municipioMasCercano);
                
                if ($codigoMunicipio) {
                    return $codigoMunicipio;
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Error al obtener código de municipio desde coordenadas', [
                'error' => $e->getMessage(),
                'lat' => $lat,
                'lng' => $lng,
            ]);
            return null;
        }
    }
    
    /**
     * Extrae el código de municipio de un array de municipio de AEMET
     */
    private function extraerCodigoMunicipio(array $municipio): ?string
    {
        $codigoMunicipio = null;
        
        // 1. Primero intentar extraer del campo 'id' (formato: "id07027" o "id44001")
        // Este es el código que AEMET usa en su API web
        if (isset($municipio['id'])) {
            $id = $municipio['id'];
            // Extraer números del formato "id07027" o similar
            if (preg_match('/(\d+)/', $id, $matches)) {
                $codigoMunicipio = $matches[1];
                // Asegurar que tenga 5 dígitos
                if (strlen($codigoMunicipio) < 5) {
                    $codigoMunicipio = str_pad($codigoMunicipio, 5, '0', STR_PAD_LEFT);
                }
            }
        }
        
        // 2. Si no hay id, usar id_old como fallback (código INE directo, formato: "07270")
        if (!$codigoMunicipio && isset($municipio['id_old'])) {
            $codigoMunicipio = (string) $municipio['id_old'];
            // Asegurar que tenga 5 dígitos
            if (strlen($codigoMunicipio) < 5) {
                $codigoMunicipio = str_pad($codigoMunicipio, 5, '0', STR_PAD_LEFT);
            }
        }
        
        // 3. Otros campos posibles como fallback
        if (!$codigoMunicipio) {
            $codigoMunicipio = $municipio['idMunicipio'] 
                ?? $municipio['codigo'] 
                ?? $municipio['codigoINE'] 
                ?? null;
            
            if ($codigoMunicipio) {
                $codigoMunicipio = (string) $codigoMunicipio;
                if (strlen($codigoMunicipio) < 5) {
                    $codigoMunicipio = str_pad($codigoMunicipio, 5, '0', STR_PAD_LEFT);
                }
            }
        }
        
        return $codigoMunicipio;
    }

    /**
     * Obtiene la salida y puesta del sol para un municipio usando predicción horaria
     */
    public function obtenerSalidaPuestaSol(string $codigoMunicipio): ?array
    {
        $cacheKey = "aemet_sol_{$codigoMunicipio}";

        return Cache::remember($cacheKey, self::CACHE_PREDICCION_TTL, function () use ($codigoMunicipio) {
            try {
                $apiKey = config('services.aemet.api_key');
                
                if (!$apiKey) {
                    Log::warning('AEMET API key no configurada');
                    return null;
                }

                // Usar el endpoint de predicción horaria que incluye datos de salida/puesta del sol
                $response = Http::timeout(30)
                    ->get(self::BASE_URL . "/prediccion/especifica/municipio/horaria/{$codigoMunicipio}", [
                        'api_key' => $apiKey,
                    ]);

                if (!$response->successful()) {
                    Log::warning('Error al obtener predicción horaria para salida/puesta sol AEMET', [
                        'status' => $response->status(),
                    ]);
                    return null;
                }

                $data = $response->json();

                if (!isset($data['datos']) || !is_string($data['datos'])) {
                    Log::warning('Respuesta AEMET sin URL de datos para predicción horaria', ['data' => $data]);
                    return null;
                }

                // Segunda petición: obtener los datos reales
                $datosResponse = Http::timeout(30)->get($data['datos']);

                if (!$datosResponse->successful()) {
                    Log::warning('Error al obtener datos de predicción horaria AEMET', [
                        'status' => $datosResponse->status(),
                        'url' => $data['datos'],
                    ]);
                    return null;
                }

                // Intentar obtener JSON
                $datos = $datosResponse->json();
                
                // Si json() devuelve null, intentar decodificar manualmente con conversión de codificación
                if ($datos === null) {
                    $body = $datosResponse->body();
                    // Convertir de ISO-8859-15 a UTF-8 si es necesario
                    $bodyUtf8 = mb_convert_encoding($body, 'UTF-8', 'ISO-8859-15');
                    $datos = json_decode($bodyUtf8, true);
                    
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        Log::warning('Error al decodificar JSON de predicción horaria AEMET', [
                            'json_error' => json_last_error_msg(),
                        ]);
                        return null;
                    }
                }

                // Procesar los datos para extraer salida y puesta del sol del día actual
                return $this->procesarDatosSol($datos);
            } catch (\Exception $e) {
                Log::warning('Excepción al obtener salida/puesta sol AEMET', [
                    'error' => $e->getMessage(),
                    'codigo_municipio' => $codigoMunicipio,
                ]);
                return null;
            }
        });
    }

    /**
     * Procesa los datos de salida/puesta del sol
     */
    private function procesarDatosSol(array $datos): ?array
    {
        // Buscar los datos del día actual
        $hoy = now()->format('Y-m-d');
        
        // Los datos pueden venir en diferentes formatos
        $salidaSol = null;
        $puestaSol = null;
        
        if (isset($datos[0]) && is_array($datos[0])) {
            // Si es un array, buscar en prediccion.dia
            if (isset($datos[0]['prediccion']['dia'])) {
                $dias = $datos[0]['prediccion']['dia'];
                if (is_array($dias) && !empty($dias)) {
                    // Buscar el día de hoy
                    foreach ($dias as $dia) {
                        if (isset($dia['fecha']) && strpos($dia['fecha'], $hoy) !== false) {
                            $salidaSol = $dia['orto'] ?? $dia['salidaSol'] ?? $dia['salida_sol'] ?? null;
                            $puestaSol = $dia['ocaso'] ?? $dia['puestaSol'] ?? $dia['puesta_sol'] ?? null;
                            break;
                        }
                    }
                    
                    // Si no se encuentra el día de hoy, tomar el primer elemento
                    if ($salidaSol === null && $puestaSol === null && !empty($dias)) {
                        $primerDia = is_array($dias[0] ?? null) ? $dias[0] : $dias;
                        $salidaSol = $primerDia['orto'] ?? $primerDia['salidaSol'] ?? $primerDia['salida_sol'] ?? null;
                        $puestaSol = $primerDia['ocaso'] ?? $primerDia['puestaSol'] ?? $primerDia['puesta_sol'] ?? null;
                    }
                }
            } else {
                // Buscar directamente en el primer elemento
                $primerElemento = $datos[0];
                $salidaSol = $primerElemento['orto'] ?? $primerElemento['salidaSol'] ?? $primerElemento['salida_sol'] ?? null;
                $puestaSol = $primerElemento['ocaso'] ?? $primerElemento['puestaSol'] ?? $primerElemento['puesta_sol'] ?? null;
            }
        } elseif (isset($datos['prediccion']['dia'])) {
            // Si los datos están en formato prediccion.dia
            $dias = $datos['prediccion']['dia'];
            if (is_array($dias) && !empty($dias)) {
                $primerDia = is_array($dias[0] ?? null) ? $dias[0] : $dias;
                $salidaSol = $primerDia['orto'] ?? $primerDia['salidaSol'] ?? $primerDia['salida_sol'] ?? null;
                $puestaSol = $primerDia['ocaso'] ?? $primerDia['puestaSol'] ?? $primerDia['puesta_sol'] ?? null;
            }
        } elseif (isset($datos['orto']) || isset($datos['ocaso'])) {
            // Si los datos están directamente en el objeto
            $salidaSol = $datos['orto'] ?? $datos['salidaSol'] ?? $datos['salida_sol'] ?? null;
            $puestaSol = $datos['ocaso'] ?? $datos['puestaSol'] ?? $datos['puesta_sol'] ?? null;
        }
        
        return [
            'salida_sol' => $salidaSol,
            'puesta_sol' => $puestaSol,
        ];
    }

    /**
     * Obtiene la predicción meteorológica para un municipio
     */
    public function obtenerPrediccionMunicipio(string $codigoMunicipio): ?array
    {
        // Normalizar el código: asegurar que tenga 5 dígitos
        $codigoNormalizado = str_pad(trim($codigoMunicipio), 5, '0', STR_PAD_LEFT);
        $cacheKey = "aemet_prediccion_{$codigoNormalizado}";

        return Cache::remember($cacheKey, self::CACHE_PREDICCION_TTL, function () use ($codigoNormalizado) {
            try {
                $apiKey = config('services.aemet.api_key');
                
                if (!$apiKey) {
                    Log::warning('AEMET API key no configurada');
                    return null;
                }

                // Intentar primero con el código normalizado
                $resultado = $this->intentarObtenerPrediccion($codigoNormalizado, $apiKey);
                
                // Si falla, intentar sin el cero inicial (algunos códigos pueden necesitarlo)
                if (!$resultado && strlen($codigoNormalizado) == 5 && $codigoNormalizado[0] == '0') {
                    $codigoSinCero = ltrim($codigoNormalizado, '0');
                    $resultado = $this->intentarObtenerPrediccion($codigoSinCero, $apiKey);
                }
                
                return $resultado;
            } catch (\Exception $e) {
                Log::error('Excepción al obtener predicción AEMET', [
                    'error' => $e->getMessage(),
                    'codigo_municipio' => $codigoNormalizado,
                ]);
                return null;
            }
        });
    }
    
    /**
     * Intenta obtener la predicción para un código específico
     */
    private function intentarObtenerPrediccion(string $codigoMunicipio, string $apiKey): ?array
    {
        try {
            // Primera petición: obtener URL de los datos
            $response = Http::timeout(30)
                ->get(self::BASE_URL . "/prediccion/especifica/municipio/diaria/{$codigoMunicipio}", [
                    'api_key' => $apiKey,
                ]);
                    
            Log::info('Petición predicción diaria AEMET', [
                'codigo' => $codigoMunicipio,
                'status' => $response->status(),
                'successful' => $response->successful(),
            ]);

            if (!$response->successful()) {
                Log::warning('Error en primera petición AEMET predicción diaria', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500),
                    'codigo_municipio' => $codigoMunicipio,
                ]);
                return null;
            }

            $data = $response->json();

            // Verificar si hay un error en la respuesta
            // AEMET puede devolver 200 OK pero con estado 404 en el JSON
            if (isset($data['estado']) && ($data['estado'] == 404 || $data['estado'] == 400)) {
                Log::warning('AEMET: No hay datos de predicción para este municipio', [
                    'codigo_municipio' => $codigoMunicipio,
                    'descripcion' => $data['descripcion'] ?? 'Sin descripción',
                    'estado' => $data['estado'],
                ]);
                return null;
            }

            // También verificar si hay una descripción de error sin campo 'datos'
            if (!isset($data['datos']) || !is_string($data['datos'])) {
                // Si hay una descripción de error, es un error real
                if (isset($data['descripcion']) && (stripos($data['descripcion'], 'error') !== false || stripos($data['descripcion'], 'Error') !== false)) {
                    Log::warning('AEMET: Error en respuesta (sin campo datos)', [
                        'codigo_municipio' => $codigoMunicipio,
                        'descripcion' => $data['descripcion'],
                        'data_completa' => $data,
                    ]);
                    return null;
                }
                
                Log::warning('Respuesta AEMET sin URL de datos', [
                    'data' => $data,
                    'codigo_municipio' => $codigoMunicipio,
                ]);
                return null;
            }

            // Segunda petición: obtener los datos reales
            $datosResponse = Http::timeout(30)->get($data['datos']);

            if (!$datosResponse->successful()) {
                Log::error('Error al obtener datos de AEMET', [
                    'status' => $datosResponse->status(),
                    'url' => $data['datos'],
                    'body' => substr($datosResponse->body(), 0, 500),
                ]);
                return null;
            }

            // Intentar obtener JSON
            $datos = $datosResponse->json();
            
            // Si json() devuelve null, intentar decodificar manualmente con conversión de codificación
            if ($datos === null) {
                $body = $datosResponse->body();
                
                // Convertir de ISO-8859-15 a UTF-8 si es necesario
                $bodyUtf8 = mb_convert_encoding($body, 'UTF-8', 'ISO-8859-15');
                
                $datos = json_decode($bodyUtf8, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    Log::error('Error al decodificar JSON de predicción AEMET', [
                        'json_error' => json_last_error_msg(),
                        'body_preview' => substr($bodyUtf8, 0, 500),
                    ]);
                    return null;
                }
            }

            // Verificar que los datos sean un array antes de procesarlos
            if (!is_array($datos)) {
                Log::error('Datos de predicción AEMET no son un array', [
                    'tipo' => gettype($datos),
                    'valor' => $datos,
                ]);
                return null;
            }

            // Procesar los datos para extraer información del día actual
            return $this->procesarDatosPrediccion($datos);
        } catch (\Exception $e) {
            Log::error('Excepción al intentar obtener predicción AEMET', [
                'error' => $e->getMessage(),
                'codigo_municipio' => $codigoMunicipio,
            ]);
            return null;
        }
    }

    /**
     * Obtiene el catálogo de municipios de AEMET (con caché)
     */
    private function obtenerCatalogoMunicipios(): array
    {
        return Cache::remember('aemet_catalogo_municipios', self::CACHE_MUNICIPIOS_TTL, function () {
            try {
                $apiKey = config('services.aemet.api_key');
                
                if (!$apiKey) {
                    Log::warning('AEMET API key no configurada');
                    return [];
                }

                Log::info('Obteniendo catálogo de municipios de AEMET', [
                    'url' => self::BASE_URL . '/maestro/municipios',
                    'api_key_prefix' => substr($apiKey, 0, 10) . '...',
                ]);

                // Primera petición: obtener URL de los datos
                $response = Http::timeout(30)
                    ->get(self::BASE_URL . '/maestro/municipios', [
                        'api_key' => $apiKey,
                    ]);

                if (!$response->successful()) {
                    Log::error('Error al obtener catálogo de municipios AEMET', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                        'headers' => $response->headers(),
                    ]);
                    return [];
                }

                $data = $response->json();

                if (!is_array($data) || !isset($data['datos']) || !is_string($data['datos'])) {
                    Log::error('Respuesta AEMET sin URL de datos para catálogo', [
                        'data' => $data,
                        'tipo_data' => gettype($data),
                        'tiene_datos_key' => isset($data['datos']),
                        'datos_tipo' => isset($data['datos']) ? gettype($data['datos']) : 'no existe',
                    ]);
                    return [];
                }

                // Segunda petición: obtener los datos reales
                $datosResponse = Http::timeout(30)->get($data['datos']);

                if (!$datosResponse->successful()) {
                    Log::error('Error al obtener datos del catálogo AEMET', [
                        'status' => $datosResponse->status(),
                        'url' => $data['datos'],
                        'body' => $datosResponse->body(),
                    ]);
                    return [];
                }

                // Intentar obtener JSON
                $municipios = $datosResponse->json();
                
                // Si json() devuelve null, intentar decodificar manualmente con conversión de codificación
                if ($municipios === null) {
                    $body = $datosResponse->body();
                    
                    // Convertir de ISO-8859-15 a UTF-8
                    $bodyUtf8 = mb_convert_encoding($body, 'UTF-8', 'ISO-8859-15');
                    
                    $municipios = json_decode($bodyUtf8, true);
                    
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        Log::error('Error al decodificar JSON del catálogo AEMET', [
                            'json_error' => json_last_error_msg(),
                            'body_preview' => substr($bodyUtf8, 0, 500),
                        ]);
                        return [];
                    }
                }
                
                // Asegurar que siempre devolvemos un array
                if (!is_array($municipios)) {
                    Log::warning('Respuesta AEMET no es un array', [
                        'tipo' => gettype($municipios),
                        'valor' => $municipios,
                    ]);
                    return [];
                }

                if (empty($municipios)) {
                    Log::warning('Catálogo de municipios AEMET está vacío');
                }

                return $municipios;
            } catch (\Exception $e) {
                Log::error('Excepción al obtener catálogo de municipios AEMET', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]);
                return [];
            }
        }) ?? [];
    }

    /**
     * Procesa los datos de predicción y extrae información relevante
     */
    private function procesarDatosPrediccion(array $datos): ?array
    {
        // AEMET puede devolver los datos en diferentes estructuras
        // Intentar diferentes formatos comunes
        
        // Formato 1: Array directo con predicción
        $prediccionDia = null;
        
        if (isset($datos[0]) && is_array($datos[0])) {
            // Si el primer elemento tiene 'prediccion'
            if (isset($datos[0]['prediccion']['dia'][0])) {
                $prediccionDia = $datos[0]['prediccion']['dia'][0];
            } elseif (isset($datos[0]['prediccion']['dia'])) {
                // Si 'dia' es un objeto en lugar de array
                $prediccionDia = is_array($datos[0]['prediccion']['dia']) 
                    ? ($datos[0]['prediccion']['dia'][0] ?? $datos[0]['prediccion']['dia'])
                    : $datos[0]['prediccion']['dia'];
            } elseif (isset($datos[0]['dia'])) {
                // Formato alternativo
                $prediccionDia = is_array($datos[0]['dia']) ? ($datos[0]['dia'][0] ?? $datos[0]['dia']) : $datos[0]['dia'];
            } elseif (isset($datos[0]['prediccion'])) {
                // Si prediccion está directamente en el primer elemento
                $prediccionDia = $datos[0]['prediccion'];
            }
        } elseif (isset($datos['prediccion']['dia'][0])) {
            // Formato donde datos es un objeto con 'prediccion'
            $prediccionDia = $datos['prediccion']['dia'][0];
        } elseif (isset($datos['prediccion']['dia'])) {
            $prediccionDia = is_array($datos['prediccion']['dia']) 
                ? ($datos['prediccion']['dia'][0] ?? $datos['prediccion']['dia'])
                : $datos['prediccion']['dia'];
        } elseif (isset($datos['prediccion'])) {
            $prediccionDia = $datos['prediccion'];
        }

        if (!$prediccionDia || !is_array($prediccionDia)) {
            Log::warning('No se pudo extraer predicción del día de AEMET', [
                'estructura' => array_keys($datos),
                'tipo_prediccion_dia' => gettype($prediccionDia),
            ]);
            return null;
        }

        // Temperaturas
        $temperaturaMaxima = null;
        $temperaturaMinima = null;
        
        if (isset($prediccionDia['temperatura'])) {
            if (is_array($prediccionDia['temperatura'])) {
                $temperaturaMaxima = $prediccionDia['temperatura']['maxima'] ?? null;
                $temperaturaMinima = $prediccionDia['temperatura']['minima'] ?? null;
            }
        }
        
        $temperaturaActual = $temperaturaMaxima ?? $temperaturaMinima ?? null;

        // Viento - puede ser array con múltiples períodos
        $vientoVelocidad = null;
        $vientoDireccion = null;
        
        if (isset($prediccionDia['viento'])) {
            $vientoArray = $prediccionDia['viento'];
            
            if (is_array($vientoArray) && !empty($vientoArray)) {
                // Si es un array de períodos, tomar el período más relevante
                $vientoDatos = null;
                $horaActual = (int) now()->format('H');
                
                // Determinar el período actual basado en la hora
                $periodoActual = null;
                if ($horaActual >= 0 && $horaActual < 6) {
                    $periodoActual = '00-06';
                } elseif ($horaActual >= 6 && $horaActual < 12) {
                    $periodoActual = '06-12';
                } elseif ($horaActual >= 12 && $horaActual < 18) {
                    $periodoActual = '12-18';
                } else {
                    $periodoActual = '18-24';
                }
                
                // Buscar el período actual primero
                foreach ($vientoArray as $periodo) {
                    if (is_array($periodo) && isset($periodo['periodo']) && $periodo['periodo'] === $periodoActual) {
                        $vientoDatos = $periodo;
                        break;
                    }
                }
                
                // Si no hay período actual, buscar 00-24 (día completo)
                if (!$vientoDatos) {
                    foreach ($vientoArray as $periodo) {
                        if (is_array($periodo) && isset($periodo['periodo']) && $periodo['periodo'] === '00-24') {
                            $vientoDatos = $periodo;
                            break;
                        }
                    }
                }
                
                // Si no hay 00-24, tomar el primer período con datos válidos
                if (!$vientoDatos) {
                    foreach ($vientoArray as $periodo) {
                        if (is_array($periodo) && 
                            isset($periodo['velocidad']) && 
                            $periodo['velocidad'] > 0 && 
                            !empty($periodo['direccion'])) {
                            $vientoDatos = $periodo;
                            break;
                        }
                    }
                }
                
                // Si aún no hay datos, tomar el primer elemento
                if (!$vientoDatos && is_array($vientoArray[0] ?? null)) {
                    $vientoDatos = $vientoArray[0];
                }
                
                if ($vientoDatos && is_array($vientoDatos)) {
                    $vientoVelocidad = $vientoDatos['velocidad'] ?? null;
                    $vientoDireccion = $vientoDatos['direccion'] ?? null;
                }
            } elseif (is_array($vientoArray)) {
                // Si es un objeto directo
                $vientoVelocidad = $vientoArray['velocidad'] ?? null;
                $vientoDireccion = $vientoArray['direccion'] ?? null;
            }
        }

        // Estado del cielo - puede ser array con múltiples períodos
        $estadoCieloDescripcion = 'Desconocido';
        $estadoCieloCodigo = '';
        
        if (isset($prediccionDia['estadoCielo'])) {
            $estadoCieloArray = $prediccionDia['estadoCielo'];
            
            if (is_array($estadoCieloArray) && !empty($estadoCieloArray)) {
                // Si es un array, tomar el primer elemento con descripción
                foreach ($estadoCieloArray as $estado) {
                    if (is_array($estado) && isset($estado['descripcion']) && !empty($estado['descripcion'])) {
                        $estadoCieloDescripcion = $estado['descripcion'];
                        $estadoCieloCodigo = $estado['value'] ?? $estado['codigo'] ?? '';
                        break;
                    }
                }
                
                // Si no se encontró descripción, tomar el primer elemento
                if ($estadoCieloDescripcion === 'Desconocido' && is_array($estadoCieloArray[0] ?? null)) {
                    $estado = $estadoCieloArray[0];
                    $estadoCieloDescripcion = $estado['descripcion'] ?? 'Desconocido';
                    $estadoCieloCodigo = $estado['value'] ?? $estado['codigo'] ?? '';
                }
            } elseif (is_array($estadoCieloArray)) {
                // Si es un objeto directo
                $estadoCieloDescripcion = $estadoCieloArray['descripcion'] ?? 'Desconocido';
                $estadoCieloCodigo = $estadoCieloArray['value'] ?? $estadoCieloArray['codigo'] ?? '';
            }
        }

        // Salida y puesta del sol
        // AEMET puede usar diferentes nombres o puede estar en otro nivel
        $orto = $prediccionDia['orto'] 
            ?? $prediccionDia['salidaSol'] 
            ?? $prediccionDia['salida_sol']
            ?? $prediccionDia['ortoHora']
            ?? null;
        $ocaso = $prediccionDia['ocaso'] 
            ?? $prediccionDia['puestaSol'] 
            ?? $prediccionDia['puesta_sol']
            ?? $prediccionDia['ocasoHora']
            ?? null;
        
        // Si no están en el día, buscar en el nivel superior (datos[0])
        if (($orto === null || $ocaso === null) && isset($datos[0])) {
            $orto = $orto ?? $datos[0]['orto'] ?? $datos[0]['salidaSol'] ?? null;
            $ocaso = $ocaso ?? $datos[0]['ocaso'] ?? $datos[0]['puestaSol'] ?? null;
        }
        
        // Si aún no están, calcularlas usando la fecha y coordenadas (opcional, requiere cálculo astronómico)
        // Por ahora las dejamos como null si no están disponibles

        // Radiación solar / UV Max
        $radiacionSolar = $prediccionDia['uvMax'] ?? $prediccionDia['uv_max'] ?? $prediccionDia['radiacionSolar'] ?? null;

        return [
            'temperatura_actual' => $temperaturaActual,
            'temperatura_maxima' => $temperaturaMaxima,
            'temperatura_minima' => $temperaturaMinima,
            'viento_velocidad' => $vientoVelocidad,
            'viento_direccion' => $vientoDireccion,
            'radiacion_solar' => $radiacionSolar,
            'salida_sol' => $orto,
            'puesta_sol' => $ocaso,
            'estado_cielo' => $estadoCieloDescripcion,
            'estado_cielo_codigo' => (string) $estadoCieloCodigo,
            'fecha_actualizacion' => now()->toISOString(),
        ];
    }

    /**
     * Calcula la distancia entre dos puntos usando la fórmula de Haversine
     */
    private function calcularDistanciaHaversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $radioTierra = 6371; // Radio de la Tierra en kilómetros

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $radioTierra * $c;
    }
}
