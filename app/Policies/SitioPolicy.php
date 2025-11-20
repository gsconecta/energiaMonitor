<?php

namespace App\Policies;

use App\Models\Sitio;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SitioPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Sitio $sitio): bool
    {
        return $sitio->organizacion->tieneUsuario($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true; // Verificar en el controlador según organización
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Sitio $sitio): bool
    {
        $rol = $sitio->organizacion->rolUsuario($user);
        return in_array($rol, ['owner', 'admin', 'member']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Sitio $sitio): bool
    {
        $rol = $sitio->organizacion->rolUsuario($user);
        return in_array($rol, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Sitio $sitio): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Sitio $sitio): bool
    {
        return false;
    }
}
