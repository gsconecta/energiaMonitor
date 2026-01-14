<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sitio extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sitios';

    protected $fillable = [
        'organizacion_id',
        'nombre',
        'codigo',
        'ubicacion',
        'latitud',
        'longitud',
        'codigo_municipio_aemet',
        'descripcion',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
        'latitud' => 'float',
        'longitud' => 'float',
    ];

    // Relaciones
    public function organizacion()
    {
        return $this->belongsTo(Organizacion::class);
    }

    public function dispositivos()
    {
        return $this->hasMany(Dispositivo::class);
    }

    public function calculos()
    {
        return $this->hasMany(Calculo::class);
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('activa', true);
    }

    public function scopeDeOrganizacion($query, $organizacionId)
    {
        return $query->where('organizacion_id', $organizacionId);
    }

    // Métodos útiles (mantener de Nave)
    public function ultimaLectura()
    {
        return Lectura::whereHas('dispositivo', function ($query) {
            $query->where('sitio_id', $this->id);
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
