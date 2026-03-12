<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AlertaUmbral;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\UmbralFuncionamiento;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ControlPanelController extends Controller
{
    public function index(Request $request)
    {
        $request->session()->forget([
            'organizacion_actual_id',
            'sitio_actual_id',
            'is_impersonating',
        ]);

        if (!auth()->user()->esAdminOTecnico()) {
            abort(403, 'No tienes permisos para acceder al Panel de Control Global.');
        }

        $totalOrganizaciones = Organizacion::activas()->count();
        $totalDispositivos = Dispositivo::activos()->count();

        $deadline = Carbon::now()->subMinutes(15);

        $dispositivosOffline = Dispositivo::with(['sitio.organizacion'])
            ->activos()
            ->where(function ($query) {
                $query->whereHas('lecturas', function ($q) {
                    // La ultima lectura se valida despues contra la fecha real.
                })->orWhereDoesntHave('lecturas');
            })
            ->get()
            ->filter(function ($disp) use ($deadline) {
                $ultimaLectura = $disp->lecturas()->orderBy('fecha_lectura', 'desc')->first();

                return !$ultimaLectura || $ultimaLectura->fecha_lectura < $deadline;
            })
            ->map(function ($disp) {
                $ultimaLectura = $disp->lecturas()->orderBy('fecha_lectura', 'desc')->first();

                return [
                    'id' => $disp->id,
                    'nombre' => $disp->nombre,
                    'sitio_nombre' => $disp->sitio->nombre ?? 'N/A',
                    'organizacion_nombre' => $disp->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $disp->sitio->organizacion_id ?? null,
                    'sitio_id' => $disp->sitio_id ?? null,
                    'ultima_conexion' => $ultimaLectura ? $ultimaLectura->fecha_lectura->diffForHumans() : 'Nunca',
                ];
            });

        $alertasPendientes = AlertaUmbral::with(['umbral', 'dispositivo.sitio.organizacion'])
            ->activas()
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($alerta) {
                $metrica = UmbralFuncionamiento::METRICAS[$alerta->metrica] ?? null;
                $unidad = $metrica['unidad'] ?? '';

                return [
                    'id' => $alerta->id,
                    'tipo' => $alerta->umbral->nombre ?? 'Umbral',
                    'mensaje' => sprintf(
                        '%s%s fuera de rango',
                        $metrica['label'] ?? $alerta->metrica,
                        $alerta->canal ? ' - ' . $this->formatearCanal($alerta->canal) : ''
                    ),
                    'severidad' => $alerta->severidad,
                    'canal' => $this->formatearCanal($alerta->canal),
                    'rango' => $this->formatearRango($alerta->valor_minimo, $alerta->valor_maximo, $unidad),
                    'valor_leido' => (string) $alerta->valor_leido,
                    'unidad' => $unidad,
                    'dispositivo_nombre' => $alerta->dispositivo->nombre ?? 'N/A',
                    'organizacion_nombre' => $alerta->dispositivo->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $alerta->dispositivo->sitio->organizacion_id ?? null,
                    'sitio_id' => $alerta->dispositivo->sitio_id ?? null,
                    'lectura_id' => $alerta->lectura_id,
                    'fecha_creacion' => $alerta->created_at->diffForHumans(),
                ];
            });

        $ultimasLecturas = Lectura::with(['dispositivo.sitio.organizacion'])
            ->orderBy('fecha_lectura', 'desc')
            ->take(50)
            ->get()
            ->map(function ($lectura) {
                return [
                    'id' => $lectura->id,
                    'dispositivo_nombre' => $lectura->dispositivo->nombre ?? 'N/A',
                    'sitio_nombre' => $lectura->dispositivo->sitio->nombre ?? 'N/A',
                    'organizacion_nombre' => $lectura->dispositivo->sitio->organizacion->nombre ?? 'N/A',
                    'organizacion_id' => $lectura->dispositivo->sitio->organizacion_id ?? null,
                    'sitio_id' => $lectura->dispositivo->sitio_id ?? null,
                    'fecha_lectura' => $lectura->fecha_lectura->diffForHumans(),
                    'potencia_total_w' => $lectura->potencia_total_w,
                    'estado' => 'ok',
                ];
            });

        return Inertia::render('Admin/ControlPanel', [
            'metricasGlobales' => [
                'total_organizaciones' => $totalOrganizaciones,
                'total_dispositivos' => $totalDispositivos,
                'dispositivos_offline_count' => $dispositivosOffline->count(),
                'alertas_activas_count' => $alertasPendientes->count(),
            ],
            'dispositivosOffline' => $dispositivosOffline->values(),
            'alertasPendientes' => $alertasPendientes,
            'ultimasLecturas' => $ultimasLecturas,
        ]);
    }

    public function resolverAlertaUmbral(AlertaUmbral $alertaUmbral)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        if (!$alertaUmbral->resuelta) {
            $alertaUmbral->resolver();
        }

        return back()->with('success', 'Alerta resuelta correctamente.');
    }

    public function impersonate(Request $request, $organizacionId, $sitioId)
    {
        if (!auth()->user()->esAdminOTecnico()) {
            abort(403);
        }

        $organizacion = Organizacion::findOrFail($organizacionId);
        $sitio = Sitio::findOrFail($sitioId);

        $request->session()->put([
            'organizacion_actual_id' => $organizacion->id,
            'sitio_actual_id' => $sitio->id,
            'is_impersonating' => true,
        ]);

        return redirect()->route('dashboard')->with('success', 'Sesion de soporte iniciada en: ' . $organizacion->nombre);
    }

    private function formatearCanal(?string $canal): string
    {
        return match ($canal) {
            'canal_1' => 'Canal 1',
            'canal_2' => 'Canal 2',
            'canal_3' => 'Canal 3',
            'total' => 'Total',
            null, '' => '',
            default => ucfirst(str_replace('_', ' ', $canal)),
        };
    }

    private function formatearRango($valorMinimo, $valorMaximo, string $unidad): string
    {
        $sufijoUnidad = $unidad ? ' ' . $unidad : '';

        if ($valorMinimo !== null && $valorMaximo !== null) {
            return "{$valorMinimo} - {$valorMaximo}{$sufijoUnidad}";
        }

        if ($valorMinimo !== null) {
            return ">= {$valorMinimo}{$sufijoUnidad}";
        }

        if ($valorMaximo !== null) {
            return "<= {$valorMaximo}{$sufijoUnidad}";
        }

        return 'Sin rango';
    }
}
