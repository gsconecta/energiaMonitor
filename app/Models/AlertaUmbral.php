<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AlertaUmbral extends Model
{
    use HasFactory;

    protected $table = 'alertas_umbral';

    protected $fillable = [
        'umbral_funcionamiento_id',
        'lectura_id',
        'dispositivo_id',
        'metrica',
        'canal',
        'valor_leido',
        'valor_minimo',
        'valor_maximo',
        'severidad',
        'resuelta',
        'resuelta_at',
    ];

    protected $casts = [
        'resuelta' => 'boolean',
        'resuelta_at' => 'datetime',
        'valor_leido' => 'decimal:2',
        'valor_minimo' => 'decimal:2',
        'valor_maximo' => 'decimal:2',
    ];

    public function umbral()
    {
        return $this->belongsTo(UmbralFuncionamiento::class, 'umbral_funcionamiento_id');
    }

    public function lectura()
    {
        return $this->belongsTo(Lectura::class);
    }

    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class);
    }
}
