<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Nave extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'nombre',
        'ubicacion',
        'codigo',
        'descripcion',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    // Relaciones
    public function dispositivos()
    {
        return $this->hasMany(Dispositivo::class);
    }

    public function calculosNave()
    {
        return $this->hasMany(Calculo::class);
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('activa', true);
    }

    // Métodos útiles
    public function ultimaLectura()
    {
        return Lectura::whereHas('dispositivo', function ($query) {
            $query->where('nave_id', $this->id);
        })->latest('fecha_lectura')->first();
    }

    public function potenciaActualTotal()
    {
        return $this->dispositivos()
            ->with(['lecturas' => function ($query) {
                $query->latest('fecha_lectura')->limit(1);
            }])
            ->get()
            ->sum(function ($dispositivo) {
                return $dispositivo->lecturas->first()?->potencia_total_w ?? 0;
            });
    }
}