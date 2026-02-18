<?php

namespace App\Http\Controllers;

use App\Models\Dispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InformesController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        // Verificar contexto (copiado de DashboardController)
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        $sitioActualId = $request->session()->get('sitio_actual_id');

        if (!$organizacionActualId || !$sitioActualId) {
            return redirect()->route('seleccionar-contexto');
        }

        $organizacionActual = Organizacion::find($organizacionActualId);
        $sitioActual = Sitio::find($sitioActualId);

        if (!$organizacionActual || !$organizacionActual->tieneUsuario($user)) {
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);
            return redirect()->route('seleccionar-contexto');
        }

        if (!$sitioActual || $sitioActual->organizacion_id !== $organizacionActual->id) {
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);
            return redirect()->route('seleccionar-contexto');
        }

        // Obtener dispositivos del sitio para el selector
        $dispositivos = Dispositivo::where('sitio_id', $sitioActualId)
            ->activos()
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
            ]);

        $dispositivoId = $request->get('dispositivo_id');

        $dispositivo = null;
        if ($dispositivoId) {
            $dispositivo = Dispositivo::where('sitio_id', $sitioActualId)->find($dispositivoId);
        }

        if (!$dispositivo && $dispositivos->isNotEmpty()) {
            // Obtener el primer dispositivo real de la base de datos usando el ID del primer elemento del selector
            $firstDeviceId = $dispositivos->first()['id'];
            $dispositivo = Dispositivo::where('sitio_id', $sitioActualId)->find($firstDeviceId);
        }

        // Si no hay dispositivos, retornar vista vacía
        if (!$dispositivo) {
            return Inertia::render('Informes/Index', [
                'dispositivos' => [],
                'datos' => [],
                'filtros' => [
                    'periodo' => 'semana_actual',
                    'intervalo' => '1h'
                ]
            ]);
        }

        // Determinar fechas según periodo
        $periodo = $request->get('periodo', 'semana_actual');
        $intervalo = $request->get('intervalo', '1h'); // 15m, 1h, 1d

        $fechaDesde = null;
        $fechaHasta = null;

        switch ($periodo) {
            case 'semana_actual':
                $fechaDesde = now()->startOfWeek();
                $fechaHasta = now()->endOfWeek();
                break;
            case 'semana_pasada':
                $fechaDesde = now()->subWeek()->startOfWeek();
                $fechaHasta = now()->subWeek()->endOfWeek();
                break;
            case 'mes_actual':
                $fechaDesde = now()->startOfMonth();
                $fechaHasta = now()->endOfMonth();
                break;
            case 'mes_anterior':
                $fechaDesde = now()->subMonth()->startOfMonth();
                $fechaHasta = now()->subMonth()->endOfMonth();
                break;
            case 'personalizado':
                $fechaDesde = $request->get('fecha_desde') ? Carbon::parse($request->get('fecha_desde')) : now()->startOfDay();
                $fechaHasta = $request->get('fecha_hasta') ? Carbon::parse($request->get('fecha_hasta')) : now()->endOfDay();
                break;
            default:
                $fechaDesde = now()->startOfWeek();
                $fechaHasta = now()->endOfWeek();
                break;
        }

        // Obtener lecturas en el rango
        // Seleccionamos solo las columnas necesarias para optimizar
        $lecturas = $dispositivo->lecturas()
            ->with('dispositivo')
            ->whereBetween('fecha_lectura', [$fechaDesde, $fechaHasta])
            ->orderBy('fecha_lectura', 'asc')
            ->get([
                'id', // ID is often needed for relations
                'fecha_lectura',
                'potencia_total_w',
                'potencia_canal_1_w',
                'potencia_canal_2_w',
                'potencia_canal_3_w',
                'dispositivo_id'
            ]);

        // Calcular Energía usando la fórmula integral
        // Energía (kWh) = Potencia (W) * (T_actual - T_anterior) / 3,600,000

        $datosAgrupados = [];

        if ($lecturas->count() > 1) {
            $lecturasArray = $lecturas->all();

            for ($i = 1; $i < count($lecturasArray); $i++) {
                $lecturaActual = $lecturasArray[$i];
                $lecturaAnterior = $lecturasArray[$i - 1];

                $tiempoActual = $lecturaActual->fecha_lectura->timestamp;
                $tiempoAnterior = $lecturaAnterior->fecha_lectura->timestamp;
                $diffSegundos = $tiempoActual - $tiempoAnterior;

                // Evitar saltos temporales muy grandes que distorsionen (ej: pérdida de conexión de horas)
                // Si la diferencia es mayor a 1 hora (3600s) y el intervalo de lectura habitual suele ser minutos,
                // podríamos optar por ignorar o interpolar. 
                // Por ahora aplicamos la fórmula tal cual, asumiendo potencia constante o promedio entre puntos.
                // Para mayor precisión en cortes, se podría limitar diffSegundos.

                // Obtenemos las potencias (usando los metodos del modelo Lectura para identificar FV/Red/Consumo)
                // Usamos la lectura ACTUAL como referencia de potencia para este intervalo (Diferencia finita hacia atrás)
                // Opcional: Usar promedio ($pActual + $pAnterior) / 2 (Regla del trapecio).
                // La solicitud del usuario dice: "Potencia (W): El valor de potencia de la lectura actual."
                // Así que usaremos la lectura actual únicamente.

                $potenciaConsumo = $lecturaActual->calcularConsumoCasa() ?? 0;
                $potenciaGeneracion = $lecturaActual->obtenerGeneracionFotovoltaica();
                $potenciaImportacion = $lecturaActual->obtenerImportacionRed();
                $potenciaExportacion = $lecturaActual->obtenerExportacionRed();

                // Cálculo de energía (kWh) para este delta de tiempo
                $factor = $diffSegundos / 3600000;

                $energiaConsumo = $potenciaConsumo * $factor;
                $energiaGeneracion = $potenciaGeneracion * $factor;
                $energiaImportacion = $potenciaImportacion * $factor;
                $energiaExportacion = $potenciaExportacion * $factor;

                // Agrupación
                $fechaAgrupacion = $this->obtenerFechaAgrupacion($lecturaActual->fecha_lectura, $intervalo);
                $key = $fechaAgrupacion->format('Y-m-d H:i:s');

                if (!isset($datosAgrupados[$key])) {
                    $datosAgrupados[$key] = [
                        'fecha' => $fechaAgrupacion->toISOString(),
                        'consumo_kwh' => 0,
                        'generacion_kwh' => 0,
                        'importacion_kwh' => 0,
                        'exportacion_kwh' => 0,
                        // Guardamos contadores para calcular promedios de potencia si se quisiera, 
                        // pero el usuario pidió Energía acumulada.
                    ];
                }

                $datosAgrupados[$key]['consumo_kwh'] += $energiaConsumo;
                $datosAgrupados[$key]['generacion_kwh'] += $energiaGeneracion;
                $datosAgrupados[$key]['importacion_kwh'] += $energiaImportacion;
                $datosAgrupados[$key]['exportacion_kwh'] += $energiaExportacion;
            }
        }

        // Formatear valores finales (redondeo)
        foreach ($datosAgrupados as $key => &$dato) {
            $dato['consumo_kwh'] = round($dato['consumo_kwh'], 3);
            $dato['generacion_kwh'] = round($dato['generacion_kwh'], 3);
            $dato['importacion_kwh'] = round($dato['importacion_kwh'], 3);
            $dato['exportacion_kwh'] = round($dato['exportacion_kwh'], 3);
        }

        return Inertia::render('Informes/Index', [
            'dispositivo' => $dispositivo,
            'dispositivos' => $dispositivos,
            'datos' => array_values($datosAgrupados),
            'filtros' => [
                'periodo' => $periodo,
                'intervalo' => $intervalo,
                'fecha_desde' => $fechaDesde->format('Y-m-d'),
                'fecha_hasta' => $fechaHasta->format('Y-m-d'),
                'dispositivo_id' => $dispositivo->id
            ]
        ]);
    }

    private function obtenerFechaAgrupacion(Carbon $fecha, string $intervalo)
    {
        $fecha = $fecha->copy();
        switch ($intervalo) {
            case '15m':
                $minuto = $fecha->minute;
                $fecha->minute($minuto - ($minuto % 15))->second(0);
                break;
            case '1h':
                $fecha->minute(0)->second(0);
                break;
            case '1d':
                $fecha->startOfDay();
                break;
            case '1sem':
                $fecha->startOfWeek();
                break;
            case '1mes':
                $fecha->startOfMonth();
                break;
        }
        return $fecha;
    }
}
