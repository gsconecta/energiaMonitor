<?php

namespace App\Http\Controllers;

use App\Services\InformeEnergeticoExcelExporter;
use App\Services\InformeEnergeticoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class InformesController extends Controller
{
    public function index(Request $request, InformeEnergeticoService $informes): Response|RedirectResponse
    {
        $payload = $informes->buildReport($request);

        if ($payload instanceof RedirectResponse) {
            return $payload;
        }

        return Inertia::render('Informes/Index', $payload);
    }

    public function export(
        Request $request,
        InformeEnergeticoService $informes,
        InformeEnergeticoExcelExporter $exporter
    ): SymfonyResponse|RedirectResponse {
        $payload = $informes->buildReport($request);

        if ($payload instanceof RedirectResponse) {
            return $payload;
        }

        $file = $exporter->make($payload);

        return response($file['content'], 200, [
            'Content-Type' => $file['content_type'],
            'Content-Disposition' => sprintf('attachment; filename="%s"', $file['filename']),
            'Cache-Control' => 'max-age=0, no-cache, no-store, must-revalidate',
            'Pragma' => 'public',
            'Expires' => '0',
        ]);
    }
}
