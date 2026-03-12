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
                'organizacion_activa' => [
                    'id' => $organizacionActual->id,
                    'nombre' => $organizacionActual->nombre,
                    'tipo_perfil' => $organizacionActual->tipo_perfil,
                ],
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
                $fechaDesde = $request->get('fecha_desde') ? Carbon::parse($request->get('fecha_desde'))->startOfDay() : now()->startOfDay();
                $fechaHasta = $request->get('fecha_hasta') ? Carbon::parse($request->get('fecha_hasta'))->endOfDay() : now()->endOfDay();
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
                'voltaje_promedio',
                'voltaje_canal_1',
                'voltaje_canal_2',
                'voltaje_canal_3',
                'corriente_canal_1',
                'corriente_canal_2',
                'corriente_canal_3',
                'pf_canal_1',
                'pf_canal_2',
                'pf_canal_3',
                'reactiva_canal_1_var',
                'reactiva_canal_2_var',
                'reactiva_canal_3_var',
                'reactiva_total_var',
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
                $voltajeActual = $lecturaActual->obtenerVoltajeRedElectrica();
                $v1 = $lecturaActual->voltaje_canal_1;
                $v2 = $lecturaActual->voltaje_canal_2;
                $v3 = $lecturaActual->voltaje_canal_3;
                
                $q1_var = $lecturaActual->reactiva_canal_1_var ?? 0;
                $q2_var = $lecturaActual->reactiva_canal_2_var ?? 0;
                $q3_var = $lecturaActual->reactiva_canal_3_var ?? 0;
                $q_total_var = $lecturaActual->reactiva_total_var ?? 0;

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
                        'suma_q1' => 0,
                        'suma_q2' => 0,
                        'suma_q3' => 0,
                        'suma_q_total' => 0,
                        'conteo_q' => 0,
                        'q1_var' => 0,
                        'q2_var' => 0,
                        'q3_var' => 0,
                        'q_total_var' => 0,
                        'suma_voltaje' => 0,
                        'suma_v1' => 0,
                        'suma_v2' => 0,
                        'suma_v3' => 0,
                        'conteo_voltaje' => 0,
                        'conteo_v1' => 0,
                        'conteo_v2' => 0,
                        'conteo_v3' => 0,
                        'voltaje_red_electrica' => null,
                        'voltaje_canal_1' => null,
                        'voltaje_canal_2' => null,
                        'voltaje_canal_3' => null,
                        // Guardamos contadores para calcular promedios de potencia si se quisiera, 
                        // pero el usuario pidió Energía acumulada.
                    ];
                }

                $datosAgrupados[$key]['consumo_kwh'] += $energiaConsumo;
                $datosAgrupados[$key]['generacion_kwh'] += $energiaGeneracion;
                $datosAgrupados[$key]['importacion_kwh'] += $energiaImportacion;
                $datosAgrupados[$key]['exportacion_kwh'] += $energiaExportacion;
                
                $datosAgrupados[$key]['suma_q1'] += $q1_var;
                $datosAgrupados[$key]['suma_q2'] += $q2_var;
                $datosAgrupados[$key]['suma_q3'] += $q3_var;
                $datosAgrupados[$key]['suma_q_total'] += $q_total_var;
                $datosAgrupados[$key]['conteo_q'] += 1;

                if ($voltajeActual > 0) {
                    $datosAgrupados[$key]['suma_voltaje'] += $voltajeActual;
                    $datosAgrupados[$key]['conteo_voltaje'] += 1;
                }
                if ($v1 > 0) {
                    $datosAgrupados[$key]['suma_v1'] += $v1;
                    $datosAgrupados[$key]['conteo_v1'] += 1;
                }
                if ($v2 > 0) {
                    $datosAgrupados[$key]['suma_v2'] += $v2;
                    $datosAgrupados[$key]['conteo_v2'] += 1;
                }
                if ($v3 > 0) {
                    $datosAgrupados[$key]['suma_v3'] += $v3;
                    $datosAgrupados[$key]['conteo_v3'] += 1;
                }
            }
        }

        // Formatear valores finales (redondeo)
        foreach ($datosAgrupados as $key => &$dato) {
            $dato['consumo_kwh'] = round($dato['consumo_kwh'], 3);
            $dato['generacion_kwh'] = round($dato['generacion_kwh'], 3);
            $dato['importacion_kwh'] = round($dato['importacion_kwh'], 3);
            $dato['exportacion_kwh'] = round($dato['exportacion_kwh'], 3);

            if ($dato['conteo_q'] > 0) {
                $dato['q1_var'] = round($dato['suma_q1'] / $dato['conteo_q'], 2);
                $dato['q2_var'] = round($dato['suma_q2'] / $dato['conteo_q'], 2);
                $dato['q3_var'] = round($dato['suma_q3'] / $dato['conteo_q'], 2);
                $dato['q_total_var'] = round($dato['suma_q_total'] / $dato['conteo_q'], 2);
            }

            unset($dato['suma_q1'], $dato['suma_q2'], $dato['suma_q3'], $dato['suma_q_total'], $dato['conteo_q']);

            if ($dato['conteo_voltaje'] > 0) {
                $dato['voltaje_red_electrica'] = round($dato['suma_voltaje'] / $dato['conteo_voltaje'], 1);
            }
            if ($dato['conteo_v1'] > 0) {
                $dato['voltaje_canal_1'] = round($dato['suma_v1'] / $dato['conteo_v1'], 1);
            }
            if ($dato['conteo_v2'] > 0) {
                $dato['voltaje_canal_2'] = round($dato['suma_v2'] / $dato['conteo_v2'], 1);
            }
            if ($dato['conteo_v3'] > 0) {
                $dato['voltaje_canal_3'] = round($dato['suma_v3'] / $dato['conteo_v3'], 1);
            }

            unset($dato['suma_voltaje']);
            unset($dato['suma_v1'], $dato['suma_v2'], $dato['suma_v3']);
            unset($dato['conteo_voltaje']);
            unset($dato['conteo_v1'], $dato['conteo_v2'], $dato['conteo_v3']);
        }

        return Inertia::render('Informes/Index', [
            'dispositivo' => $dispositivo ? [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'tiene_fotovoltaica' => $dispositivo->tieneFotovoltaica(),
                'num_fases' => $dispositivo->num_fases,
                'color_canal_1' => $dispositivo->color_canal_1,
                'color_canal_2' => $dispositivo->color_canal_2,
                'color_canal_3' => $dispositivo->color_canal_3,
            ] : null,
            'dispositivos' => $dispositivos,
            'datos' => array_values($datosAgrupados),
            'organizacion_activa' => [
                'id' => $organizacionActual->id,
                'nombre' => $organizacionActual->nombre,
                'tipo_perfil' => $organizacionActual->tipo_perfil,
            ],
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
