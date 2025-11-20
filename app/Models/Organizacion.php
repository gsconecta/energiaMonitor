<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Organizacion extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'organizaciones';

    protected $fillable = [
        'nombre',
        'codigo',
        'descripcion',
        'activa',
        'configuracion',
    ];

    protected $casts = [
        'activa' => 'boolean',
        'configuracion' => 'array',
    ];

    // Relaciones
    public function users()
    {
        return $this->belongsToMany(User::class, 'organizacion_user')
            ->withPivot('rol')
            ->withTimestamps();
    }

    public function sitios()
    {
        return $this->hasMany(Sitio::class);
    }

    // Scopes
    public function scopeActivas($query)
    {
        return $query->where('activa', true);
    }

    // Métodos útiles
    public function usuariosConRol($rol)
    {
        return $this->users()->wherePivot('rol', $rol);
    }

    public function esPropietario($user)
    {
        return $this->users()
            ->where('user_id', $user->id)
            ->wherePivot('rol', 'owner')
            ->exists();
    }

    public function tieneUsuario($user)
    {
        return $this->users()->where('user_id', $user->id)->exists();
    }

    public function rolUsuario($user)
    {
        $pivot = $this->users()
            ->where('user_id', $user->id)
            ->first();
            
        return $pivot ? $pivot->pivot->rol : null;
    }
}
