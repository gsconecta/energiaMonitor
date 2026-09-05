<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarModeloDispositivoRequest;
use App\Models\ModeloDispositivo;
use Inertia\Inertia;

class ModeloDispositivoController extends Controller
{
    public function index()
    {
        $this->autorizar();

        $modelos = ModeloDispositivo::withCount(['dispositivos' => fn ($query) => $query->withTrashed()])
            ->orderBy('fabricante')
            ->orderBy('nombre')
            ->get()
            ->map(fn (ModeloDispositivo $modelo) => $this->aArray($modelo));

        return Inertia::render('Admin/ModelosDispositivo/Index', ['modelos' => $modelos]);
    }

    public function create()
    {
        $this->autorizar();

        return Inertia::render('Admin/ModelosDispositivo/Create', ['opciones' => $this->opciones()]);
    }

    public function store(GuardarModeloDispositivoRequest $request)
    {
        ModeloDispositivo::create($request->validated());

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo creado correctamente.');
    }

    public function edit(ModeloDispositivo $modelo)
    {
        $this->autorizar();
        $modelo->loadCount(['dispositivos' => fn ($query) => $query->withTrashed()]);

        return Inertia::render('Admin/ModelosDispositivo/Edit', [
            'modelo' => $this->aArray($modelo),
            'opciones' => $this->opciones(),
        ]);
    }

    public function update(GuardarModeloDispositivoRequest $request, ModeloDispositivo $modelo)
    {
        $modelo->update($request->validated());

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo actualizado correctamente.');
    }

    public function destroy(ModeloDispositivo $modelo)
    {
        $this->autorizar();

        if (! $modelo->esBorrable()) {
            return back()->withErrors(['error' => 'No se puede eliminar porque hay dispositivos usando este modelo.']);
        }

        $modelo->delete();

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo eliminado correctamente.');
    }

    private function autorizar(): void
    {
        abort_unless(auth()->user()->esAdminOTecnico(), 403);
    }

    private function opciones(): array
    {
        return [
            'drivers' => DriverDispositivo::opcionesParaFormulario(),
            'modos' => ModoCanales::opcionesParaFormulario(),
            'magnitudes' => Magnitud::opcionesParaFormulario(),
        ];
    }

    private function aArray(ModeloDispositivo $modelo): array
    {
        return [
            'id' => $modelo->id,
            'codigo' => $modelo->codigo,
            'fabricante' => $modelo->fabricante,
            'familia' => $modelo->familia,
            'nombre' => $modelo->nombre,
            'driver' => $modelo->driver->value,
            'driver_label' => $modelo->driver->label(),
            'driver_disponible' => $modelo->driver->disponible(),
            'num_canales' => $modelo->num_canales,
            'modo_canales_por_defecto' => $modelo->modo_canales_por_defecto->value,
            'modo_canales_configurable' => $modelo->modo_canales_configurable,
            'magnitudes' => $modelo->magnitudes ?? [],
            'activo' => $modelo->activo,
            'notas' => $modelo->notas,
            'dispositivos_count' => $modelo->dispositivos_count ?? 0,
        ];
    }
}
