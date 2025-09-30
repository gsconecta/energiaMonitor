<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Calculo extends Model
{
    use HasFactory;

    protected $table = 'calculos';

    protected $fillable = [
        'nave_id',
        'fecha_calculo',
        'produccion_solar_kw',
        'consumo_nave_kw',
        'vertido_red_kw',
        'importacion_red_kw',
        'autoconsumo_kw',
        'porcentaje_autoconsumo',
        'porcentaje_autosuficiencia',
        'carga_bateria_kw',
        'descarga_bateria_kw',
        'soc_bateria_porcentaje',
        'co2_ahorrado_kg',
        'ahorro_estimado_euros',
    ];

    protected $casts = [
        'fecha_calculo' => 'datetime',
        'produccion_solar_kw' => 'float',
        'consumo_nave_kw' => 'float',
        'vertido_red_kw' => 'float',
        'importacion_red_kw' => 'float',
        'autoconsumo_kw' => 'float',
        'porcentaje_autoconsumo' => 'float',
        'porcentaje_autosuficiencia' => 'float',
        'carga_bateria_kw' => 'float',
        'descarga_bateria_kw' => 'float',
        'soc_bateria_porcentaje' => 'float',
        'co2_ahorrado_kg' => 'float',
        'ahorro_estimado_euros' => 'float',
    ];

    // Relaciones
    public function nave()
    {
        return $this->belongsTo(Nave::class);
    }

    // Scopes
    public function scopeHoy($query)
    {
        return $query->whereDate('fecha_calculo', today());
    }

    public function scopeUltimas24Horas($query)
    {
        return $query->where('fecha_calculo', '>=', now()->subHours(24));
    }
}