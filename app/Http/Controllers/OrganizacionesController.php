<?php

namespace App\Http\Controllers;

use App\Models\Organizacion;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrganizacionesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $organizaciones = auth()->user()
            ->organizacionesActivas()
            ->withCount('sitios')
            ->withCount('users')
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'nombre' => $org->nombre,
                    'codigo' => $org->codigo,
                    'descripcion' => $org->descripcion,
                    'activa' => $org->activa,
                    'rol' => $org->pivot->rol,
                    'sitios_count' => $org->sitios_count,
                    'users_count' => $org->users_count,
                ];
            });

        return Inertia::render('Organizaciones/Index', [
            'organizaciones' => $organizaciones,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Organizaciones/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:255|unique:organizaciones,codigo',
            'descripcion' => 'nullable|string',
        ]);

        $organizacion = Organizacion::create($validated);

        // Asignar usuario actual como owner
        $organizacion->users()->attach(auth()->id(), [
            'rol' => 'owner'
        ]);

        return redirect()
            ->route('organizaciones.show', $organizacion)
            ->with('success', 'Organización creada correctamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(Organizacion $organizacion)
    {
        $this->authorize('view', $organizacion);

        $organizacion->load(['sitios', 'users']);

        return Inertia::render('Organizaciones/Show', [
            'organizacion' => [
                'id' => $organizacion->id,
                'nombre' => $organizacion->nombre,
                'codigo' => $organizacion->codigo,
                'descripcion' => $organizacion->descripcion,
                'activa' => $organizacion->activa,
                'rol' => $organizacion->rolUsuario(auth()->user()),
                'sitios' => $organizacion->sitios->map(fn($s) => [
                    'id' => $s->id,
                    'nombre' => $s->nombre,
                    'codigo' => $s->codigo,
                    'activa' => $s->activa,
                ]),
                'usuarios' => $organizacion->users->map(fn($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'rol' => $u->pivot->rol,
                ]),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Organizacion $organizacion)
    {
        $this->authorize('update', $organizacion);

        return Inertia::render('Organizaciones/Edit', [
            'organizacion' => [
                'id' => $organizacion->id,
                'nombre' => $organizacion->nombre,
                'codigo' => $organizacion->codigo,
                'descripcion' => $organizacion->descripcion,
                'activa' => $organizacion->activa,
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Organizacion $organizacion)
    {
        $this->authorize('update', $organizacion);

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'required|string|max:255|unique:organizaciones,codigo,' . $organizacion->id,
            'descripcion' => 'nullable|string',
            'activa' => 'boolean',
        ]);

        $organizacion->update($validated);

        return redirect()
            ->route('organizaciones.show', $organizacion)
            ->with('success', 'Organización actualizada correctamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Organizacion $organizacion)
    {
        $this->authorize('delete', $organizacion);

        $organizacion->delete();

        return redirect()
            ->route('organizaciones.index')
            ->with('success', 'Organización eliminada correctamente');
    }

    /**
     * Agregar usuario a la organización
     */
    public function agregarUsuario(Request $request, Organizacion $organizacion)
    {
        $this->authorize('gestionarUsuarios', $organizacion);

        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'rol' => 'required|in:admin,member,viewer',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($organizacion->tieneUsuario($user)) {
            return back()->withErrors([
                'email' => 'Este usuario ya pertenece a la organización'
            ]);
        }

        $organizacion->users()->attach($user->id, [
            'rol' => $validated['rol']
        ]);

        return back()->with('success', 'Usuario agregado correctamente');
    }

    /**
     * Actualizar rol de usuario en la organización
     */
    public function actualizarRolUsuario(Request $request, Organizacion $organizacion, User $user)
    {
        $this->authorize('gestionarUsuarios', $organizacion);

        $validated = $request->validate([
            'rol' => 'required|in:owner,admin,member,viewer',
        ]);

        // No permitir cambiar el último owner
        if ($validated['rol'] !== 'owner' && $organizacion->esPropietario($user)) {
            $ownersCount = $organizacion->usuariosConRol('owner')->count();
            if ($ownersCount <= 1) {
                return back()->withErrors([
                    'rol' => 'No se puede cambiar el rol del último propietario'
                ]);
            }
        }

        $organizacion->users()->updateExistingPivot($user->id, [
            'rol' => $validated['rol']
        ]);

        return back()->with('success', 'Rol actualizado correctamente');
    }

    /**
     * Eliminar usuario de la organización
     */
    public function eliminarUsuario(Organizacion $organizacion, User $user)
    {
        $this->authorize('gestionarUsuarios', $organizacion);

        // No permitir eliminar el último owner
        if ($organizacion->esPropietario($user)) {
            $ownersCount = $organizacion->usuariosConRol('owner')->count();
            if ($ownersCount <= 1) {
                return back()->withErrors([
                    'usuario' => 'No se puede eliminar el último propietario'
                ]);
            }
        }

        $organizacion->users()->detach($user->id);

        return back()->with('success', 'Usuario eliminado de la organización');
    }
}
