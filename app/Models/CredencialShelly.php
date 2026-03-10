<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class CredencialShelly extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'credencial_shellies';

    protected $fillable = [
        'nombre',
        'server',
        'api_key',
    ];

    /**
     * Accessor para obtener la clave API de Shelly (desencriptada de forma segura)
     */
    public function getApiKeyAttribute($value)
    {
        if (empty($value)) {
            return null;
        }

        try {
            return decrypt($value);
        } catch (\Illuminate\Contracts\Encryption\DecryptException $e) {
            if (strlen($value) < 200 && preg_match('/^[a-zA-Z0-9\-_]+$/', $value)) {
                return $value;
            }
            \Log::warning('No se pudo descifrar api_key para credencial shelly ' . ($this->id ?? 'nueva') . ': ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Mutator para encriptar la clave API de Shelly antes de guardarla
     */
    public function setApiKeyAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['api_key'] = null;
            return;
        }

        $this->attributes['api_key'] = encrypt($value);
    }

    public function organizaciones()
    {
        return $this->hasMany(Organizacion::class);
    }
}
