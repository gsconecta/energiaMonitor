<?php

namespace App\Console\Commands;

use App\Models\Lectura;
use App\Services\Energia\ContadoresEnergia;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class AuditarContadoresEnergia extends Command
{
    protected $signature = 'energia:auditar-contadores {dispositivo : ID del dispositivo} {desde : Fecha YYYY-MM-DD}';

    protected $description = 'Contrasta contadores de un día sin modificar lecturas ni configuración';

    public function handle(ContadoresEnergia $contadores): int
    {
        $id = (string) $this->argument('dispositivo');
        $fecha = (string) $this->argument('desde');
        if (! ctype_digit($id) || (int) $id < 1 || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            $this->error('Indica un ID positivo y una fecha YYYY-MM-DD.');

            return self::FAILURE;
        }
        try {
            $desde = CarbonImmutable::createFromFormat('!Y-m-d', $fecha, config('app.timezone'));
            if ($desde->format('Y-m-d') !== $fecha) {
                throw new \InvalidArgumentException;
            }
        } catch (\Throwable) {
            $this->error('Fecha inválida.');

            return self::FAILURE;
        }
        $lecturas = Lectura::query()->where('dispositivo_id', (int) $id)
            ->where('fecha_lectura', '>=', $desde)->where('fecha_lectura', '<', $desde->addDay())
            ->orderBy('fecha_lectura')->orderBy('id')->limit(10001)
            ->get(['id', 'dispositivo_id', 'fecha_lectura', 'datos_raw', ...ContadoresEnergia::CAMPOS]);
        if ($lecturas->count() > 10000) {
            $this->error('Límite de 10.000 muestras excedido; no se devuelve un resultado parcial.');

            return self::FAILURE;
        }
        $resultados = [];
        foreach (ContadoresEnergia::CAMPOS as $campo) {
            $resultados[$campo] = $contadores->calcular($lecturas, $campo);
        }
        $this->line(json_encode([
            'muestras' => $lecturas->count(),
            'primera_muestra' => $lecturas->first()?->fecha_lectura?->toIso8601String(),
            'ultima_muestra' => $lecturas->last()?->fecha_lectura?->toIso8601String(),
            'contadores' => $resultados,
        ], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
