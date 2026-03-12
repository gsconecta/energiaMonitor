<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lectura extends Model
{
    use HasFactory;

    protected $fillable = [
        'dispositivo_id',
        'fecha_lectura',
        'potencia_total_w',
        'potencia_canal_1_w',
        'potencia_canal_2_w',
        'potencia_canal_3_w',
        'reactiva_canal_1_var',
        'reactiva_canal_2_var',
        'reactiva_canal_3_var',
        'reactiva_total_var',
        'energia_total_kwh',
        'energia_retornada_kwh',
        'energia_canal_1_kwh',
        'energia_canal_2_kwh',
        'energia_canal_3_kwh',
        'voltaje_canal_1',
        'voltaje_canal_2',
        'voltaje_canal_3',
        'voltaje_promedio',
        'corriente_canal_1',
        'corriente_canal_2',
        'corriente_canal_3',
        'corriente_neutro',
        'pf_canal_1',
        'pf_canal_2',
        'pf_canal_3',
        'online',
        'wifi_conectado',
        'wifi_rssi',
        'uptime_segundos',
        'datos_raw',
    ];

    protected $casts = [
        'fecha_lectura' => 'datetime',
        'potencia_total_w' => 'float',
        'potencia_canal_1_w' => 'float',
        'potencia_canal_2_w' => 'float',
        'potencia_canal_3_w' => 'float',
        'reactiva_canal_1_var' => 'float',
        'reactiva_canal_2_var' => 'float',
        'reactiva_canal_3_var' => 'float',
        'reactiva_total_var' => 'float',
        'energia_total_kwh' => 'float',
        'energia_retornada_kwh' => 'float',
        'energia_canal_1_kwh' => 'float',
        'energia_canal_2_kwh' => 'float',
        'energia_canal_3_kwh' => 'float',
        'voltaje_canal_1' => 'float',
        'voltaje_canal_2' => 'float',
        'voltaje_canal_3' => 'float',
        'voltaje_promedio' => 'float',
        'corriente_canal_1' => 'float',
        'corriente_canal_2' => 'float',
        'corriente_canal_3' => 'float',
        'corriente_neutro' => 'float',
        'pf_canal_1' => 'float',
        'pf_canal_2' => 'float',
        'pf_canal_3' => 'float',
        'online' => 'boolean',
        'wifi_conectado' => 'boolean',
        'datos_raw' => 'array',
    ];

    // Relaciones
    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class);
    }

    // Scopes
    public function scopeHoy($query)
    {
        return $query->whereDate('fecha_lectura', today());
    }

    public function scopeAyer($query)
    {
        return $query->whereDate('fecha_lectura', today()->subDay());
    }

    public function scopeSemanaActual($query)
    {
        return $query->whereBetween('fecha_lectura', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    public function scopeMesActual($query)
    {
        return $query->whereMonth('fecha_lectura', now()->month)
            ->whereYear('fecha_lectura', now()->year);
    }

    public function scopeEntreFechas($query, $desde, $hasta)
    {
        return $query->whereBetween('fecha_lectura', [$desde, $hasta]);
    }

    public function scopeOnline($query)
    {
        return $query->where('online', true);
    }

    // Métodos útiles
    public function potenciaKw()
    {
        return round($this->potencia_total_w / 1000, 3);
    }

    public function voltajePromedioCalculado()
    {
        $voltajes = [
            $this->voltaje_canal_1,
            $this->voltaje_canal_2,
            $this->voltaje_canal_3
        ];

        return round(array_sum($voltajes) / count($voltajes), 2);
    }

    public function obtenerPotenciaPorTipoCanal(string $tipo): ?float
    {
        $dispositivo = $this->dispositivo;

        if (!$dispositivo) {
            return null;
        }

        // Buscar qué canal tiene el tipo especificado
        for ($i = 1; $i <= 3; $i++) {
            if ($dispositivo->getTipoCanal($i) === $tipo) {
                return match ($i) {
                    1 => $this->potencia_canal_1_w,
                    2 => $this->potencia_canal_2_w,
                    3 => $this->potencia_canal_3_w,
                    default => null,
                };
            }
        }

        return null;
    }

    /**
     * Obtener voltaje de un canal según su tipo
     * 
     * @param string $tipo 'fotovoltaica' o 'red_electrica'
     * @return float|null Voltaje o null si no se encuentra el canal
     */
    public function obtenerVoltajePorTipoCanal(string $tipo): ?float
    {
        $dispositivo = $this->dispositivo;

        if (!$dispositivo) {
            return null;
        }

        // Buscar qué canal tiene el tipo especificado
        for ($i = 1; $i <= 3; $i++) {
            if ($dispositivo->getTipoCanal($i) === $tipo) {
                return match ($i) {
                    1 => $this->voltaje_canal_1,
                    2 => $this->voltaje_canal_2,
                    3 => $this->voltaje_canal_3,
                    default => null,
                };
            }
        }

        return null;
    }

    /**
     * Obtener energía de un canal según su tipo
     * 
     * @param string $tipo 'fotovoltaica' o 'red_electrica'
     * @return float|null Energía en kWh o null si no se encuentra el canal
     */
    public function obtenerEnergiaPorTipoCanal(string $tipo): ?float
    {
        $dispositivo = $this->dispositivo;

        if (!$dispositivo) {
            return null;
        }

        // Buscar qué canal tiene el tipo especificado
        for ($i = 1; $i <= 3; $i++) {
            if ($dispositivo->getTipoCanal($i) === $tipo) {
                return match ($i) {
                    1 => $this->energia_canal_1_kwh,
                    2 => $this->energia_canal_2_kwh,
                    3 => $this->energia_canal_3_kwh,
                    default => null,
                };
            }
        }

        return null;
    }

    /**
     * Calcular consumo de la casa basándose en la ecuación de balance energético
     * Ecuación: FV - C + RED - Exp = 0
     * 
     * Donde:
     * - FV = Fase monitorizada de Fotovoltaica (SIEMPRE se invierte el signo)
     *   * Si el valor original es negativo → está inyectando a la casa → FV positivo
     *   * Si el valor original es positivo → está consumiendo de la casa → FV negativo
     * - C = Consumo casa (lo que calculamos)
     * - RED = Fase monitorizada Red Eléctrica
     *   * Si es positivo = consumo de red (RED)
     *   * Si es negativo = exportación (Exp)
     * 
     * Fórmula resultante: C = FV_corregido + RED
     * 
     * @return float|null Consumo en W, o null si no se pueden identificar los canales
     */
    public function calcularConsumoCasa(): ?float
    {
        $potenciaFV = $this->obtenerPotenciaPorTipoCanal('fotovoltaica');
        $potenciaRED = $this->obtenerPotenciaPorTipoCanal('red_electrica');

        // Si no hay lectura de red, no podemos calcular el consumo total fiablemente con este esquema base
        if ($potenciaRED === null) {
            return null;
        }

        // FV: SIEMPRE invertir el signo del canal fotovoltaica
        // Si es negativo → inyecta a casa → FV positivo en la ecuación
        // Si es positivo → consume de casa → FV negativo en la ecuación
        $fvCorregido = $potenciaFV !== null ? -$potenciaFV : 0;

        // RED: usar el valor tal cual (positivo = consumo, negativo = exportación)
        // Ecuación: FV - C + RED - Exp = 0
        // Despejando: C = FV_corregido + RED
        return $fvCorregido + $potenciaRED;
    }

    /**
     * Calcular exportación neta basada en la ecuación de balance energético
     * Si RED es negativo, hay exportación. Si RED es positivo, no hay exportación.
     * 
     * @return float|null Exportación neta en W, o null si no se pueden calcular
     */
    public function calcularExportacionNeta(): ?float
    {
        $potenciaRED = $this->obtenerPotenciaPorTipoCanal('red_electrica');

        if ($potenciaRED === null) {
            return null;
        }

        // Si RED es negativo, hay exportación (Exp = -RED)
        // Si RED es positivo, no hay exportación (Exp = 0)
        return $potenciaRED < 0 ? abs($potenciaRED) : 0;
    }

    /**
     * Obtener potencia fotovoltaica corregida (SIEMPRE invierte el signo)
     * Según la ecuación de balance: el canal fotovoltaica siempre se invierte
     * 
     * @return float|null Potencia en W (signo invertido respecto al valor original)
     */
    public function obtenerPotenciaFotovoltaica(): ?float
    {
        $potencia = $this->obtenerPotenciaPorTipoCanal('fotovoltaica');

        if ($potencia === null) {
            return null;
        }

        // SIEMPRE invertir el signo del canal fotovoltaica
        // Si es negativo → inyecta a casa → retornar positivo
        // Si es positivo → consume de casa → retornar negativo
        return -$potencia;
    }

    public function obtenerPotenciaRedElectrica(): ?float
    {
        return $this->obtenerPotenciaPorTipoCanal('red_electrica');
    }

    /**
     * Obtener voltaje de red eléctrica
     * 
     * @return float|null Voltaje
     */
    public function obtenerVoltajeRedElectrica(): ?float
    {
        return $this->obtenerVoltajePorTipoCanal('red_electrica');
    }

    /**
     * Obtener consumo de red eléctrica (solo valores positivos de RED)
     * 
     * @return float Consumo de red en W (0 si es negativo o null)
     */
    public function obtenerConsumoRed(): float
    {
        $potencia = $this->obtenerPotenciaRedElectrica();
        return $potencia !== null && $potencia > 0 ? $potencia : 0;
    }

    /**
     * Obtener generación fotovoltaica (solo valores positivos después de corrección)
     * Esto representa cuando FV está inyectando energía a la casa
     * 
     * @return float Generación en W (0 si no está generando)
     */
    public function obtenerGeneracionFotovoltaica(): float
    {
        $potencia = $this->obtenerPotenciaFotovoltaica();
        return $potencia !== null && $potencia > 0 ? $potencia : 0;
    }

    /**
     * Obtener consumo fotovoltaico (solo valores negativos después de corrección)
     * Esto representa cuando el inversor está consumiendo energía de la casa/red
     * 
     * @return float Consumo en W (0 si no está consumiendo)
     */
    public function obtenerConsumoFotovoltaico(): float
    {
        $potencia = $this->obtenerPotenciaFotovoltaica();
        return $potencia !== null && $potencia < 0 ? abs($potencia) : 0;
    }

    /**
     * Obtener carga de baterías (cuando FV original es negativo y muy grande)
     * Esto ocurre cuando el inversor está cargando baterías en lugar de generar
     * 
     * @return float Carga en W (0 si no está cargando)
     */
    public function obtenerCargaBaterias(): float
    {
        // La carga de baterías se detectaría por otros medios (si hay datos del inversor)
        // Por ahora, si FV corregido es negativo, podría indicar consumo del inversor
        $potencia = $this->obtenerPotenciaFotovoltaica();
        return $potencia !== null && $potencia < 0 ? abs($potencia) : 0;
    }

    /**
     * Obtener exportación a red (solo cuando RED es negativo)
     * 
     * @return float Exportación en W (0 si es positivo o null)
     */
    public function obtenerExportacionRed(): float
    {
        $potencia = $this->obtenerPotenciaRedElectrica();
        return $potencia !== null && $potencia < 0 ? abs($potencia) : 0;
    }

    /**
     * Obtener importación de red (solo cuando RED es positivo)
     * 
     * @return float Importación en W (0 si es negativo o null)
     */
    public function obtenerImportacionRed(): float
    {
        $potencia = $this->obtenerPotenciaRedElectrica();
        return $potencia !== null && $potencia > 0 ? $potencia : 0;
    }

    /**
     * Calcular Potencia Reactiva (Q) para un canal específico (en VAR)
     * Q = V * I * sin(phi)
     * donde sin(phi) = sqrt(1 - pf^2)
     * 
     * @param int $canal Número de canal (1, 2, 3)
     * @return float|null Potencia reactiva en VAR o null si faltan datos
     */
    public function calcularPotenciaReactivaCanal(int $canal): ?float
    {
        $voltaje = match ($canal) {
            1 => $this->voltaje_canal_1,
            2 => $this->voltaje_canal_2,
            3 => $this->voltaje_canal_3,
            default => null,
        };

        $corriente = match ($canal) {
            1 => $this->corriente_canal_1,
            2 => $this->corriente_canal_2,
            3 => $this->corriente_canal_3,
            default => null,
        };

        $pf = match ($canal) {
            1 => $this->pf_canal_1,
            2 => $this->pf_canal_2,
            3 => $this->pf_canal_3,
            default => null,
        };

        if ($voltaje === null || $corriente === null || $pf === null) {
            return null;
        }

        // Restringir el factor de potencia entre -1 y 1 para evitar errores en sqrt
        $pfManejado = max(-1.0, min(1.0, (float) $pf));

        $sinPhi = sqrt(1 - pow($pfManejado, 2));

        return round($voltaje * $corriente * $sinPhi, 2);
    }

    /**
     * Calcular Potencia Reactiva Total (Q Total) (en VAR)
     * Suma de Q1 + Q2 + Q3
     * 
     * @return float
     */
    public function calcularPotenciaReactivaTotal(): float
    {
        $q1 = $this->calcularPotenciaReactivaCanal(1) ?? 0;
        $q2 = $this->calcularPotenciaReactivaCanal(2) ?? 0;
        $q3 = $this->calcularPotenciaReactivaCanal(3) ?? 0;

        return round($q1 + $q2 + $q3, 2);
    }
}