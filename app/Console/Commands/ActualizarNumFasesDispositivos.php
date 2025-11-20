<?php

namespace App\Console\Commands;

use App\Models\Dispositivo;
use Illuminate\Console\Command;

class ActualizarNumFasesDispositivos extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'dispositivos:actualizar-fases 
                            {--dispositivo= : ID del dispositivo específico a actualizar}
                            {--only-null : Solo actualizar dispositivos sin num_fases asignado}
                            {--force : Forzar actualización incluso si ya tiene num_fases}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actualiza el número de fases (1, 2, o 3) de los dispositivos detectándolo automáticamente desde sus lecturas';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Detectando numero de fases en dispositivos...');
        $this->newLine();

        // Obtener dispositivos a procesar
        if ($dispositivoId = $this->option('dispositivo')) {
            $dispositivos = Dispositivo::where('id', $dispositivoId)->get();
            
            if ($dispositivos->isEmpty()) {
                $this->error("No se encontro el dispositivo con ID: {$dispositivoId}");
                return Command::FAILURE;
            }
        } else {
            $query = Dispositivo::activos();
            
            if ($this->option('only-null')) {
                $query->whereNull('num_fases');
            }
            
            $dispositivos = $query->get();
        }

        if ($dispositivos->isEmpty()) {
            $this->warn('No se encontraron dispositivos para actualizar.');
            return Command::SUCCESS;
        }

        $this->info("Procesando {$dispositivos->count()} dispositivo(s)...");
        $this->newLine();

        $actualizados = 0;
        $sinLecturas = 0;
        $sinCambios = 0;
        $errores = 0;

        $bar = $this->output->createProgressBar($dispositivos->count());
        $bar->start();

        foreach ($dispositivos as $dispositivo) {
            try {
                // Verificar si debe actualizarse
                if (!$this->option('force') && $dispositivo->num_fases !== null) {
                    $sinCambios++;
                    $bar->advance();
                    continue;
                }

                // Verificar si tiene lecturas
                if (!$dispositivo->ultimaLectura()) {
                    $sinLecturas++;
                    $bar->advance();
                    continue;
                }

                // Intentar detectar y actualizar
                $numFasesAnterior = $dispositivo->num_fases;
                $actualizado = $dispositivo->actualizarNumFasesAuto();
                $numFasesNuevo = $dispositivo->fresh()->num_fases;

                if ($actualizado || $numFasesNuevo !== $numFasesAnterior) {
                    $actualizados++;
                    $this->newLine();
                    $numFasesAnteriorLabel = $numFasesAnterior ?? 'NULL';
                    $this->line("  ✓ Dispositivo #{$dispositivo->id} ({$dispositivo->nombre}): {$numFasesAnteriorLabel} → {$numFasesNuevo} ({$dispositivo->fases_label})");
                } else {
                    $sinCambios++;
                }
            } catch (\Exception $e) {
                $errores++;
                $this->newLine();
                $this->error("  Error en dispositivo #{$dispositivo->id}: {$e->getMessage()}");
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Resumen
        $this->info('Resumen:');
        $this->table(
            ['Estado', 'Cantidad'],
            [
                ['Actualizados', $actualizados],
                ['Sin lecturas', $sinLecturas],
                ['Sin cambios', $sinCambios],
                ['Errores', $errores],
            ]
        );

        // Estadísticas por número de fases
        if ($actualizados > 0) {
            $this->newLine();
            $this->info('Distribucion por numero de fases:');
            
            $stats = Dispositivo::activos()
                ->selectRaw('num_fases, COUNT(*) as total')
                ->groupBy('num_fases')
                ->orderBy('num_fases')
                ->get()
                ->map(function ($item) {
                    $label = match($item->num_fases) {
                        1 => 'Monofásico',
                        2 => 'Bifásico',
                        3 => 'Trifásico',
                        default => 'No determinado'
                    };
                    return [$label, $item->total];
                });

            $this->table(['Tipo', 'Cantidad'], $stats->toArray());
        }

        return Command::SUCCESS;
    }
}
