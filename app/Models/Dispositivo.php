<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Dispositivo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'dispositivos';

    protected $fillable = [
        'sitio_id',
        'device_id',
        'nombre',
        'num_fases',
        'nombre_canal_1',
        'nombre_canal_2',
        'nombre_canal_3',
        'color_canal_1',
        'color_canal_2',
        'color_canal_3',
        'tipo_canal_1',
        'tipo_canal_2',
        'tipo_canal_3',
        'modelo',
        'ip_local',
        'firmware',
        'activo',
        'configuracion',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'num_fases' => 'integer',
        'configuracion' => 'array',
    ];

    // Relaciones
    public function sitio()
    {
        return $this->belongsTo(Sitio::class);
    }

    public function lecturas()
    {
        return $this->hasMany(Lectura::class);
    }

    public function alertas()
    {
        return $this->hasMany(Alerta::class);
    }

    public function metricasDiarias()
    {
        return $this->hasMany(MetricaDiaria::class);
    }

    public function metricasQuinceMinutos()
    {
        return $this->hasMany(MetricaQuinceMinutos::class);
    }

    public function umbrales()
    {
        return $this->belongsToMany(UmbralFuncionamiento::class, 'dispositivo_umbral')
            ->withTimestamps();
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }


    // Métodos útiles
    public function ultimaLectura()
    {
        return $this->lecturas()->latest('fecha_lectura')->first();
    }

    public function estaOnline()
    {
        $ultimaLectura = $this->ultimaLectura();

        if (!$ultimaLectura) {
            return false;
        }

        // Considerar offline si no hay lectura en los últimos 10 minutos
        return $ultimaLectura->fecha_lectura->diffInMinutes(now()) <= 10;
    }

    public function potenciaActual()
    {
        return $this->ultimaLectura()?->potencia_total_w ?? 0;
    }

    /**
     * Detectar el número de fases desde la última lectura
     * 
     * @return int|null Número de fases detectado (1, 2, o 3) o null si no se puede determinar
     */
    public function detectarNumFases()
    {
        $ultimaLectura = $this->ultimaLectura();

        if (!$ultimaLectura) {
            return null;
        }

        // Contar canales válidos basándose en potencias, voltajes o corrientes
        $canalesValidos = 0;

        if (
            $ultimaLectura->potencia_canal_1_w > 0 ||
            $ultimaLectura->voltaje_canal_1 > 0 ||
            $ultimaLectura->corriente_canal_1 > 0
        ) {
            $canalesValidos++;
        }

        if (
            $ultimaLectura->potencia_canal_2_w > 0 ||
            $ultimaLectura->voltaje_canal_2 > 0 ||
            $ultimaLectura->corriente_canal_2 > 0
        ) {
            $canalesValidos++;
        }

        if (
            $ultimaLectura->potencia_canal_3_w > 0 ||
            $ultimaLectura->voltaje_canal_3 > 0 ||
            $ultimaLectura->corriente_canal_3 > 0
        ) {
            $canalesValidos++;
        }

        return $canalesValidos > 0 ? $canalesValidos : null;
    }

    /**
     * Detectar el número de fases desde datos_raw de la última lectura
     * Analiza el JSON raw para determinar el formato del dispositivo
     * 
     * @return int|null Número de fases detectado (1, 2, o 3) o null si no se puede determinar
     */
    public function detectarNumFasesDesdeRaw()
    {
        $ultimaLectura = $this->ultimaLectura();

        if (!$ultimaLectura || !$ultimaLectura->datos_raw) {
            return null;
        }

        $datosRaw = is_string($ultimaLectura->datos_raw)
            ? json_decode($ultimaLectura->datos_raw, true)
            : $ultimaLectura->datos_raw;

        if (!$datosRaw || !isset($datosRaw['device_status'])) {
            return null;
        }

        $deviceStatus = $datosRaw['device_status'];

        // Formato EM3 trifásico (em:0 con prefijos a_, b_, c_)
        if (isset($deviceStatus['em:0']) && isset($deviceStatus['em:0']['a_act_power'])) {
            return 3; // Trifásico
        }

        // Formato EM1/EM1+ (em1:0, em1:1)
        if (isset($deviceStatus['em1:0']) || isset($deviceStatus['em1:1'])) {
            $numCanales = 0;
            if (isset($deviceStatus['em1:0']))
                $numCanales++;
            if (isset($deviceStatus['em1:1']))
                $numCanales++;
            return $numCanales > 0 ? $numCanales : null;
        }

        // Formato EM3 antiguo (emeters array)
        if (isset($deviceStatus['emeters']) && is_array($deviceStatus['emeters'])) {
            $numCanales = 0;
            foreach ($deviceStatus['emeters'] as $emeter) {
                if (isset($emeter['power']) && $emeter['power'] > 0) {
                    $numCanales++;
                }
            }
            return $numCanales > 0 ? $numCanales : null;
        }

        return null;
    }

    /**
     * Actualizar el número de fases automáticamente desde la última lectura
     * 
     * @return bool True si se actualizó, false si no
     */
    public function actualizarNumFasesAuto()
    {
        $numFases = $this->detectarNumFasesDesdeRaw() ?? $this->detectarNumFases();

        if ($numFases !== null && $numFases !== $this->num_fases) {
            $this->update(['num_fases' => $numFases]);
            return true;
        }

        return false;
    }

    /**
     * Scope para filtrar por número de fases
     */
    public function scopeFases($query, int $numFases)
    {
        return $query->where('num_fases', $numFases);
    }

    /**
     * Scope para dispositivos monofásicos
     */
    public function scopeMonofasico($query)
    {
        return $query->where('num_fases', 1);
    }

    /**
     * Scope para dispositivos bifásicos
     */
    public function scopeBifasico($query)
    {
        return $query->where('num_fases', 2);
    }

    /**
     * Scope para dispositivos trifásicos
     */
    public function scopeTrifasico($query)
    {
        return $query->where('num_fases', 3);
    }

    /**
     * Obtener el label del número de fases
     */
    public function getFasesLabelAttribute()
    {
        return match ($this->num_fases) {
            1 => 'Monofásico',
            2 => 'Bifásico',
            3 => 'Trifásico',
            default => 'No determinado'
        };
    }

    /**
     * Verificar si es monofásico
     */
    public function esMonofasico()
    {
        return $this->num_fases === 1;
    }

    /**
     * Verificar si es bifásico
     */
    public function esBifasico()
    {
        return $this->num_fases === 2;
    }

    /**
     * Verificar si es trifásico
     */
    public function esTrifasico()
    {
        return $this->num_fases === 3;
    }

    /**
     * Obtener el nombre de un canal por número (con valor por defecto)
     */
    public function getNombreCanal(int $numero): string
    {
        return match ($numero) {
            1 => $this->nombre_canal_1 ?? 'Canal 1',
            2 => $this->nombre_canal_2 ?? 'Canal 2',
            3 => $this->nombre_canal_3 ?? 'Canal 3',
            default => "Canal {$numero}",
        };
    }

    /**
     * Obtener el tipo de un canal por número (fotovoltaica o red_electrica)
     */
    public function getTipoCanal(int $numero): ?string
    {
        return match ($numero) {
            1 => $this->tipo_canal_1,
            2 => $this->tipo_canal_2,
            3 => $this->tipo_canal_3,
            default => null,
        };
    }

    /**
     * Verificar si un canal es fotovoltaico
     */
    public function esCanalFotovoltaica(int $numero): bool
    {
        return $this->getTipoCanal($numero) === 'fotovoltaica';
    }

    /**
     * Verificar si un canal es de red eléctrica
     */
    public function esCanalRedElectrica(int $numero): bool
    {
        return $this->getTipoCanal($numero) === 'red_electrica';
    }

    /**
     * @deprecated Usar esCanalFotovoltaica() en su lugar
     */
    public function esCanalGeneracion(int $numero): bool
    {
        return $this->esCanalFotovoltaica($numero);
    }

    /**
     * @deprecated Usar esCanalRedElectrica() en su lugar
     */
    public function esCanalConsumo(int $numero): bool
    {
        return $this->esCanalRedElectrica($numero);
    }

    /**
     * Obtener el número de canal según su tipo
     * 
     * @param string $tipo 'fotovoltaica' o 'red_electrica'
     * @return int|null Número de canal (1, 2, o 3) o null si no se encuentra
     */
    public function obtenerCanalPorTipo(string $tipo): ?int
    {
        for ($i = 1; $i <= 3; $i++) {
            if ($this->getTipoCanal($i) === $tipo) {
                return $i;
            }
        }

        return null;
    }

    /**
     * Obtener potencia de un canal según su tipo desde una lectura
     * 
     * @param string $tipo 'fotovoltaica' o 'red_electrica'
     * @param \App\Models\Lectura|null $lectura Lectura de la que obtener el valor
     * @return float|null Potencia en W o null
     */
    public function obtenerPotenciaCanal(string $tipo, ?Lectura $lectura = null): ?float
    {
        if (!$lectura) {
            $lectura = $this->ultimaLectura();
        }

        if (!$lectura) {
            return null;
        }

        return $lectura->obtenerPotenciaPorTipoCanal($tipo);
    }

    /**
     * Calcular métricas de energía agregadas desde una colección de lecturas
     * 
     * @param \Illuminate\Database\Eloquent\Collection $lecturas
     * @return array Métricas calculadas
     */
    public function calcularMetricasEnergia($lecturas): array
    {
        if ($lecturas->isEmpty()) {
            return [
                'consumo_casa_kw' => 0,
                'exportacion_neta_kw' => 0,
                'generacion_fotovoltaica_kw' => 0,
                'carga_baterias_kw' => 0,
                'importacion_red_kw' => 0,
                'exportacion_red_kw' => 0,
            ];
        }

        $ultimaLectura = $lecturas->last();

        // Calcular valores de la última lectura
        $consumoCasa = $ultimaLectura->calcularConsumoCasa() ?? 0;
        $exportacionNeta = $ultimaLectura->calcularExportacionNeta() ?? 0;
        $generacionFV = $ultimaLectura->obtenerGeneracionFotovoltaica();
        $cargaBaterias = $ultimaLectura->obtenerCargaBaterias();
        $importacionRed = $ultimaLectura->obtenerImportacionRed();
        $exportacionRed = $ultimaLectura->obtenerExportacionRed();

        // Calcular promedios del período
        $consumos = $lecturas->map(fn($l) => $l->calcularConsumoCasa())->filter(fn($v) => $v !== null);
        $consumoPromedio = $consumos->isNotEmpty() ? $consumos->avg() : 0;

        $exportacionesNetas = $lecturas->map(fn($l) => $l->calcularExportacionNeta())->filter(fn($v) => $v !== null);
        $exportacionNetaPromedio = $exportacionesNetas->isNotEmpty() ? $exportacionesNetas->avg() : 0;

        return [
            'consumo_casa_kw' => round($consumoCasa / 1000, 2),
            'consumo_casa_promedio_kw' => round($consumoPromedio / 1000, 2),
            'exportacion_neta_kw' => round($exportacionNeta / 1000, 2),
            'exportacion_neta_promedio_kw' => round($exportacionNetaPromedio / 1000, 2),
            'generacion_fotovoltaica_kw' => round($generacionFV / 1000, 2),
            'carga_baterias_kw' => round($cargaBaterias / 1000, 2),
            'importacion_red_kw' => round($importacionRed / 1000, 2),
            'exportacion_red_kw' => round($exportacionRed / 1000, 2),
        ];
    }

    /**
     * Calcular energía acumulada (kWh) en un período usando integración trapezoidal
     * 
     * @param \Illuminate\Database\Eloquent\Collection $lecturas
     * @return array Métricas de energía en kWh
     */
    public function calcularEnergiaAcumulada($lecturas): array
    {
        if ($lecturas->isEmpty() || $lecturas->count() < 2) {
            return [
                'consumo_casa_kwh' => 0,
                'exportacion_neta_kwh' => 0,
                'generacion_fotovoltaica_kwh' => 0,
                'carga_baterias_kwh' => 0,
                'importacion_red_kwh' => 0,
                'exportacion_red_kwh' => 0,
            ];
        }

        $consumoCasa = 0;
        $exportacionNeta = 0;
        $generacionFV = 0;
        $cargaBaterias = 0;
        $importacionRed = 0;
        $exportacionRed = 0;

        // Ordenar por fecha
        $lecturasOrdenadas = $lecturas->sortBy('fecha_lectura')->values();

        // Calcular energía usando método del trapecio
        for ($i = 0; $i < $lecturasOrdenadas->count() - 1; $i++) {
            $lectura1 = $lecturasOrdenadas[$i];
            $lectura2 = $lecturasOrdenadas[$i + 1];

            // Calcular tiempo transcurrido en horas
            $tiempoHoras = $lectura1->fecha_lectura->diffInSeconds($lectura2->fecha_lectura) / 3600;

            // Obtener potencias de ambas lecturas
            $consumo1 = $lectura1->calcularConsumoCasa() ?? 0;
            $consumo2 = $lectura2->calcularConsumoCasa() ?? 0;

            $exportacion1 = $lectura1->calcularExportacionNeta() ?? 0;
            $exportacion2 = $lectura2->calcularExportacionNeta() ?? 0;

            $genFV1 = $lectura1->obtenerGeneracionFotovoltaica();
            $genFV2 = $lectura2->obtenerGeneracionFotovoltaica();

            $carga1 = $lectura1->obtenerCargaBaterias();
            $carga2 = $lectura2->obtenerCargaBaterias();

            $importacion1 = $lectura1->obtenerImportacionRed();
            $importacion2 = $lectura2->obtenerImportacionRed();

            $exportacionRed1 = $lectura1->obtenerExportacionRed();
            $exportacionRed2 = $lectura2->obtenerExportacionRed();

            // Calcular energía usando método del trapecio: (P1 + P2) / 2 * Δt
            // Convertir de W a kW y multiplicar por horas para obtener kWh
            $consumoCasa += (($consumo1 + $consumo2) / 2 / 1000) * $tiempoHoras;
            $exportacionNeta += (($exportacion1 + $exportacion2) / 2 / 1000) * $tiempoHoras;
            $generacionFV += (($genFV1 + $genFV2) / 2 / 1000) * $tiempoHoras;
            $cargaBaterias += (($carga1 + $carga2) / 2 / 1000) * $tiempoHoras;
            $importacionRed += (($importacion1 + $importacion2) / 2 / 1000) * $tiempoHoras;
            $exportacionRed += (($exportacionRed1 + $exportacionRed2) / 2 / 1000) * $tiempoHoras;
        }

        return [
            'consumo_casa_kwh' => round($consumoCasa, 2),
            'exportacion_neta_kwh' => round($exportacionNeta, 2),
            'generacion_fotovoltaica_kwh' => round($generacionFV, 2),
            'carga_baterias_kwh' => round($cargaBaterias, 2),
            'importacion_red_kwh' => round($importacionRed, 2),
            'exportacion_red_kwh' => round($exportacionRed, 2),
        ];
    }

    /**
     * Verificar si el dispositivo tiene algún canal configurado como fotovoltaica.
     * 
     * @return bool
     */
    public function tieneFotovoltaica(): bool
    {
        return $this->tipo_canal_1 === 'fotovoltaica' ||
            $this->tipo_canal_2 === 'fotovoltaica' ||
            $this->tipo_canal_3 === 'fotovoltaica';
    }
}
