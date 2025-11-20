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
        'shelly_api_key',
        'shelly_server',
    ];

    protected $casts = [
        'activa' => 'boolean',
        'configuracion' => 'array',
        // No usar 'encrypted' cast aquí para evitar errores si la clave fue encriptada con otra APP_KEY
        // En su lugar, usaremos un accessor personalizado
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

    /**
     * Accessor para obtener la clave API de Shelly (desencriptada de forma segura)
     */
    public function getShellyApiKeyAttribute($value)
    {
        if (empty($value)) {
            return null;
        }

        try {
            // Intentar descifrar el valor (puede estar encriptado o no)
            // Si está encriptado, decrypt() lo descifrará
            // Si no está encriptado, decrypt() lanzará una excepción
            return decrypt($value);
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            // Si falla el descifrado, puede ser porque:
            // 1. El valor no está encriptado (valor antiguo sin encriptar)
            // 2. El valor fue encriptado con otra APP_KEY
            // En ambos casos, devolvemos null para evitar errores
            \Log::warning('No se pudo descifrar shelly_api_key para organización ' . ($this->id ?? 'nueva') . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Mutator para encriptar la clave API de Shelly antes de guardarla
     */
    public function setShellyApiKeyAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['shelly_api_key'] = null;
            return;
        }

        // Encriptar el valor antes de guardarlo
        $this->attributes['shelly_api_key'] = encrypt($value);
    }

    /**
     * Obtener la clave API de Shelly (desencriptada)
     * Útil para hacer llamadas a la API de Shelly
     */
    public function obtenerShellyApiKey()
    {
        return $this->shelly_api_key;
    }

    /**
     * Verificar si la organización tiene una clave API de Shelly configurada
     */
    public function tieneShellyApiKey()
    {
        return !empty($this->shelly_api_key);
    }

    /**
     * Obtener el servidor de Shelly configurado
     */
    public function obtenerShellyServer()
    {
        return $this->shelly_server;
    }
}
