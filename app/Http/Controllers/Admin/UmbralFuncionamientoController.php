<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Dispositivo;
use App\Models\Organizacion;
use App\Models\UmbralFuncionamiento;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UmbralFuncionamientoController extends Controller
{
    public function index(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $umbrales = UmbralFuncionamiento::with(['organizaciones', 'dispositivos.sitio.organizacion'])
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
                    'hora_inicio' => substr((string) $umbral->hora_inicio, 0, 5),
                    'hora_fin' => substr((string) $umbral->hora_fin, 0, 5),
                    'dias_semana' => $umbral->dias_semana ?? ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'],
                    'organizaciones' => $umbral->organizaciones->map(fn ($org) => [
                        'id' => $org->id,
                        'nombre' => $org->nombre,
                    ]),
                    'dispositivos' => $umbral->dispositivos->map(fn ($dispositivo) => [
                        'id' => $dispositivo->id,
                        'nombre' => $dispositivo->nombre,
                        'sitio_nombre' => $dispositivo->sitio->nombre ?? 'N/A',
                        'organizacion_id' => $dispositivo->sitio->organizacion_id ?? null,
                        'organizacion_nombre' => $dispositivo->sitio->organizacion->nombre ?? 'N/A',
                    ]),
                ];
            });

        $organizaciones = Organizacion::activas()->orderBy('nombre')->get(['id', 'nombre']);
        $dispositivos = Dispositivo::with(['sitio.organizacion'])
            ->activos()
            ->orderBy('nombre')
            ->get()
            ->map(fn ($dispositivo) => [
                'id' => $dispositivo->id,
                'nombre' => $dispositivo->nombre,
                'sitio_nombre' => $dispositivo->sitio->nombre ?? 'N/A',
                'organizacion_id' => $dispositivo->sitio->organizacion_id ?? null,
                'organizacion_nombre' => $dispositivo->sitio->organizacion->nombre ?? 'N/A',
            ]);

        return Inertia::render('Admin/Umbrales/Index', [
            'umbrales' => $umbrales,
            'organizaciones' => $organizaciones,
            'dispositivos' => $dispositivos,
            'metricas' => UmbralFuncionamiento::METRICAS,
        ]);
    }

    public function store(Request $request)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate($this->rules());

        $orgIds = $validated['organizacion_ids'] ?? [];
        $dispositivoIds = $validated['dispositivo_ids'] ?? [];
        unset($validated['organizacion_ids'], $validated['dispositivo_ids']);

        $this->validarRelacionDispositivosOrganizaciones($dispositivoIds, $orgIds);

        $umbral = UmbralFuncionamiento::create($validated);
        $umbral->organizaciones()->sync($orgIds);
        $umbral->dispositivos()->sync($dispositivoIds);

        return back()->with('success', 'Umbral creado correctamente.');
    }

    public function update(Request $request, UmbralFuncionamiento $umbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $validated = $request->validate($this->rules());

        $orgIds = $validated['organizacion_ids'] ?? [];
        $dispositivoIds = $validated['dispositivo_ids'] ?? [];
        unset($validated['organizacion_ids'], $validated['dispositivo_ids']);

        $this->validarRelacionDispositivosOrganizaciones($dispositivoIds, $orgIds);

        $umbral->update($validated);
        $umbral->organizaciones()->sync($orgIds);
        $umbral->dispositivos()->sync($dispositivoIds);

        return back()->with('success', 'Umbral actualizado correctamente.');
    }

    public function destroy(UmbralFuncionamiento $umbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $umbral->organizaciones()->detach();
        $umbral->dispositivos()->detach();
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

    private function rules(): array
    {
        return [
            'nombre' => 'required|string|max:255',
            'metrica' => 'required|in:' . implode(',', array_keys(UmbralFuncionamiento::METRICAS)),
            'valor_minimo' => 'nullable|numeric|required_without:valor_maximo',
            'valor_maximo' => 'nullable|numeric|required_without:valor_minimo',
            'severidad' => 'required|in:info,warning,critical',
            'notificar_app' => 'boolean',
            'notificar_email' => 'boolean',
            'notificar_telegram' => 'boolean',
            'destinatarios_email' => 'nullable|array',
            'destinatarios_email.*' => 'email',
            'organizacion_ids' => 'nullable|array',
            'organizacion_ids.*' => 'exists:organizaciones,id',
            'dispositivo_ids' => 'nullable|array',
            'dispositivo_ids.*' => 'exists:dispositivos,id',
            'hora_inicio' => 'required|date_format:H:i',
            'hora_fin' => 'required|date_format:H:i',
            'dias_semana' => 'nullable|array',
            'dias_semana.*' => 'in:lun,mar,mie,jue,vie,sab,dom',
        ];
    }

    private function validarRelacionDispositivosOrganizaciones(array $dispositivoIds, array $orgIds): void
    {
        if ($dispositivoIds === [] || $orgIds === []) {
            return;
        }

        $dispositivosFueraDeOrganizacion = Dispositivo::whereIn('id', $dispositivoIds)
            ->whereHas('sitio', function ($query) use ($orgIds) {
                $query->whereNotIn('organizacion_id', $orgIds);
            })
            ->exists();

        if ($dispositivosFueraDeOrganizacion) {
            throw ValidationException::withMessages([
                'dispositivo_ids' => 'Hay dispositivos seleccionados que no pertenecen a las organizaciones asignadas.',
            ]);
        }
    }
}
