<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetricaQuinceMinutos extends Model
{
    use HasFactory;

    protected $table = 'metricas_quince_minutos';

    protected $fillable = [
        'dispositivo_id',
        'intervalo_inicio',
        'intervalo_fin',
        'primera_lectura_at',
        'ultima_lectura_at',
        'energia_consumida_kwh',
        'energia_generada_kwh',
        'energia_importada_kwh',
        'energia_exportada_kwh',
        'potencia_promedio_w',
        'potencia_max_w',
        'hora_potencia_max',
        'potencia_min_w',
        'hora_potencia_min',
        'voltaje_promedio',
        'corriente_promedio_1',
        'corriente_promedio_2',
        'corriente_promedio_3',
        'pf_promedio',
        'reactiva_promedio_var',
        'numero_lecturas',
        'minutos_online',
        'minutos_offline',
        'resumen',
    ];

    protected $casts = [
        'intervalo_inicio' => 'datetime',
        'intervalo_fin' => 'datetime',
        'primera_lectura_at' => 'datetime',
        'ultima_lectura_at' => 'datetime',
        'energia_consumida_kwh' => 'float',
        'energia_generada_kwh' => 'float',
        'energia_importada_kwh' => 'float',
        'energia_exportada_kwh' => 'float',
        'potencia_promedio_w' => 'float',
        'potencia_max_w' => 'float',
        'hora_potencia_max' => 'datetime',
        'potencia_min_w' => 'float',
        'hora_potencia_min' => 'datetime',
        'voltaje_promedio' => 'float',
        'corriente_promedio_1' => 'float',
        'corriente_promedio_2' => 'float',
        'corriente_promedio_3' => 'float',
        'pf_promedio' => 'float',
        'reactiva_promedio_var' => 'float',
        'resumen' => 'array',
    ];

    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class);
    }
}
