<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CredencialShelly;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CredencialShellyController extends Controller
{
    public function index()
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $credenciales = CredencialShelly::withCount('organizaciones')->get()->map(function ($credencial) {
            return [
                'id' => $credencial->id,
                'nombre' => $credencial->nombre,
                'server' => $credencial->server,
                'tiene_api_key' => !empty($credencial->api_key),
                'organizaciones_count' => $credencial->organizaciones_count,
            ];
        });

        return Inertia::render('Admin/CredencialesShelly/Index', [
            'credenciales' => $credenciales,
        ]);
    }

    public function create()
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        return Inertia::render('Admin/CredencialesShelly/Create');
    }

    public function store(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'server' => 'nullable|string|max:255',
            'api_key' => 'nullable|string',
        ]);

        CredencialShelly::create($validated);

        return redirect()->route('admin.credenciales-shelly.index')
            ->with('success', 'Credencial creada correctamente.');
    }

    public function edit(CredencialShelly $credencial)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        return Inertia::render('Admin/CredencialesShelly/Edit', [
            'credencial' => [
                'id' => $credencial->id,
                'nombre' => $credencial->nombre,
                'server' => $credencial->server,
                'tiene_api_key' => !empty($credencial->api_key),
            ]
        ]);
    }

    public function update(Request $request, CredencialShelly $credencial)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'server' => 'nullable|string|max:255',
            'api_key' => 'nullable|string',
        ]);

        // Si la enviaron vacía o con los comodines "***", no la actualizamos
        if (array_key_exists('api_key', $validated)) {
            if ($validated['api_key'] === '***' || ($validated['api_key'] === null && $credencial->api_key)) {
                unset($validated['api_key']);
            }
        }

        $credencial->update($validated);

        return redirect()->route('admin.credenciales-shelly.index')
            ->with('success', 'Credencial actualizada correctamente.');
    }

    public function destroy(CredencialShelly $credencial)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        if ($credencial->organizaciones()->count() > 0) {
            return back()->withErrors(['error' => 'No se puede eliminar porque hay organizaciones usando esta credencial.']);
        }

        $credencial->delete();

        return redirect()->route('admin.credenciales-shelly.index')
            ->with('success', 'Credencial eliminada correctamente.');
    }
}
