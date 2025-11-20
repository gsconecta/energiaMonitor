<?php

namespace App\Policies;

use App\Models\Organizacion;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class OrganizacionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Todos los usuarios pueden ver sus organizaciones
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Organizacion $organizacion): bool
    {
        // Verificar que el usuario pertenece a la organización usando la relación
        return $organizacion->users()
            ->where('users.id', $user->id)
            ->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true; // Todos pueden crear organizaciones
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Organizacion $organizacion): bool
    {
        $rol = $organizacion->rolUsuario($user);
        return in_array($rol, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Organizacion $organizacion): bool
    {
        return $organizacion->esPropietario($user);
    }

    /**
     * Determine whether the user can manage users in the organization.
     */
    public function gestionarUsuarios(User $user, Organizacion $organizacion): bool
    {
        $rol = $organizacion->rolUsuario($user);
        return in_array($rol, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Organizacion $organizacion): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Organizacion $organizacion): bool
    {
        return false;
    }
}
