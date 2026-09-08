<?php

namespace App\Services\Energia;

use App\Models\Lectura;
use Illuminate\Support\Collection;

/** Interpreta el almacenamiento histórico; no cambia lecturas ni infiere unidades por magnitud. */
final class ContadoresEnergia
{
    public const CAMPOS = ['energia_total_kwh', 'energia_retornada_kwh', 'energia_canal_1_kwh', 'energia_canal_2_kwh', 'energia_canal_3_kwh'];

    public function unidad(Lectura $lectura): ?string
    {
        $raw = $lectura->datos_raw ?? [];
        $status = $raw['device_status'] ?? $raw;
        if (! is_array($status)) {
            return null;
        }
        $moderno = isset($status['em:0']) || isset($status['em1:0']) || isset($status['em1:1']);
        $antiguo = isset($status['emeters']) && is_array($status['emeters']);
        // Formatos simultáneos son ambiguos: no decidir por prioridad accidental.
        if ($moderno === $antiguo) {
            return null;
        }

        // El lector histórico convirtió emeters a kWh, pero conservó EM/EM1 en Wh.
        return $moderno ? 'Wh' : 'kWh';
    }

    /** Consumo entre las muestras disponibles, no una estimación del intervalo sin cobertura. */
    public function calcular(Collection $lecturas, string $campo): array
    {
        if (! in_array($campo, self::CAMPOS, true)) {
            throw new \InvalidArgumentException('Contador no permitido.');
        }
        $invalid = fn (string $motivo) => ['kwh' => null, 'estado' => $motivo];
        if ($lecturas->count() < 2) {
            return $invalid('muestras_insuficientes');
        }
        if ($lecturas->pluck('dispositivo_id')->unique()->count() !== 1) {
            return $invalid('dispositivos_distintos');
        }
        if ($lecturas->contains(fn ($lectura) => $lectura->fecha_lectura === null)) {
            return $invalid('fecha_desconocida');
        }
        $anterior = null;
        $fechaAnterior = null;
        $total = 0.0;
        $intervalos = 0;
        foreach ($lecturas->sortBy('fecha_lectura') as $lectura) {
            $unidad = $this->unidad($lectura);
            if ($unidad === null) {
                return $invalid('unidad_desconocida');
            }
            $valor = $lectura->getAttribute($campo);
            if ($valor === null || ! is_numeric($valor) || ! is_finite((float) $valor) || $valor < 0) {
                return $invalid('contador_invalido');
            }
            $actual = (float) $valor / ($unidad === 'Wh' ? 1000 : 1);
            if ($anterior !== null) {
                if ($lectura->fecha_lectura->equalTo($fechaAnterior)) {
                    if (abs($actual - $anterior) > 0.0000001) {
                        return $invalid('duplicado_conflictivo');
                    }

                    continue;
                }
                if ($actual < $anterior - 0.0000001) {
                    return $invalid('contador_reiniciado');
                }
                $total += max(0, $actual - $anterior);
                $intervalos++;
            }
            $anterior = $actual;
            $fechaAnterior = $lectura->fecha_lectura;
        }

        return $intervalos ? ['kwh' => $total, 'estado' => 'valido'] : $invalid('muestras_insuficientes');
    }
}
