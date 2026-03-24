<?php

namespace App\Services;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class InformeEnergeticoService
{
    public function buildReport(Request $request): array|RedirectResponse
    {
        $contexto = $this->resolveContext($request);

        if ($contexto instanceof RedirectResponse) {
            return $contexto;
        }

        [$organizacionActual, $sitioActual] = $contexto;

        $periodo = $request->string('periodo', 'semana_actual')->toString();
        $intervalo = $request->string('intervalo', '1h')->toString();
        [$fechaDesde, $fechaHasta] = $this->resolveDateRange($request, $periodo);

        $dispositivos = Dispositivo::where('sitio_id', $sitioActual->id)
            ->activos()
            ->get()
            ->map(fn (Dispositivo $dispositivo) => [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
            ])
            ->values();

        $dispositivo = $this->resolveDevice($request, $sitioActual->id, $dispositivos);

        if (! $dispositivo) {
            return $this->buildPayload(
                $organizacionActual,
                null,
                $dispositivos,
                [],
                [
                    'potencia_maxima_kw' => 0.0,
                    'potencia_promedio_kw' => 0.0,
                ],
                $periodo,
                $intervalo,
                $fechaDesde,
                $fechaHasta,
                null
            );
        }

        $informe = $this->buildGroupedData($dispositivo, $fechaDesde, $fechaHasta, $intervalo);

        return $this->buildPayload(
            $organizacionActual,
            $dispositivo,
            $dispositivos,
            $informe['datos'],
            $informe['metricas'],
            $periodo,
            $intervalo,
            $fechaDesde,
            $fechaHasta,
            $dispositivo->id
        );
    }

    private function resolveContext(Request $request): array|RedirectResponse
    {
        $user = auth()->user();
        $organizacionActualId = $request->session()->get('organizacion_actual_id');
        $sitioActualId = $request->session()->get('sitio_actual_id');

        if (! $organizacionActualId || ! $sitioActualId) {
            return redirect()->route('seleccionar-contexto');
        }

        $organizacionActual = Organizacion::find($organizacionActualId);
        $sitioActual = Sitio::find($sitioActualId);

        if (! $organizacionActual || ! $organizacionActual->tieneUsuario($user)) {
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);

            return redirect()->route('seleccionar-contexto');
        }

        if (! $sitioActual || $sitioActual->organizacion_id !== $organizacionActual->id) {
            $request->session()->forget(['organizacion_actual_id', 'sitio_actual_id']);

            return redirect()->route('seleccionar-contexto');
        }

        return [$organizacionActual, $sitioActual];
    }

    private function resolveDevice(Request $request, int $sitioId, Collection $dispositivos): ?Dispositivo
    {
        $dispositivoId = $request->integer('dispositivo_id');

        if ($dispositivoId) {
            $dispositivo = Dispositivo::where('sitio_id', $sitioId)->find($dispositivoId);

            if ($dispositivo) {
                return $dispositivo;
            }
        }

        $firstDeviceId = $dispositivos->first()['id'] ?? null;

        if (! $firstDeviceId) {
            return null;
        }

        return Dispositivo::where('sitio_id', $sitioId)->find($firstDeviceId);
    }

    private function resolveDateRange(Request $request, string $periodo): array
    {
        $fechaDesde = match ($periodo) {
            'semana_pasada' => now()->subWeek()->startOfWeek(),
            'mes_actual' => now()->startOfMonth(),
            'mes_anterior' => now()->subMonth()->startOfMonth(),
            'personalizado' => $request->filled('fecha_desde')
                ? Carbon::parse($request->string('fecha_desde')->toString())->startOfDay()
                : now()->startOfDay(),
            default => now()->startOfWeek(),
        };

        $fechaHasta = match ($periodo) {
            'semana_pasada' => now()->subWeek()->endOfWeek(),
            'mes_actual' => now()->endOfMonth(),
            'mes_anterior' => now()->subMonth()->endOfMonth(),
            'personalizado' => $request->filled('fecha_hasta')
                ? Carbon::parse($request->string('fecha_hasta')->toString())->endOfDay()
                : now()->endOfDay(),
            default => now()->endOfWeek(),
        };

        if ($fechaHasta->lt($fechaDesde)) {
            [$fechaDesde, $fechaHasta] = [
                $fechaHasta->copy()->startOfDay(),
                $fechaDesde->copy()->endOfDay(),
            ];
        }

        return [$fechaDesde, $fechaHasta];
    }

    private function buildPayload(
        Organizacion $organizacionActual,
        ?Dispositivo $dispositivo,
        Collection $dispositivos,
        array $datos,
        array $metricas,
        string $periodo,
        string $intervalo,
        Carbon $fechaDesde,
        Carbon $fechaHasta,
        ?int $dispositivoId
    ): array {
        return [
            'dispositivo' => $dispositivo ? [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'tiene_fotovoltaica' => $dispositivo->tieneFotovoltaica(),
                'num_fases' => $dispositivo->num_fases,
                'color_canal_1' => $dispositivo->color_canal_1,
                'color_canal_2' => $dispositivo->color_canal_2,
                'color_canal_3' => $dispositivo->color_canal_3,
            ] : null,
            'dispositivos' => $dispositivos->all(),
            'datos' => $datos,
            'metricas' => $metricas,
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
                'dispositivo_id' => $dispositivoId,
            ],
        ];
    }

    private function buildGroupedData(
        Dispositivo $dispositivo,
        Carbon $fechaDesde,
        Carbon $fechaHasta,
        string $intervalo
    ): array {
        $lecturas = $dispositivo->lecturas()
            ->with('dispositivo')
            ->whereBetween('fecha_lectura', [$fechaDesde, $fechaHasta])
            ->orderBy('fecha_lectura', 'asc')
            ->get([
                'id',
                'fecha_lectura',
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
                'dispositivo_id',
            ]);

        if ($lecturas->isEmpty()) {
            return [
                'datos' => [],
                'metricas' => [
                    'potencia_maxima_kw' => 0.0,
                    'potencia_promedio_kw' => 0.0,
                ],
            ];
        }

        $datosAgrupados = [];
        $potenciasRegistradasW = [];

        foreach ($lecturas as $lectura) {
            $fechaAgrupacion = $this->resolveGroupingDate($lectura->fecha_lectura, $intervalo);
            $key = $fechaAgrupacion->format('Y-m-d H:i:s');

            if (! isset($datosAgrupados[$key])) {
                $datosAgrupados[$key] = $this->initializeGroupedBucket($fechaAgrupacion);
            }

            $potenciaRegistradaW = $this->resolveReportPowerW($dispositivo, $lectura);

            if ($potenciaRegistradaW !== null) {
                $potenciasRegistradasW[] = $potenciaRegistradaW;
                $potenciaKw = $potenciaRegistradaW / 1000;
                $datosAgrupados[$key]['suma_potencia_kw'] += $potenciaKw;
                $datosAgrupados[$key]['conteo_potencia'] += 1;
                $datosAgrupados[$key]['potencia_maxima_kw'] = $datosAgrupados[$key]['potencia_maxima_kw'] === null
                    ? $potenciaKw
                    : max($datosAgrupados[$key]['potencia_maxima_kw'], $potenciaKw);
            }

            $datosAgrupados[$key]['suma_q1'] += $lectura->reactiva_canal_1_var ?? 0;
            $datosAgrupados[$key]['suma_q2'] += $lectura->reactiva_canal_2_var ?? 0;
            $datosAgrupados[$key]['suma_q3'] += $lectura->reactiva_canal_3_var ?? 0;
            $datosAgrupados[$key]['suma_q_total'] += $lectura->reactiva_total_var ?? 0;
            $datosAgrupados[$key]['conteo_q'] += 1;

            $voltajeActual = $lectura->obtenerVoltajeRedElectrica();
            $v1 = $lectura->voltaje_canal_1;
            $v2 = $lectura->voltaje_canal_2;
            $v3 = $lectura->voltaje_canal_3;

            if ($voltajeActual > 0) {
                $datosAgrupados[$key]['suma_voltaje'] += $voltajeActual;
                $datosAgrupados[$key]['conteo_voltaje'] += 1;
            }
            if ($v1 !== null && $v1 > 0) {
                $datosAgrupados[$key]['suma_v1'] += $v1;
                $datosAgrupados[$key]['conteo_v1'] += 1;
            }
            if ($v2 !== null && $v2 > 0) {
                $datosAgrupados[$key]['suma_v2'] += $v2;
                $datosAgrupados[$key]['conteo_v2'] += 1;
            }
            if ($v3 !== null && $v3 > 0) {
                $datosAgrupados[$key]['suma_v3'] += $v3;
                $datosAgrupados[$key]['conteo_v3'] += 1;
            }
        }

        $potenciaMaxima = $potenciasRegistradasW === [] ? 0.0 : (float) max($potenciasRegistradasW);
        $potenciaPromedio = $potenciasRegistradasW === []
            ? 0.0
            : (float) (array_sum($potenciasRegistradasW) / count($potenciasRegistradasW));

        if ($lecturas->count() > 1) {
            $lecturasArray = $lecturas->all();

            for ($i = 1; $i < count($lecturasArray); $i++) {
                $lecturaActual = $lecturasArray[$i];
                $lecturaAnterior = $lecturasArray[$i - 1];

                $diffSegundos = $lecturaActual->fecha_lectura->timestamp - $lecturaAnterior->fecha_lectura->timestamp;
                $factor = $diffSegundos / 3600000;

                $potenciaConsumo = $lecturaActual->calcularConsumoCasa() ?? 0;
                $potenciaGeneracion = $lecturaActual->obtenerGeneracionFotovoltaica();
                $potenciaImportacion = $lecturaActual->obtenerImportacionRed();
                $potenciaExportacion = $lecturaActual->obtenerExportacionRed();
                $fechaAgrupacion = $this->resolveGroupingDate($lecturaActual->fecha_lectura, $intervalo);
                $key = $fechaAgrupacion->format('Y-m-d H:i:s');

                $datosAgrupados[$key]['consumo_kwh'] += $potenciaConsumo * $factor;
                $datosAgrupados[$key]['generacion_kwh'] += $potenciaGeneracion * $factor;
                $datosAgrupados[$key]['importacion_kwh'] += $potenciaImportacion * $factor;
                $datosAgrupados[$key]['exportacion_kwh'] += $potenciaExportacion * $factor;
            }
        }

        foreach ($datosAgrupados as &$dato) {
            $dato['consumo_kwh'] = round($dato['consumo_kwh'], 3);
            $dato['generacion_kwh'] = round($dato['generacion_kwh'], 3);
            $dato['importacion_kwh'] = round($dato['importacion_kwh'], 3);
            $dato['exportacion_kwh'] = round($dato['exportacion_kwh'], 3);
            $dato['potencia_promedio_kw'] = $dato['conteo_potencia'] > 0
                ? round($dato['suma_potencia_kw'] / $dato['conteo_potencia'], 3)
                : 0;
            $dato['potencia_maxima_kw'] = $dato['potencia_maxima_kw'] !== null
                ? round($dato['potencia_maxima_kw'], 3)
                : 0;

            if ($dato['conteo_q'] > 0) {
                $dato['q1_var'] = round($dato['suma_q1'] / $dato['conteo_q'], 2);
                $dato['q2_var'] = round($dato['suma_q2'] / $dato['conteo_q'], 2);
                $dato['q3_var'] = round($dato['suma_q3'] / $dato['conteo_q'], 2);
                $dato['q_total_var'] = round($dato['suma_q_total'] / $dato['conteo_q'], 2);
            }

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

            unset(
                $dato['suma_q1'],
                $dato['suma_q2'],
                $dato['suma_q3'],
                $dato['suma_q_total'],
                $dato['conteo_q'],
                $dato['suma_potencia_kw'],
                $dato['conteo_potencia'],
                $dato['suma_voltaje'],
                $dato['suma_v1'],
                $dato['suma_v2'],
                $dato['suma_v3'],
                $dato['conteo_voltaje'],
                $dato['conteo_v1'],
                $dato['conteo_v2'],
                $dato['conteo_v3']
            );
        }
        unset($dato);

        return [
            'datos' => array_values($datosAgrupados),
            'metricas' => [
                'potencia_maxima_kw' => round($potenciaMaxima / 1000, 2),
                'potencia_promedio_kw' => round($potenciaPromedio / 1000, 2),
            ],
        ];
    }

    private function initializeGroupedBucket(Carbon $fechaAgrupacion): array
    {
        return [
            'fecha' => $fechaAgrupacion->toISOString(),
            'consumo_kwh' => 0,
            'generacion_kwh' => 0,
            'importacion_kwh' => 0,
            'exportacion_kwh' => 0,
            'suma_potencia_kw' => 0,
            'conteo_potencia' => 0,
            'potencia_promedio_kw' => 0,
            'potencia_maxima_kw' => null,
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
        ];
    }

    private function resolveReportPowerW(Dispositivo $dispositivo, Lectura $lectura): ?float
    {
        $potenciasCanales = array_map(
            static fn (float|int $potencia) => (float) $potencia,
            array_values(array_filter([
                $lectura->potencia_canal_1_w,
                $lectura->potencia_canal_2_w,
                $lectura->potencia_canal_3_w,
            ], static fn ($potencia) => $potencia !== null))
        );

        if ($potenciasCanales === []) {
            return null;
        }

        if ($dispositivo->esTrifasico()) {
            return array_sum($potenciasCanales);
        }

        return max($potenciasCanales);
    }

    private function resolveGroupingDate(Carbon $fecha, string $intervalo): Carbon
    {
        $fechaAgrupacion = $fecha->copy();

        return match ($intervalo) {
            '15m' => $fechaAgrupacion->minute($fechaAgrupacion->minute - ($fechaAgrupacion->minute % 15))->second(0),
            '1d' => $fechaAgrupacion->startOfDay(),
            '1sem' => $fechaAgrupacion->startOfWeek(),
            '1mes' => $fechaAgrupacion->startOfMonth(),
            default => $fechaAgrupacion->minute(0)->second(0),
        };
    }
}
