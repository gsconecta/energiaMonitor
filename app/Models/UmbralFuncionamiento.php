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
    ];

    protected $casts = [
        'activo' => 'boolean',
        'notificar_app' => 'boolean',
        'notificar_email' => 'boolean',
        'notificar_telegram' => 'boolean',
        'destinatarios_email' => 'array',
        'valor_minimo' => 'decimal:2',
        'valor_maximo' => 'decimal:2',
    ];

    public const METRICAS = [
        'voltaje' => ['label' => 'Voltaje', 'unidad' => 'V'],
        'corriente' => ['label' => 'Intensidad', 'unidad' => 'A'],
        'potencia_activa' => ['label' => 'Potencia Activa', 'unidad' => 'W'],
        'potencia_reactiva' => ['label' => 'Potencia Reactiva', 'unidad' => 'VAR'],
        'factor_potencia' => ['label' => 'Factor de Potencia', 'unidad' => 'cos(φ)'],
        'energia_consumo' => ['label' => 'Energía Consumida', 'unidad' => 'kWh'],
        'generacion_fv' => ['label' => 'Generación FV', 'unidad' => 'kW'],
    ];

    public function organizaciones()
    {
        return $this->belongsToMany(Organizacion::class, 'organizacion_umbral')
            ->withTimestamps();
    }
}
