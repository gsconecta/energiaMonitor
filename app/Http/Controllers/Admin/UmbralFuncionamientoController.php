<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UmbralFuncionamiento;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UmbralFuncionamientoController extends Controller
{
    public function index(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $umbrales = UmbralFuncionamiento::with('organizaciones')
            ->orderBy('nombre')
            ->get()
            ->map(function ($umbral) {
                return [
                    'id' => $umbral->id,
                    'nombre' => $umbral->nombre,
                    'metrica' => $umbral->metrica,
                    'valor_minimo' => $umbral->valor_minimo,
                    'valor_maximo' => $umbral->valor_maximo,
                    'severidad' => $umbral->severidad,
                    'activo' => $umbral->activo,
                    'notificar_app' => $umbral->notificar_app,
                    'notificar_email' => $umbral->notificar_email,
                    'notificar_telegram' => $umbral->notificar_telegram,
                    'destinatarios_email' => $umbral->destinatarios_email ?? [],
                    'organizaciones' => $umbral->organizaciones->map(fn($org) => [
                        'id' => $org->id,
                        'nombre' => $org->nombre,
                    ]),
                ];
            });

        $organizaciones = Organizacion::activas()->orderBy('nombre')->get(['id', 'nombre']);

        return Inertia::render('Admin/Umbrales/Index', [
            'umbrales' => $umbrales,
            'organizaciones' => $organizaciones,
            'metricas' => UmbralFuncionamiento::METRICAS,
        ]);
    }

    public function store(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'metrica' => 'required|in:' . implode(',', array_keys(UmbralFuncionamiento::METRICAS)),
            'valor_minimo' => 'nullable|numeric',
            'valor_maximo' => 'nullable|numeric',
            'severidad' => 'required|in:info,warning,critical',
            'notificar_app' => 'boolean',
            'notificar_email' => 'boolean',
            'notificar_telegram' => 'boolean',
            'destinatarios_email' => 'nullable|array',
            'destinatarios_email.*' => 'email',
            'organizacion_ids' => 'nullable|array',
            'organizacion_ids.*' => 'exists:organizaciones,id',
        ]);

        $orgIds = $validated['organizacion_ids'] ?? [];
        unset($validated['organizacion_ids']);

        $umbral = UmbralFuncionamiento::create($validated);
        $umbral->organizaciones()->sync($orgIds);

        return back()->with('success', 'Umbral creado correctamente.');
    }

    public function update(Request $request, UmbralFuncionamiento $umbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'metrica' => 'required|in:' . implode(',', array_keys(UmbralFuncionamiento::METRICAS)),
            'valor_minimo' => 'nullable|numeric',
            'valor_maximo' => 'nullable|numeric',
            'severidad' => 'required|in:info,warning,critical',
            'notificar_app' => 'boolean',
            'notificar_email' => 'boolean',
            'notificar_telegram' => 'boolean',
            'destinatarios_email' => 'nullable|array',
            'destinatarios_email.*' => 'email',
            'organizacion_ids' => 'nullable|array',
            'organizacion_ids.*' => 'exists:organizaciones,id',
        ]);

        $orgIds = $validated['organizacion_ids'] ?? [];
        unset($validated['organizacion_ids']);

        $umbral->update($validated);
        $umbral->organizaciones()->sync($orgIds);

        return back()->with('success', 'Umbral actualizado correctamente.');
    }

    public function destroy(UmbralFuncionamiento $umbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $umbral->organizaciones()->detach();
        $umbral->delete();

        return back()->with('success', 'Umbral eliminado correctamente.');
    }

    public function toggleActivo(UmbralFuncionamiento $umbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $umbral->update(['activo' => !$umbral->activo]);

        return back()->with('success', $umbral->activo ? 'Umbral activado.' : 'Umbral desactivado.');
    }
}
