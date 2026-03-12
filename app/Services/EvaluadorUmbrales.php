<?php

namespace App\Services;

use App\Models\AlertaUmbral;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\UmbralFuncionamiento;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class EvaluadorUmbrales
{
    /**
     * Cooldown en minutos para evitar alertas repetidas
     */
    private const COOLDOWN_MINUTOS = 15;

    /**
     * Mapeo de métricas a campos de la lectura.
     * Las métricas con múltiples canales se evalúan por separado.
     */
    private const METRICA_CAMPOS = [
        'voltaje' => [
            'canal_1' => 'voltaje_canal_1',
            'canal_2' => 'voltaje_canal_2',
            'canal_3' => 'voltaje_canal_3',
        ],
        'corriente' => [
            'canal_1' => 'corriente_canal_1',
            'canal_2' => 'corriente_canal_2',
            'canal_3' => 'corriente_canal_3',
        ],
        'potencia_activa' => [
            'total' => 'potencia_total_w',
        ],
        'potencia_reactiva' => [
            'total' => 'reactiva_total_var',
        ],
        'factor_potencia' => [
            'canal_1' => 'pf_canal_1',
            'canal_2' => 'pf_canal_2',
            'canal_3' => 'pf_canal_3',
        ],
        'energia_consumo' => [
            'total' => 'energia_total_kwh',
        ],
        'generacion_fv' => [
            'total' => 'energia_retornada_kwh',
        ],
    ];

    /**
     * Métricas calculadas que no salen de una columna fija de lecturas.
     */
    private const METRICAS_CALCULADAS = [
        'potencia_fotovoltaica',
    ];

    /**
     * Evalúa todos los umbrales aplicables a una lectura/dispositivo.
     *
     * @return AlertaUmbral[] Alertas generadas
     */
    public function evaluar(Lectura $lectura, Dispositivo $dispositivo): array
    {
        $organizacion = $dispositivo->sitio->organizacion;

        if (!$organizacion) {
            return [];
        }

        // Obtener umbrales activos asignados a esta organización
        $umbrales = UmbralFuncionamiento::where('activo', true)
            ->whereHas('organizaciones', function ($q) use ($organizacion) {
                $q->where('organizaciones.id', $organizacion->id);
            })
            ->where(function ($q) use ($dispositivo) {
                $q->whereHas('dispositivos', function ($subQuery) use ($dispositivo) {
                    $subQuery->where('dispositivos.id', $dispositivo->id);
                })->orWhereDoesntHave('dispositivos');
            })
            ->get();

        if ($umbrales->isEmpty()) {
            return [];
        }

        $ahora = Carbon::now(config('app.timezone', 'Europe/Madrid'));
        $alertasGeneradas = [];

        foreach ($umbrales as $umbral) {
            // Verificar día de la semana
            if (!$this->esDiaActivo($umbral, $ahora)) {
                continue;
            }

            // Verificar horario
            if (!$this->esHorarioActivo($umbral, $ahora)) {
                continue;
            }

            // Obtener campos a evaluar para esta métrica
            $campos = self::METRICA_CAMPOS[$umbral->metrica] ?? null;
            if (!$campos) {
                if (in_array($umbral->metrica, self::METRICAS_CALCULADAS, true)) {
                    $campos = ['total' => null];
                } else {
                    continue;
                }
            }

            // Las alertas FV solo tienen sentido en dispositivos con canal fotovoltaico
            if ($umbral->metrica === 'potencia_fotovoltaica' && !$dispositivo->tieneFotovoltaica()) {
                continue;
            }

            // Evaluar cada canal/campo
            foreach ($campos as $canal => $campo) {
                $valor = $this->obtenerValorMetrica($umbral->metrica, $lectura, $campo);

                // Saltar valores nulos o cero (canal no conectado)
                if ($valor === null || ($valor == 0 && in_array($umbral->metrica, ['voltaje', 'corriente']))) {
                    continue;
                }

                $excede = false;

                // Verificar mínimo
                if ($umbral->valor_minimo !== null && $valor < (float) $umbral->valor_minimo) {
                    $excede = true;
                }

                // Verificar máximo
                if ($umbral->valor_maximo !== null && $valor > (float) $umbral->valor_maximo) {
                    $excede = true;
                }

                if (!$excede) {
                    continue;
                }

                // Verificar cooldown: no crear alerta si hay una reciente sin resolver
                if ($this->enCooldown($umbral->id, $dispositivo->id, $canal)) {
                    continue;
                }

                // Crear alerta
                $alerta = AlertaUmbral::create([
                    'umbral_funcionamiento_id' => $umbral->id,
                    'lectura_id' => $lectura->id,
                    'dispositivo_id' => $dispositivo->id,
                    'metrica' => $umbral->metrica,
                    'canal' => $canal,
                    'valor_leido' => round($valor, 2),
                    'valor_minimo' => $umbral->valor_minimo,
                    'valor_maximo' => $umbral->valor_maximo,
                    'severidad' => $umbral->severidad,
                ]);

                $alertasGeneradas[] = $alerta;

                Log::channel('shelly_readings')->warning(
                    "Umbral excedido: '{$umbral->nombre}' en dispositivo {$dispositivo->id} " .
                    "({$umbral->metrica}/{$canal}): valor={$valor}, " .
                    "rango=[{$umbral->valor_minimo} - {$umbral->valor_maximo}]"
                );
            }
        }

        return $alertasGeneradas;
    }

    /**
     * Verifica si el día actual está en los días activos del umbral.
     */
    private function esDiaActivo(UmbralFuncionamiento $umbral, Carbon $ahora): bool
    {
        $diasActivos = $umbral->dias_semana;

        // Si no hay días configurados, considerar todos activos
        if (empty($diasActivos)) {
            return true;
        }

        // Mapeo de dayOfWeekIso (1=lun, 7=dom) a claves
        $mapaNumDia = [
            1 => 'lun',
            2 => 'mar',
            3 => 'mie',
            4 => 'jue',
            5 => 'vie',
            6 => 'sab',
            7 => 'dom',
        ];

        $diaActual = $mapaNumDia[$ahora->dayOfWeekIso] ?? null;

        return $diaActual && in_array($diaActual, $diasActivos);
    }

    /**
     * Verifica si la hora actual está dentro del rango del umbral.
     */
    private function esHorarioActivo(UmbralFuncionamiento $umbral, Carbon $ahora): bool
    {
        $horaInicio = $umbral->hora_inicio;
        $horaFin = $umbral->hora_fin;

        // Si no hay horario configurado, considerar 24h
        if (empty($horaInicio) && empty($horaFin)) {
            return true;
        }

        $horaActual = $ahora->format('H:i');
        $inicio = substr($horaInicio, 0, 5);
        $fin = substr($horaFin, 0, 5);

        // Horario 24h
        if ($inicio === '00:00' && ($fin === '23:59' || $fin === '00:00')) {
            return true;
        }

        // Horario normal (ej: 08:00 - 20:00)
        if ($inicio <= $fin) {
            return $horaActual >= $inicio && $horaActual <= $fin;
        }

        // Horario cruzado (ej: 22:00 - 06:00)
        return $horaActual >= $inicio || $horaActual <= $fin;
    }

    /**
     * Verifica si existe una alerta reciente sin resolver para el mismo umbral/dispositivo/canal.
     */
    private function enCooldown(int $umbralId, int $dispositivoId, string $canal): bool
    {
        return AlertaUmbral::where('umbral_funcionamiento_id', $umbralId)
            ->where('dispositivo_id', $dispositivoId)
            ->where('canal', $canal)
            ->where('resuelta', false)
            ->where('created_at', '>=', Carbon::now()->subMinutes(self::COOLDOWN_MINUTOS))
            ->exists();
    }

    private function obtenerValorMetrica(string $metrica, Lectura $lectura, ?string $campo): ?float
    {
        return match ($metrica) {
            'potencia_fotovoltaica' => $lectura->obtenerGeneracionFotovoltaica(),
            default => $campo ? $lectura->$campo : null,
        };
    }
}
