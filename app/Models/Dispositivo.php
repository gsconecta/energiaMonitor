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
        'nave_id',
        'device_id',
        'nombre',
        'tipo',
        'modelo',
        'ip_local',
        'firmware',
        'activo',
        'configuracion',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'configuracion' => 'array',
    ];

    // Relaciones
    public function nave()
    {
        return $this->belongsTo(Nave::class);
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
}