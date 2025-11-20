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
        'tipo',
        'num_fases',
        'nombre_canal_1',
        'nombre_canal_2',
        'nombre_canal_3',
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

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopeTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    public function scopeProduccion($query)
    {
        return $query->where('tipo', 'produccion');
    }

    public function scopeConsumo($query)
    {
        return $query->where('tipo', 'consumo');
    }

    public function scopeRed($query)
    {
        return $query->where('tipo', 'red');
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
        
        if ($ultimaLectura->potencia_canal_1_w > 0 || 
            $ultimaLectura->voltaje_canal_1 > 0 || 
            $ultimaLectura->corriente_canal_1 > 0) {
            $canalesValidos++;
        }
        
        if ($ultimaLectura->potencia_canal_2_w > 0 || 
            $ultimaLectura->voltaje_canal_2 > 0 || 
            $ultimaLectura->corriente_canal_2 > 0) {
            $canalesValidos++;
        }
        
        if ($ultimaLectura->potencia_canal_3_w > 0 || 
            $ultimaLectura->voltaje_canal_3 > 0 || 
            $ultimaLectura->corriente_canal_3 > 0) {
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
            if (isset($deviceStatus['em1:0'])) $numCanales++;
            if (isset($deviceStatus['em1:1'])) $numCanales++;
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
        return match($this->num_fases) {
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
        return match($numero) {
            1 => $this->nombre_canal_1 ?? 'Canal 1',
            2 => $this->nombre_canal_2 ?? 'Canal 2',
            3 => $this->nombre_canal_3 ?? 'Canal 3',
            default => "Canal {$numero}",
        };
    }
}