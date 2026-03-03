<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Kpi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class KpiController extends Controller
{
    /**
     * Show the general settings page with KPIs.
     */
    public function edit()
    {
        return Inertia::render('settings/general', [
            'kpis' => Kpi::all(),
        ]);
    }

    /**
     * Store a new KPI.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'color' => 'required|string|max:7',
            'icon' => 'required|string|max:255',
        ]);

        Kpi::create($validated);

        return Redirect::back()->with('success', 'KPI creado correctamente.');
    }

    /**
     * Update the specified KPI.
     */
    public function update(Request $request, Kpi $kpi)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:255',
            'color' => 'required|string|max:7',
            'icon' => 'required|string|max:255',
        ]);

        $kpi->update($validated);

        return Redirect::back()->with('success', 'KPI actualizado correctamente.');
    }

    /**
     * Remove the specified KPI.
     */
    public function destroy(Kpi $kpi)
    {
        $kpi->delete();

        return Redirect::back()->with('success', 'KPI eliminado correctamente.');
    }
}
