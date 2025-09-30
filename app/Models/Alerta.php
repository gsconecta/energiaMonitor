<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Alerta extends Model
{
    use HasFactory;

    protected $fillable = [
        'dispositivo_id',
        'tipo',
        'nivel',
        'titulo',
        'descripcion',
        'valor_medido',
        'valor_umbral',
        'fecha_alerta',
        'fecha_resolucion',
        'resuelta',
        'notas',
    ];

    protected $casts = [
        'fecha_alerta' => 'datetime',
        'fecha_resolucion' => 'datetime',
        'resuelta' => 'boolean',
        'valor_medido' => 'float',
        'valor_umbral' => 'float',
    ];

    // Relaciones
    public function dispositivo()
    {
        return $this->belongsTo(Dispositivo::class);
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('resuelta', false);
    }

    public function scopeResueltas($query)
    {
        return $query->where('resuelta', true);
    }

    public function scopeNivel($query, $nivel)
    {
        return $query->where('nivel', $nivel);
    }

    public function scopeCriticas($query)
    {
        return $query->where('nivel', 'critical');
    }

    // Métodos
    public function resolver($notas = null)
    {
        $this->update([
            'resuelta' => true,
            'fecha_resolucion' => now(),
            'notas' => $notas,
        ]);
    }
}