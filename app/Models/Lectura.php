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
}