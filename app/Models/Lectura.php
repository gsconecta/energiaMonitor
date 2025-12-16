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
        'cloud_conectado',
        'uptime_segundos',
        'canal_1_valido',
        'canal_2_valido',
        'canal_3_valido',
        'datos_raw',
    ];

    protected $casts = [
        'fecha_lectura' => 'datetime',
        'potencia_total_w' => 'float',
        'potencia_canal_1_w' => 'float',
        'potencia_canal_2_w' => 'float',
        'potencia_canal_3_w' => 'float',
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
        'cloud_conectado' => 'boolean',
        'canal_1_valido' => 'boolean',
        'canal_2_valido' => 'boolean',
        'canal_3_valido' => 'boolean',
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

    /**
     * Obtener potencia de un canal según su tipo
     * 
     * @param string $tipo 'fotovoltaica' o 'red_electrica'
     * @return float|null Potencia en W o null si no se encuentra el canal
     */
    public function obtenerPotenciaPorTipoCanal(string $tipo): ?float
    {
        $dispositivo = $this->dispositivo;
        
        if (!$dispositivo) {
            return null;
        }

        // Buscar qué canal tiene el tipo especificado
        for ($i = 1; $i <= 3; $i++) {
            if ($dispositivo->getTipoCanal($i) === $tipo) {
                return match($i) {
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
                return match($i) {
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
     * Calcular consumo de la casa basándose en los tipos de canal
     * Fórmula: Consumo = FV + RED (suma algebraica)
     * 
     * @return float|null Consumo en W, o null si no se pueden identificar los canales
     */
    public function calcularConsumoCasa(): ?float
    {
        $potenciaFV = $this->obtenerPotenciaPorTipoCanal('fotovoltaica');
        $potenciaRED = $this->obtenerPotenciaPorTipoCanal('red_electrica');

        // Si no se pueden identificar ambos canales, retornar null
        if ($potenciaFV === null || $potenciaRED === null) {
            return null;
        }

        // Consumo = FV + RED (suma algebraica)
        return ($potenciaFV ?? 0) + ($potenciaRED ?? 0);
    }

    /**
     * Calcular exportación neta (negativo = importación)
     * 
     * @return float|null Exportación neta en W, o null si no se pueden calcular
     */
    public function calcularExportacionNeta(): ?float
    {
        $consumo = $this->calcularConsumoCasa();
        
        if ($consumo === null) {
            return null;
        }

        // Si consumo es negativo, hay exportación neta
        // Si consumo es positivo, el valor negativo representa importación
        return -$consumo;
    }

    /**
     * Obtener potencia fotovoltaica (puede ser negativa si está cargando baterías)
     * 
     * @return float|null Potencia en W
     */
    public function obtenerPotenciaFotovoltaica(): ?float
    {
        return $this->obtenerPotenciaPorTipoCanal('fotovoltaica');
    }

    /**
     * Obtener potencia de red eléctrica (puede ser negativa si está importando)
     * 
     * @return float|null Potencia en W
     */
    public function obtenerPotenciaRedElectrica(): ?float
    {
        return $this->obtenerPotenciaPorTipoCanal('red_electrica');
    }

    /**
     * Obtener generación fotovoltaica (solo valores positivos)
     * 
     * @return float Generación en W (0 si es negativo o null)
     */
    public function obtenerGeneracionFotovoltaica(): float
    {
        $potencia = $this->obtenerPotenciaFotovoltaica();
        return $potencia !== null && $potencia > 0 ? $potencia : 0;
    }

    /**
     * Obtener carga de baterías (solo valores negativos de FV)
     * 
     * @return float Carga en W (0 si es positivo o null)
     */
    public function obtenerCargaBaterias(): float
    {
        $potencia = $this->obtenerPotenciaFotovoltaica();
        return $potencia !== null && $potencia < 0 ? abs($potencia) : 0;
    }

    /**
     * Obtener exportación a red (solo valores positivos de RED)
     * 
     * @return float Exportación en W (0 si es negativo o null)
     */
    public function obtenerExportacionRed(): float
    {
        $potencia = $this->obtenerPotenciaRedElectrica();
        return $potencia !== null && $potencia > 0 ? $potencia : 0;
    }

    /**
     * Obtener importación de red (solo valores negativos de RED)
     * 
     * @return float Importación en W (0 si es positivo o null)
     */
    public function obtenerImportacionRed(): float
    {
        $potencia = $this->obtenerPotenciaRedElectrica();
        return $potencia !== null && $potencia < 0 ? abs($potencia) : 0;
    }
}