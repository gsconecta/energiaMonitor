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
        'tipo_perfil',
        'activa',
        'configuracion',
        'shelly_api_key',
        'shelly_server',
        'credencial_shelly_id',
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

    public function credencialShelly()
    {
        return $this->belongsTo(CredencialShelly::class);
    }

    public function umbrales()
    {
        return $this->belongsToMany(UmbralFuncionamiento::class, 'organizacion_umbral')
            ->withTimestamps();
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
        // Si el valor es null o vacío, devolver null
        if (empty($value)) {
            return null;
        }

        // Siempre intentar descifrar primero (puede estar encriptado con diferentes formatos)
        try {
            // Intentar descifrar el valor
            $decrypted = decrypt($value);
            return $decrypted;
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            // Si falla el descifrado, puede ser porque:
            // 1. El valor no está encriptado (es texto plano)
            // 2. El valor fue encriptado con otra APP_KEY
            // En ambos casos, devolvemos el valor tal cual o null si parece estar corrupto

            // Si el valor parece ser texto plano legible (no muy largo y contiene caracteres alfanuméricos normales)
            // devolverlo tal cual
            if (strlen($value) < 200 && preg_match('/^[a-zA-Z0-9\-_]+$/', $value)) {
                return $value;
            }

            // Si parece estar encriptado pero no se puede descifrar, devolver null
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
        // Priorizar la nueva relación
        if ($this->credencialShelly) {
            return $this->credencialShelly->api_key;
        }

        // Fallback a la clave antigua si aún existe
        return $this->shelly_api_key;
    }

    /**
     * Verificar si la organización tiene una clave API de Shelly configurada
     */
    public function tieneShellyApiKey()
    {
        if ($this->credencial_shelly_id) {
            return true; // Asumimos que si tiene relación asignada, tiene clave
        }
        return !empty($this->shelly_api_key);
    }

    /**
     * Obtener el servidor de Shelly configurado
     */
    public function obtenerShellyServer()
    {
        if ($this->credencialShelly) {
            return $this->credencialShelly->server;
        }
        return $this->shelly_server;
    }

    /**
     * Obtener el valor crudo de shelly_api_key desde la base de datos (para depuración)
     * Este método accede directamente al atributo sin pasar por el accessor
     */
    public function getRawShellyApiKey()
    {
        return $this->attributes['shelly_api_key'] ?? null;
    }
}
