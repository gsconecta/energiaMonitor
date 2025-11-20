<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ObtenerLecturasShelly extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'shelly:obtener-lecturas 
                            {--dispositivo= : ID del dispositivo específico}
                            {--timeout=10 : Timeout para las peticiones HTTP}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Obtiene lecturas de dispositivos Shelly desde la API Cloud y las guarda en la base de datos';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Obteniendo lecturas de dispositivos Shelly...');
        
        $dispositivoId = $this->option('dispositivo');
        $timeout = (int) $this->option('timeout');
        
        // Obtener dispositivos activos
        $query = Dispositivo::with(['sitio.organizacion'])
            ->activos()
            ->whereHas('sitio.organizacion', function ($q) {
                $q->where('activa', true)
                  ->whereNotNull('shelly_api_key')
                  ->whereNotNull('shelly_server');
            });

        if ($dispositivoId) {
            $query->where('id', $dispositivoId);
        }

        $dispositivos = $query->get();

        if ($dispositivos->isEmpty()) {
            $this->warn('No se encontraron dispositivos activos con credenciales de Shelly configuradas.');
            return Command::FAILURE;
        }

        $this->info("Procesando {$dispositivos->count()} dispositivo(s)...");
        $this->newLine();

        $exitosos = 0;
        $errores = 0;
        $actualizados = 0;

        foreach ($dispositivos as $dispositivo) {
            try {
                $this->line("Procesando: {$dispositivo->nombre} ({$dispositivo->device_id})");
                
                $organizacion = $dispositivo->sitio->organizacion;
                
                // Verificar credenciales
                if (!$organizacion->tieneShellyApiKey() || !$organizacion->shelly_server) {
                    $this->warn("  ⚠️  Organización sin credenciales de Shelly configuradas");
                    $errores++;
                    continue;
                }

                // Obtener datos del dispositivo desde Shelly Cloud
                $lectura = $this->obtenerLecturaDeShelly($dispositivo, $organizacion, $timeout);

                if (!$lectura) {
                    $this->warn("  ❌ No se pudo obtener la lectura");
                    $errores++;
                    continue;
                }

                // Guardar lectura en la base de datos
                $lecturaGuardada = Lectura::create($lectura);
                
                // Actualizar número de fases del dispositivo
                $numFasesAnterior = $dispositivo->num_fases;
                $actualizado = $dispositivo->actualizarNumFasesAuto();
                
                if ($actualizado || $dispositivo->fresh()->num_fases !== $numFasesAnterior) {
                    $actualizados++;
                    $this->info("  ✅ Lectura guardada - Fases: {$numFasesAnterior} → {$dispositivo->fresh()->num_fases}");
                } else {
                    $this->info("  ✅ Lectura guardada");
                }
                
                $exitosos++;

                // Esperar 1 segundo entre requests para no sobrecargar
                if ($dispositivos->count() > 1) {
                    sleep(1);
                }

            } catch (\Exception $e) {
                $this->error("  ❌ Error: {$e->getMessage()}");
                Log::error("Error obteniendo lectura de Shelly para dispositivo {$dispositivo->id}", [
                    'dispositivo_id' => $dispositivo->id,
                    'device_id' => $dispositivo->device_id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $errores++;
            }
        }

        $this->newLine();
        $this->info('Resumen:');
        $this->table(
            ['Estado', 'Cantidad'],
            [
                ['✅ Exitosos', $exitosos],
                ['❌ Errores', $errores],
                ['🔄 Fases actualizadas', $actualizados],
            ]
        );

        return Command::SUCCESS;
    }

    /**
     * Obtiene la lectura de un dispositivo desde la API de Shelly Cloud
     */
    private function obtenerLecturaDeShelly(Dispositivo $dispositivo, Organizacion $organizacion, int $timeout)
    {
        $shellyServer = rtrim($organizacion->shelly_server, '/');
        $shellyServer = preg_replace('/\/device\/status.*$/', '', $shellyServer);
        $url = "{$shellyServer}/device/status";
        
        $apiKey = $organizacion->shelly_api_key;

        try {
            $response = Http::timeout($timeout)
                ->get($url, [
                    'id' => $dispositivo->device_id,
                    'auth_key' => $apiKey,
                ]);

            if (!$response->successful()) {
                Log::warning("Error en respuesta de Shelly API para dispositivo {$dispositivo->id}", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }

            $data = $response->json();

            if (!isset($data['isok']) || !$data['isok'] || !isset($data['data'])) {
                Log::warning("Respuesta inválida de Shelly API para dispositivo {$dispositivo->id}", [
                    'response' => $data
                ]);
                return null;
            }

            // Procesar la respuesta y extraer los datos
            return $this->procesarRespuestaShelly($dispositivo->id, $data);

        } catch (\Exception $e) {
            Log::error("Excepción al obtener lectura de Shelly para dispositivo {$dispositivo->id}", [
                'error' => $e->getMessage(),
                'url' => $url
            ]);
            return null;
        }
    }

    /**
     * Procesa la respuesta de Shelly Cloud API y extrae los datos de la lectura
     * Basado en la lógica del workflow de n8n
     */
    private function procesarRespuestaShelly(int $dispositivoId, array $responseData): ?array
    {
        $deviceStatus = $responseData['data']['device_status'] ?? [];
        
        // Inicializar variables
        $canal1 = null;
        $canal2 = null;
        $canal3 = null;
        $energiaCanal1 = 0;
        $energiaCanal2 = 0;
        $energiaCanal3 = 0;
        $energiaRetornadaCanal1 = 0;
        $energiaRetornadaCanal2 = 0;
        $energiaRetornadaCanal3 = 0;
        $potenciaCanal1 = 0;
        $potenciaCanal2 = 0;
        $potenciaCanal3 = 0;
        $potenciaTotal = 0;
        $voltajeCanal1 = 0;
        $voltajeCanal2 = 0;
        $voltajeCanal3 = 0;
        $corrienteCanal1 = 0;
        $corrienteCanal2 = 0;
        $corrienteCanal3 = 0;
        $pfCanal1 = 0;
        $pfCanal2 = 0;
        $pfCanal3 = 0;
        $numFases = null;

        // Detectar formato y extraer datos
        if (isset($deviceStatus['em:0']) && isset($deviceStatus['em:0']['a_act_power'])) {
            // Formato EM3 trifásico (em:0 con prefijos a_, b_, c_)
            $em0 = $deviceStatus['em:0'] ?? [];
            $emdata0 = $deviceStatus['emdata:0'] ?? [];

            $potenciaCanal1 = $em0['a_act_power'] ?? 0;
            $potenciaCanal2 = $em0['b_act_power'] ?? 0;
            $potenciaCanal3 = $em0['c_act_power'] ?? 0;
            $potenciaTotal = $em0['total_act_power'] ?? ($potenciaCanal1 + $potenciaCanal2 + $potenciaCanal3);

            $energiaCanal1 = $emdata0['a_total_act_energy'] ?? 0;
            $energiaCanal2 = $emdata0['b_total_act_energy'] ?? 0;
            $energiaCanal3 = $emdata0['c_total_act_energy'] ?? 0;

            $energiaRetornadaCanal1 = $emdata0['a_total_act_ret_energy'] ?? 0;
            $energiaRetornadaCanal2 = $emdata0['b_total_act_ret_energy'] ?? 0;
            $energiaRetornadaCanal3 = $emdata0['c_total_act_ret_energy'] ?? 0;

            $voltajeCanal1 = $em0['a_voltage'] ?? 0;
            $voltajeCanal2 = $em0['b_voltage'] ?? 0;
            $voltajeCanal3 = $em0['c_voltage'] ?? 0;

            $corrienteCanal1 = $em0['a_current'] ?? 0;
            $corrienteCanal2 = $em0['b_current'] ?? 0;
            $corrienteCanal3 = $em0['c_current'] ?? 0;

            $pfCanal1 = $em0['a_pf'] ?? 0;
            $pfCanal2 = $em0['b_pf'] ?? 0;
            $pfCanal3 = $em0['c_pf'] ?? 0;

            $numFases = 3;

        } elseif (isset($deviceStatus['em1:0']) || isset($deviceStatus['em1:1'])) {
            // Formato EM1/EM1+ (2 canales)
            $canal1 = $deviceStatus['em1:0'] ?? [];
            $canal2 = $deviceStatus['em1:1'] ?? [];

            $em1data0 = $deviceStatus['em1data:0'] ?? [];
            $em1data1 = $deviceStatus['em1data:1'] ?? [];

            $energiaCanal1 = $em1data0['total_act_energy'] ?? 0;
            $energiaCanal2 = $em1data1['total_act_energy'] ?? 0;

            $energiaRetornadaCanal1 = $em1data0['total_act_ret_energy'] ?? 0;
            $energiaRetornadaCanal2 = $em1data1['total_act_ret_energy'] ?? 0;

            $potenciaCanal1 = $canal1['act_power'] ?? 0;
            $potenciaCanal2 = $canal2['act_power'] ?? 0;
            $potenciaTotal = $deviceStatus['total_power'] ?? ($potenciaCanal1 + $potenciaCanal2);

            $voltajeCanal1 = $canal1['voltage'] ?? 0;
            $voltajeCanal2 = $canal2['voltage'] ?? 0;

            $corrienteCanal1 = $canal1['current'] ?? 0;
            $corrienteCanal2 = $canal2['current'] ?? 0;

            $pfCanal1 = $canal1['pf'] ?? 0;
            $pfCanal2 = $canal2['pf'] ?? 0;

            $numFases = 2;

        } elseif (isset($deviceStatus['emeters']) && is_array($deviceStatus['emeters'])) {
            // Formato EM3 antiguo (emeters array)
            $canal1 = $deviceStatus['emeters'][0] ?? [];
            $canal2 = $deviceStatus['emeters'][1] ?? [];
            $canal3 = $deviceStatus['emeters'][2] ?? [];

            $energiaCanal1 = ($canal1['total'] ?? 0) / 1000;
            $energiaCanal2 = ($canal2['total'] ?? 0) / 1000;
            $energiaCanal3 = ($canal3['total'] ?? 0) / 1000;

            $energiaRetornadaCanal1 = ($canal1['total_returned'] ?? 0) / 1000;
            $energiaRetornadaCanal2 = ($canal2['total_returned'] ?? 0) / 1000;
            $energiaRetornadaCanal3 = ($canal3['total_returned'] ?? 0) / 1000;

            $potenciaCanal1 = $canal1['power'] ?? 0;
            $potenciaCanal2 = $canal2['power'] ?? 0;
            $potenciaCanal3 = $canal3['power'] ?? 0;
            $potenciaTotal = $deviceStatus['total_power'] ?? ($potenciaCanal1 + $potenciaCanal2 + $potenciaCanal3);

            $voltajeCanal1 = $canal1['voltage'] ?? 0;
            $voltajeCanal2 = $canal2['voltage'] ?? 0;
            $voltajeCanal3 = $canal3['voltage'] ?? 0;

            $corrienteCanal1 = $canal1['current'] ?? 0;
            $corrienteCanal2 = $canal2['current'] ?? 0;
            $corrienteCanal3 = $canal3['current'] ?? 0;

            $pfCanal1 = $canal1['pf'] ?? 0;
            $pfCanal2 = $canal2['pf'] ?? 0;
            $pfCanal3 = $canal3['pf'] ?? 0;

            // Contar canales activos
            $numFases = count(array_filter($deviceStatus['emeters'], function($e) {
                return ($e['power'] ?? 0) > 0;
            }));
            if ($numFases === 0) {
                $numFases = null;
            }
        }

        // Energías totales
        $emdata0 = $deviceStatus['emdata:0'] ?? [];
        $energiaTotal = $emdata0['total_act'] ?? ($energiaCanal1 + $energiaCanal2 + $energiaCanal3);
        $energiaRetornadaTotal = $emdata0['total_act_ret'] ?? ($energiaRetornadaCanal1 + $energiaRetornadaCanal2 + $energiaRetornadaCanal3);

        // Voltaje promedio
        $voltajesValidos = array_filter([$voltajeCanal1, $voltajeCanal2, $voltajeCanal3], fn($v) => $v > 0);
        $voltajePromedio = !empty($voltajesValidos) ? round(array_sum($voltajesValidos) / count($voltajesValidos), 2) : 0;

        // Estado del dispositivo
        $online = $responseData['data']['online'] ?? false;

        // WiFi
        $wifiConectado = false;
        $wifiRssi = null;
        if (isset($deviceStatus['wifi_sta'])) {
            $wifiConectado = $deviceStatus['wifi_sta']['connected'] ?? false;
            $wifiRssi = isset($deviceStatus['wifi_sta']['rssi']) ? (int) $deviceStatus['wifi_sta']['rssi'] : null;
        } elseif (isset($deviceStatus['wifi'])) {
            $wifiConectado = ($deviceStatus['wifi']['status'] ?? null) === 'got ip' || ($deviceStatus['wifi']['connected'] ?? false);
            $wifiRssi = isset($deviceStatus['wifi']['rssi']) ? (int) $deviceStatus['wifi']['rssi'] : null;
        }

        // Cloud
        $cloudConectado = $deviceStatus['cloud']['connected'] ?? false;

        // Uptime
        $uptimeSegundos = null;
        if (isset($deviceStatus['sys']['uptime'])) {
            $uptimeSegundos = (int) $deviceStatus['sys']['uptime'];
        } elseif (isset($deviceStatus['uptime'])) {
            $uptimeSegundos = (int) $deviceStatus['uptime'];
        }

        // Validez de canales
        $canal1Valido = ($canal1 && ($potenciaCanal1 > 0 || $voltajeCanal1 > 0 || $corrienteCanal1 > 0)) ? 1 : 0;
        $canal2Valido = ($canal2 && ($potenciaCanal2 > 0 || $voltajeCanal2 > 0 || $corrienteCanal2 > 0)) ? 1 : 0;
        $canal3Valido = ($canal3 && ($potenciaCanal3 > 0 || $voltajeCanal3 > 0 || $corrienteCanal3 > 0)) ? 1 : 0;

        // Fecha de lectura
        $fechaLectura = now();
        if (isset($deviceStatus['ts'])) {
            $fechaLectura = \Carbon\Carbon::createFromTimestamp($deviceStatus['ts']);
        } elseif (isset($deviceStatus['sys']['unixtime'])) {
            $fechaLectura = \Carbon\Carbon::createFromTimestamp($deviceStatus['sys']['unixtime']);
        }

        // Preparar datos para insertar
        return [
            'dispositivo_id' => $dispositivoId,
            'fecha_lectura' => $fechaLectura,
            'potencia_total_w' => round($potenciaTotal, 2),
            'potencia_canal_1_w' => round($potenciaCanal1, 2),
            'potencia_canal_2_w' => round($potenciaCanal2, 2),
            'potencia_canal_3_w' => round($potenciaCanal3, 2),
            'energia_total_kwh' => round($energiaTotal, 3),
            'energia_retornada_kwh' => round($energiaRetornadaTotal, 3),
            'energia_canal_1_kwh' => round($energiaCanal1, 3),
            'energia_canal_2_kwh' => round($energiaCanal2, 3),
            'energia_canal_3_kwh' => round($energiaCanal3, 3),
            'voltaje_canal_1' => round($voltajeCanal1, 2),
            'voltaje_canal_2' => round($voltajeCanal2, 2),
            'voltaje_canal_3' => round($voltajeCanal3, 2),
            'voltaje_promedio' => round($voltajePromedio, 2),
            'corriente_canal_1' => round($corrienteCanal1, 3),
            'corriente_canal_2' => round($corrienteCanal2, 3),
            'corriente_canal_3' => round($corrienteCanal3, 3),
            'corriente_neutro' => round($deviceStatus['emeter_n']['current'] ?? 0, 3),
            'pf_canal_1' => round($pfCanal1, 3),
            'pf_canal_2' => round($pfCanal2, 3),
            'pf_canal_3' => round($pfCanal3, 3),
            'online' => $online ? 1 : 0,
            'wifi_conectado' => $wifiConectado ? 1 : 0,
            'wifi_rssi' => $wifiRssi,
            'cloud_conectado' => $cloudConectado ? 1 : 0,
            'uptime_segundos' => $uptimeSegundos,
            'canal_1_valido' => $canal1Valido,
            'canal_2_valido' => $canal2Valido,
            'canal_3_valido' => $canal3Valido,
            'datos_raw' => $responseData['data'],
        ];
    }
}
