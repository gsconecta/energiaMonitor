<?php

namespace App\Console\Commands;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\MetricaQuinceMinutos;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CompactarLecturasQuinceMinutos extends Command
{
    protected $signature = 'lecturas:compactar-15m
                            {--dispositivo= : ID del dispositivo especifico}
                            {--days=60 : Compactar lecturas anteriores a este numero de dias}
                            {--from= : Fecha inicio (Y-m-d H:i:s o Y-m-d)}
                            {--to= : Fecha fin (Y-m-d H:i:s o Y-m-d)}
                            {--purge : Eliminar lecturas originales tras compactar}
                            {--chunk=2000 : Tamano de lote para borrado}';

    protected $description = 'Compacta lecturas antiguas en metricas historicas de 15 minutos';

    public function handle(): int
    {
        [$desde, $hasta] = $this->resolverRango();

        if ($desde->greaterThanOrEqualTo($hasta)) {
            $this->error('El rango indicado no es valido.');
            return self::FAILURE;
        }

        $query = Dispositivo::query()->orderBy('id');

        if ($dispositivoId = $this->option('dispositivo')) {
            $query->where('id', $dispositivoId);
        }

        $dispositivos = $query->get();

        if ($dispositivos->isEmpty()) {
            $this->warn('No se encontraron dispositivos para compactar.');
            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Compactando lecturas entre %s y %s para %d dispositivo(s)...',
            $desde->toDateTimeString(),
            $hasta->toDateTimeString(),
            $dispositivos->count()
        ));

        $intervalosGuardados = 0;
        $lecturasPurgadas = 0;

        foreach ($dispositivos as $dispositivo) {
            $resultado = $this->compactarDispositivo($dispositivo, $desde, $hasta, (int) $this->option('chunk'));
            $intervalosGuardados += $resultado['intervalos_guardados'];
            $lecturasPurgadas += $resultado['lecturas_purgadas'];
        }

        $this->newLine();
        $this->table(
            ['Concepto', 'Valor'],
            [
                ['Dispositivos procesados', $dispositivos->count()],
                ['Intervalos guardados/actualizados', $intervalosGuardados],
                ['Lecturas originales purgadas', $lecturasPurgadas],
            ]
        );

        return self::SUCCESS;
    }

    private function resolverRango(): array
    {
        $timezone = config('app.timezone', 'Europe/Madrid');
        $hasta = $this->option('to')
            ? Carbon::parse($this->option('to'), $timezone)
            : now($timezone)->subDays((int) $this->option('days'))->startOfDay();

        $desde = $this->option('from')
            ? Carbon::parse($this->option('from'), $timezone)
            : Carbon::create(2000, 1, 1, 0, 0, 0, $timezone);

        if ($this->option('to') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $this->option('to'))) {
            $hasta = $hasta->endOfDay();
        }

        if ($this->option('from') && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $this->option('from'))) {
            $desde = $desde->startOfDay();
        }

        return [$desde, $hasta];
    }

    private function compactarDispositivo(Dispositivo $dispositivo, Carbon $desde, Carbon $hasta, int $chunk): array
    {
        $lecturas = Lectura::query()
            ->where('dispositivo_id', $dispositivo->id)
            ->whereBetween('fecha_lectura', [$desde, $hasta])
            ->orderBy('fecha_lectura')
            ->get();

        if ($lecturas->count() < 2) {
            $this->line("Dispositivo {$dispositivo->id}: sin lecturas suficientes para compactar.");
            return [
                'intervalos_guardados' => 0,
                'lecturas_purgadas' => 0,
            ];
        }

        $lecturas->each(fn (Lectura $lectura) => $lectura->setRelation('dispositivo', $dispositivo));

        $intervalos = $this->agruparLecturasPorIntervalo($lecturas);

        $guardados = 0;

        DB::transaction(function () use ($dispositivo, $intervalos, &$guardados) {
            $guardados = 0;

            foreach ($intervalos as $fila) {
                MetricaQuinceMinutos::updateOrCreate(
                    [
                        'dispositivo_id' => $dispositivo->id,
                        'intervalo_inicio' => $fila['intervalo_inicio'],
                    ],
                    $fila
                );

                $guardados++;
            }
        });

        $purgadas = 0;
        if ($this->option('purge')) {
            $ids = $lecturas->pluck('id');
            foreach ($ids->chunk(max(1, $chunk)) as $chunkIds) {
                $purgadas += Lectura::whereIn('id', $chunkIds)->delete();
            }
        }

        $this->line("Dispositivo {$dispositivo->id}: {$guardados} intervalo(s) compactados.");

        return [
            'intervalos_guardados' => $guardados,
            'lecturas_purgadas' => $purgadas,
        ];
    }

    private function agruparLecturasPorIntervalo(Collection $lecturas): array
    {
        $bucketed = [];
        $previa = null;

        foreach ($lecturas as $lectura) {
            $inicio = $this->redondearAQuinceMinutos($lectura->fecha_lectura);
            $clave = $inicio->format('Y-m-d H:i:s');

            if (!isset($bucketed[$clave])) {
                $bucketed[$clave] = [
                    'intervalo_inicio' => $inicio->copy(),
                    'intervalo_fin' => $inicio->copy()->addMinutes(15),
                    'primera_lectura_at' => $lectura->fecha_lectura->copy(),
                    'ultima_lectura_at' => $lectura->fecha_lectura->copy(),
                    'energia_consumida_kwh' => 0.0,
                    'energia_generada_kwh' => 0.0,
                    'energia_importada_kwh' => 0.0,
                    'energia_exportada_kwh' => 0.0,
                    'potencias' => [],
                    'voltajes' => [],
                    'corrientes_1' => [],
                    'corrientes_2' => [],
                    'corrientes_3' => [],
                    'pf' => [],
                    'reactiva' => [],
                    'online' => 0,
                    'offline' => 0,
                    'numero_lecturas' => 0,
                    'potencia_max_w' => null,
                    'hora_potencia_max' => null,
                    'potencia_min_w' => null,
                    'hora_potencia_min' => null,
                ];
            }

            $bucket = &$bucketed[$clave];
            $bucket['ultima_lectura_at'] = $lectura->fecha_lectura->copy();
            $bucket['numero_lecturas']++;

            if ($lectura->potencia_total_w !== null) {
                $bucket['potencias'][] = (float) $lectura->potencia_total_w;

                if ($bucket['potencia_max_w'] === null || $lectura->potencia_total_w > $bucket['potencia_max_w']) {
                    $bucket['potencia_max_w'] = (float) $lectura->potencia_total_w;
                    $bucket['hora_potencia_max'] = $lectura->fecha_lectura->copy();
                }

                if ($bucket['potencia_min_w'] === null || $lectura->potencia_total_w < $bucket['potencia_min_w']) {
                    $bucket['potencia_min_w'] = (float) $lectura->potencia_total_w;
                    $bucket['hora_potencia_min'] = $lectura->fecha_lectura->copy();
                }
            }

            if ($lectura->voltaje_promedio !== null) {
                $bucket['voltajes'][] = (float) $lectura->voltaje_promedio;
            }

            if ($lectura->corriente_canal_1 !== null) {
                $bucket['corrientes_1'][] = (float) $lectura->corriente_canal_1;
            }

            if ($lectura->corriente_canal_2 !== null) {
                $bucket['corrientes_2'][] = (float) $lectura->corriente_canal_2;
            }

            if ($lectura->corriente_canal_3 !== null) {
                $bucket['corrientes_3'][] = (float) $lectura->corriente_canal_3;
            }

            foreach ([$lectura->pf_canal_1, $lectura->pf_canal_2, $lectura->pf_canal_3] as $pf) {
                if ($pf !== null) {
                    $bucket['pf'][] = (float) $pf;
                }
            }

            if ($lectura->reactiva_total_var !== null) {
                $bucket['reactiva'][] = (float) $lectura->reactiva_total_var;
            }

            if ($previa) {
                $segundos = $previa->fecha_lectura->diffInSeconds($lectura->fecha_lectura);
                if ($segundos > 0 && $segundos <= 3600) {
                    $factor = $segundos / 3600000;
                    $bucket['energia_consumida_kwh'] += ($lectura->calcularConsumoCasa() ?? 0) * $factor;
                    $bucket['energia_generada_kwh'] += ($lectura->obtenerGeneracionFotovoltaica() ?? 0) * $factor;
                    $bucket['energia_importada_kwh'] += ($lectura->obtenerImportacionRed() ?? 0) * $factor;
                    $bucket['energia_exportada_kwh'] += ($lectura->obtenerExportacionRed() ?? 0) * $factor;

                    if ($lectura->online) {
                        $bucket['online'] += min(15, (int) round($segundos / 60));
                    } else {
                        $bucket['offline'] += min(15, (int) round($segundos / 60));
                    }
                }
            }

            $previa = $lectura;
            unset($bucket);
        }

        return array_map(function (array $bucket) {
            return [
                'intervalo_inicio' => $bucket['intervalo_inicio'],
                'intervalo_fin' => $bucket['intervalo_fin'],
                'primera_lectura_at' => $bucket['primera_lectura_at'],
                'ultima_lectura_at' => $bucket['ultima_lectura_at'],
                'energia_consumida_kwh' => round($bucket['energia_consumida_kwh'], 4),
                'energia_generada_kwh' => round($bucket['energia_generada_kwh'], 4),
                'energia_importada_kwh' => round($bucket['energia_importada_kwh'], 4),
                'energia_exportada_kwh' => round($bucket['energia_exportada_kwh'], 4),
                'potencia_promedio_w' => $this->promedio($bucket['potencias']),
                'potencia_max_w' => $bucket['potencia_max_w'] !== null ? round($bucket['potencia_max_w'], 2) : null,
                'hora_potencia_max' => $bucket['hora_potencia_max'],
                'potencia_min_w' => $bucket['potencia_min_w'] !== null ? round($bucket['potencia_min_w'], 2) : null,
                'hora_potencia_min' => $bucket['hora_potencia_min'],
                'voltaje_promedio' => $this->promedio($bucket['voltajes']),
                'corriente_promedio_1' => $this->promedio($bucket['corrientes_1'], 3),
                'corriente_promedio_2' => $this->promedio($bucket['corrientes_2'], 3),
                'corriente_promedio_3' => $this->promedio($bucket['corrientes_3'], 3),
                'pf_promedio' => $this->promedio($bucket['pf'], 4),
                'reactiva_promedio_var' => $this->promedio($bucket['reactiva']),
                'numero_lecturas' => $bucket['numero_lecturas'],
                'minutos_online' => min(15, $bucket['online']),
                'minutos_offline' => min(15, $bucket['offline']),
                'resumen' => [
                    'cobertura_minutos' => min(15, $bucket['online'] + $bucket['offline']),
                    'tiene_potencia_max' => $bucket['potencia_max_w'] !== null,
                    'tiene_potencia_min' => $bucket['potencia_min_w'] !== null,
                ],
            ];
        }, array_values($bucketed));
    }

    private function redondearAQuinceMinutos(Carbon $fecha): Carbon
    {
        $inicio = $fecha->copy()->second(0);
        $minuto = (int) floor($inicio->minute / 15) * 15;

        return $inicio->minute($minuto);
    }

    private function promedio(array $valores, int $precision = 2): ?float
    {
        if (empty($valores)) {
            return null;
        }

        return round(array_sum($valores) / count($valores), $precision);
    }
}
