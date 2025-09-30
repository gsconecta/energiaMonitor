<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetricaDiaria extends Model
{
    use HasFactory;

    protected $table = 'metricas_diarias';

    protected $fillable = [
        'dispositivo_id',
        'fecha',
        'energia_generada_kwh',
        'energia_consumida_kwh',
        'energia_vertida_kwh',
        'energia_importada_kwh',
        'potencia_max_w',
        'hora_potencia_max',
        'potencia_min_w',
        'hora_potencia_min',
        'potencia_promedio_w',
        'voltaje_max',
        'voltaje_min',
        'voltaje_promedio',
        'pf_promedio',
        'pf_min',
        'minutos_online',
        'minutos_offline',
        'disponibilidad_porcentaje',
        'numero_lecturas',
        'numero_alertas',
    ];

    protected $casts = [
        'fecha' => 'date',
        'hora_potencia_max' => 'datetime',
        'hora_potencia_min' => 'datetime',
        'energia_generada_kwh' => 'float',
        'energia_consumida_kwh' => 'float',
        'energia_vertida_kwh' => 'float',
        'energia_importada_kwh' => 'float',
        'potencia_max_w' => 'float',
        'potencia_min_w' => 'float',
        'potencia_promedio_w' => 'float',
        'voltaje_max' => 'float',
        'voltaje_min' => 'float',
        'voltaje_promedio' => 'float',
        'pf_promedio' => 'float',
        'pf_min' => 'float',
        'disponibilidad_porcentaje' => 'float',
    ];

    // Relaciones
    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class);
    }

    // Scopes
    public function scopeHoy($query)
    {
        return $query->whereDate('fecha', today());
    }

    public function scopeMesActual($query)
    {
        return $query->whereMonth('fecha', now()->month)
                     ->whereYear('fecha', now()->year);
    }
}