<?php

namespace App\Models;

use App\Enums\DriverDispositivo;
use App\Enums\ModoCanales;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModeloDispositivo extends Model
{
    use HasFactory;

    protected $table = 'modelos_dispositivo';

    protected $fillable = [
        'codigo',
        'fabricante',
        'familia',
        'nombre',
        'driver',
        'num_canales',
        'modo_canales_por_defecto',
        'modo_canales_configurable',
        'magnitudes',
        'activo',
        'notas',
    ];

    protected $casts = [
        'driver' => DriverDispositivo::class,
        'num_canales' => 'integer',
        'modo_canales_por_defecto' => ModoCanales::class,
        'modo_canales_configurable' => 'boolean',
        'magnitudes' => 'array',
        'activo' => 'boolean',
    ];

    public function dispositivos(): HasMany
    {
        return $this->hasMany(Dispositivo::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    /** Los dispositivos eliminados siguen referenciando el modelo, por eso cuentan. */
    public function esBorrable(): bool
    {
        return ! $this->dispositivos()->withTrashed()->exists();
    }

    public function nombreCompleto(): string
    {
        return "{$this->fabricante} {$this->nombre}";
    }
}
