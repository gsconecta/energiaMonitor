<?php

namespace App\Console\Commands;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Services\EvaluadorUmbrales;
use App\Services\Lectores\LectorDispositivo;
use App\Services\Lectores\LecturaNoDisponible;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class ObtenerLecturas extends Command
{
    protected $signature = 'lecturas:obtener
                            {--dispositivo= : ID del dispositivo específico}
                            {--timeout=10 : Timeout en segundos para cada lectura}';

    protected $aliases = ['shelly:obtener-lecturas'];

    protected $description = 'Obtiene una lectura de cada dispositivo activo a través del lector de su modelo y la guarda';

    private int $exitosos = 0;

    private int $errores = 0;

    private int $omitidos = 0;

    private int $fasesActualizadas = 0;

    /** @var array<string, true> drivers sin lector ya avisados en esta ejecución */
    private array $driversAvisados = [];

    public function handle(EvaluadorUmbrales $evaluador): int
    {
        $dispositivoId = $this->option('dispositivo');
        $timeout = (int) $this->option('timeout');

        $dispositivos = $this->dispositivosALeer($dispositivoId);

        if ($dispositivos->isEmpty()) {
            $this->warn('No hay dispositivos activos que leer.');

            return $dispositivoId ? self::FAILURE : self::SUCCESS;
        }

        $this->info("Procesando {$dispositivos->count()} dispositivo(s)...");

        foreach ($dispositivos->values() as $indice => $dispositivo) {
            $this->line("Procesando: {$dispositivo->nombre} ({$dispositivo->device_id})");

            $lector = $dispositivo->driver()->lector();

            if ($lector === null) {
                $this->omitir($dispositivo);

                continue;
            }

            $this->leerYGuardar($dispositivo, $lector, $timeout, $evaluador);

            if ($indice < $dispositivos->count() - 1) {
                usleep($lector->pausaEntreLecturasMs() * 1000);
            }
        }

        $this->mostrarResumen();

        return $this->codigoDeSalida(unSoloDispositivo: (bool) $dispositivoId);
    }

    private function dispositivosALeer(?string $dispositivoId): Collection
    {
        $query = Dispositivo::with(['sitio.organizacion.credencialShelly', 'modeloDispositivo'])
            ->activos()
            ->whereHas('sitio.organizacion', fn ($q) => $q->where('activa', true))
            ->orderBy('id');

        if ($dispositivoId) {
            $query->where('id', $dispositivoId);
        }

        return $query->get();
    }

    private function leerYGuardar(Dispositivo $dispositivo, LectorDispositivo $lector, int $timeout, EvaluadorUmbrales $evaluador): void
    {
        try {
            $lectura = Lectura::create($lector->leer($dispositivo, $timeout));

            $alertas = $evaluador->evaluar($lectura, $dispositivo);
            if ($alertas !== []) {
                $this->warn('  ⚠️  '.count($alertas).' alerta(s) de umbral generada(s)');
            }

            if ($dispositivo->actualizarNumFasesAuto()) {
                $this->fasesActualizadas++;
            }

            Log::channel('shelly_readings')->info("Lectura exitosa para dispositivo {$dispositivo->id} ({$dispositivo->device_id})");
            $this->info('  ✅ Lectura guardada');
            $this->exitosos++;
        } catch (LecturaNoDisponible $e) {
            $this->warn("  ❌ Sin lectura: {$e->getMessage()}");
            Log::channel('shelly_readings')->warning("Lectura no disponible para dispositivo {$dispositivo->id} ({$dispositivo->device_id}): {$e->getMessage()}");
            $this->errores++;
        } catch (Throwable $e) {
            $this->error("  ❌ Error: {$e->getMessage()}");
            Log::channel('shelly_readings')->error("Error obteniendo lectura del dispositivo {$dispositivo->id}", [
                'dispositivo_id' => $dispositivo->id,
                'device_id' => $dispositivo->device_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->errores++;
        }
    }

    private function omitir(Dispositivo $dispositivo): void
    {
        $driver = $dispositivo->driver();

        if (! isset($this->driversAvisados[$driver->value])) {
            Log::channel('shelly_readings')->warning("Driver {$driver->label()} sin lector disponible: se omiten sus dispositivos");
            $this->driversAvisados[$driver->value] = true;
        }

        $this->line("  ⏭️  Omitido: el modelo usa {$driver->label()}, que aún no tiene lector disponible");
        $this->omitidos++;
    }

    private function mostrarResumen(): void
    {
        $this->newLine();
        $this->info('Resumen:');
        $this->table(['Estado', 'Cantidad'], [
            ['✅ Exitosos', $this->exitosos],
            ['❌ Errores', $this->errores],
            ['⏭️ Omitidos (sin lector)', $this->omitidos],
            ['🔄 Fases actualizadas', $this->fasesActualizadas],
        ]);
    }

    /**
     * Con --dispositivo, fallo si ese equipo no se leyó. En ejecución completa, fallo solo si hubo
     * errores y ningún éxito: una ejecución con todo omitido es SUCCESS para no disparar onFailure
     * cada tres minutos por modelos que aún no tienen lector.
     */
    private function codigoDeSalida(bool $unSoloDispositivo): int
    {
        if ($unSoloDispositivo) {
            return $this->exitosos === 1 ? self::SUCCESS : self::FAILURE;
        }

        return ($this->errores > 0 && $this->exitosos === 0) ? self::FAILURE : self::SUCCESS;
    }
}
