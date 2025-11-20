<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Relación con organizaciones
    public function organizaciones()
    {
        return $this->belongsToMany(Organizacion::class, 'organizacion_user')
            ->withPivot('rol')
            ->withTimestamps();
    }

    // Métodos útiles
    public function organizacionesActivas()
    {
        return $this->organizaciones()->where('activa', true);
    }

    public function esPropietarioOrganizacion($organizacion)
    {
        $organizacionId = $organizacion instanceof Organizacion 
            ? $organizacion->id 
            : $organizacion;
            
        return $this->organizaciones()
            ->where('organizacion_id', $organizacionId)
            ->wherePivot('rol', 'owner')
            ->exists();
    }

    public function puedeGestionarOrganizacion($organizacion)
    {
        $organizacionId = $organizacion instanceof Organizacion 
            ? $organizacion->id 
            : $organizacion;
            
        return $this->organizaciones()
            ->where('organizacion_id', $organizacionId)
            ->whereIn('rol', ['owner', 'admin'])
            ->exists();
    }

    public function rolEnOrganizacion($organizacion)
    {
        $organizacionId = $organizacion instanceof Organizacion 
            ? $organizacion->id 
            : $organizacion;
            
        $pivot = $this->organizaciones()
            ->where('organizacion_id', $organizacionId)
            ->first();
            
        return $pivot ? $pivot->pivot->rol : null;
    }
}
