<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Middleware\VerifyApiKey;
use App\Models\Dispositivo;
use App\Models\Organizacion;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware(['api', VerifyApiKey::class])->group(function () {
    /**
     * Endpoint para n8n: Dispositivos activos agrupados por organización
     * con API Key y servidor de Shelly
     * 
     * GET /api/dispositivos-activos-por-organizacion
     * 
     * Requiere API Key en header: X-API-Key o Authorization
     * También acepta: ?api_key=xxx en query string
     * 
     * Retorna un array de objetos, cada uno contiene:
     * - organizacion: { id, nombre, codigo, shelly_api_key, shelly_server }
     * - dispositivos: [ { id, device_id, nombre, tipo, modelo } ]
     */
    Route::get('/dispositivos-activos-por-organizacion', function (Request $request) {
        // Obtener dispositivos activos con información de organización
        $dispositivos = Dispositivo::query()
            ->select([
                'dispositivos.id',
                'dispositivos.device_id',
                'dispositivos.nombre',
                'dispositivos.tipo',
                'dispositivos.modelo',
                'sitios.organizacion_id',
            ])
            ->join('sitios', 'dispositivos.sitio_id', '=', 'sitios.id')
            ->join('organizaciones', 'sitios.organizacion_id', '=', 'organizaciones.id')
            ->where('dispositivos.activo', true)
            ->whereNull('dispositivos.deleted_at')
            ->whereNull('sitios.deleted_at')
            ->whereNull('organizaciones.deleted_at')
            ->with(['sitio.organizacion'])
            ->orderBy('sitios.organizacion_id')
            ->orderBy('dispositivos.id')
            ->get();

        // Obtener organizaciones únicas con sus credenciales
        // No usar select() para que los accessors del modelo funcionen correctamente
        $organizacionesIds = $dispositivos->pluck('organizacion_id')->unique();
        $organizaciones = Organizacion::whereIn('id', $organizacionesIds)
            ->get()
            ->keyBy('id');

        // Agrupar dispositivos por organización
        $resultado = $dispositivos->groupBy('organizacion_id')->map(function ($grupo, $orgId) use ($organizaciones) {
            $organizacion = $organizaciones->get($orgId);
            
            if (!$organizacion) {
                return null;
            }
            
            // Obtener la API key usando el accessor
            $shellyApiKey = $organizacion->shelly_api_key;
            
            // Log para depuración (solo en desarrollo)
            if (config('app.debug')) {
                $rawValue = $organizacion->getRawShellyApiKey();
                \Log::debug("Organización {$organizacion->id}: raw_value=" . ($rawValue ? substr($rawValue, 0, 20) . '...' : 'NULL') . ", decrypted=" . ($shellyApiKey ? 'OK' : 'NULL'));
            }
            
            return [
                'organizacion' => [
                    'id' => $organizacion->id,
                    'nombre' => $organizacion->nombre,
                    'codigo' => $organizacion->codigo,
                    'shelly_api_key' => $shellyApiKey, // Ya viene desencriptada automáticamente del modelo
                    'shelly_server' => $organizacion->shelly_server,
                ],
                'dispositivos' => $grupo->map(function ($dispositivo) {
                    return [
                        'id' => $dispositivo->id,
                        'device_id' => $dispositivo->device_id,
                        'nombre' => $dispositivo->nombre,
                        'tipo' => $dispositivo->tipo,
                        'modelo' => $dispositivo->modelo,
                    ];
                })->values()->toArray(),
            ];
        })->filter()->values();

        return response()->json($resultado);
    });

    /**
     * Query SQL directa para uso en n8n
     * Devuelve todos los campos necesarios para agrupar después
     */
    Route::get('/sql-dispositivos-activos', function () {
        $sql = "
            SELECT 
                d.id,
                d.device_id,
                d.nombre,
                d.tipo,
                d.modelo,
                o.id as organizacion_id,
                o.nombre as organizacion_nombre,
                o.codigo as organizacion_codigo,
                o.shelly_api_key,
                o.shelly_server
            FROM dispositivos d
            INNER JOIN sitios s ON d.sitio_id = s.id
            INNER JOIN organizaciones o ON s.organizacion_id = o.id
            WHERE d.activo = 1
                AND d.deleted_at IS NULL
                AND s.deleted_at IS NULL
                AND o.deleted_at IS NULL
            ORDER BY o.id, d.id
        ";

        return response()->json([
            'sql' => $sql,
            'nota' => 'Esta consulta devuelve todos los dispositivos activos con la información de su organización. Puedes agrupar por organizacion_id en n8n.'
        ]);
    });
});

