<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UmbralFuncionamiento extends Model
{
    use HasFactory;

    protected $table = 'umbrales_funcionamiento';

    protected $fillable = [
        'nombre',
        'metrica',
        'valor_minimo',
        'valor_maximo',
        'severidad',
        'activo',
        'notificar_app',
        'notificar_email',
        'notificar_telegram',
        'destinatarios_email',
        'hora_inicio',
        'hora_fin',
        'dias_semana',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'notificar_app' => 'boolean',
        'notificar_email' => 'boolean',
        'notificar_telegram' => 'boolean',
        'destinatarios_email' => 'array',
        'valor_minimo' => 'decimal:2',
        'valor_maximo' => 'decimal:2',
        'hora_inicio' => 'string',
        'hora_fin' => 'string',
        'dias_semana' => 'array',
    ];

    public const METRICAS = [
        'voltaje' => ['label' => 'Voltaje', 'unidad' => 'V'],
        'corriente' => ['label' => 'Intensidad', 'unidad' => 'A'],
        'potencia_activa' => ['label' => 'Potencia Activa', 'unidad' => 'W'],
        'potencia_reactiva' => ['label' => 'Potencia Reactiva', 'unidad' => 'VAR'],
        'factor_potencia' => ['label' => 'Factor de Potencia', 'unidad' => 'cos(phi)'],
        'energia_consumo' => ['label' => 'Energia Consumida', 'unidad' => 'kWh'],
        'generacion_fv' => ['label' => 'Generacion FV', 'unidad' => 'kWh'],
    ];

    public const DIAS_SEMANA = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

    public const DIAS_LABELS = [
        'lun' => 'Lunes',
        'mar' => 'Martes',
        'mie' => 'Miercoles',
        'jue' => 'Jueves',
        'vie' => 'Viernes',
        'sab' => 'Sabado',
        'dom' => 'Domingo',
    ];

    public function organizaciones()
    {
        return $this->belongsToMany(Organizacion::class, 'organizacion_umbral')
            ->withTimestamps();
    }
}
