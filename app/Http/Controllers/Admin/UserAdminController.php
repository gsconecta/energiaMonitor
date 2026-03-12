<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserAdminController extends Controller
{
    public function index(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403, 'No tienes permisos para gestionar usuarios.');
        }

        $query = User::with(['organizaciones' => function ($q) {
            $q->withPivot('rol');
        }]);

        // Búsqueda por nombre o email
        if ($request->filled('busqueda')) {
            $busqueda = $request->busqueda;
            $query->where(function ($q) use ($busqueda) {
                $q->where('name', 'like', "%{$busqueda}%")
                  ->orWhere('email', 'like', "%{$busqueda}%");
            });
        }

        // Filtro por rol global
        if ($request->filled('rol_global')) {
            $query->where('rol_global', $request->rol_global);
        }

        $usuarios = $query->orderBy('name')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'rol_global' => $user->rol_global,
                'created_at' => $user->created_at->translatedFormat('l, j \d\e F \d\e Y'),
                'organizaciones' => $user->organizaciones->map(function ($org) {
                    return [
                        'id' => $org->id,
                        'nombre' => $org->nombre,
                        'rol' => $org->pivot->rol,
                    ];
                }),
            ];
        });

        $organizaciones = Organizacion::activas()->orderBy('nombre')->get(['id', 'nombre']);

        return Inertia::render('Admin/Usuarios/Index', [
            'usuarios' => $usuarios,
            'organizaciones' => $organizaciones,
            'filtros' => [
                'busqueda' => $request->busqueda ?? '',
                'rol_global' => $request->rol_global ?? '',
            ],
        ]);
    }

    public function update(Request $request, User $user)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'rol_global' => 'required|in:cliente,tecnico,admin',
        ]);

        $user->update($validated);

        return back()->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy(User $user)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        // No permitir eliminar al propio usuario
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'No puedes eliminarte a ti mismo.']);
        }

        // Desvincular de todas las organizaciones
        $user->organizaciones()->detach();
        $user->delete();

        return back()->with('success', 'Usuario eliminado correctamente.');
    }

    public function addOrganizacion(Request $request, User $user)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'organizacion_id' => 'required|exists:organizaciones,id',
            'rol' => 'required|in:owner,admin,viewer',
        ]);

        // Verificar que no esté ya asociado
        if ($user->organizaciones()->where('organizacion_id', $validated['organizacion_id'])->exists()) {
            return back()->withErrors(['error' => 'El usuario ya pertenece a esta organización.']);
        }

        $user->organizaciones()->attach($validated['organizacion_id'], [
            'rol' => $validated['rol'],
        ]);

        return back()->with('success', 'Organización asignada correctamente.');
    }

    public function updateOrganizacionRol(Request $request, User $user, Organizacion $organizacion)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'rol' => 'required|in:owner,admin,viewer',
        ]);

        $user->organizaciones()->updateExistingPivot($organizacion->id, [
            'rol' => $validated['rol'],
        ]);

        return back()->with('success', 'Rol actualizado correctamente.');
    }

    public function removeOrganizacion(Request $request, User $user, Organizacion $organizacion)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $user->organizaciones()->detach($organizacion->id);

        return back()->with('success', 'Usuario desvinculado de la organización.');
    }
}
