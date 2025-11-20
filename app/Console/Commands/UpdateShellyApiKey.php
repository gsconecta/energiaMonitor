<?php

namespace App\Console\Commands;

use App\Models\Organizacion;
use Illuminate\Console\Command;

class UpdateShellyApiKey extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'shelly:update-api-key {organizacion_id} {api_key}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Actualiza la API key de Shelly para una organización';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizacionId = $this->argument('organizacion_id');
        $apiKey = $this->argument('api_key');

        $organizacion = Organizacion::find($organizacionId);

        if (!$organizacion) {
            $this->error("No se encontró la organización con ID: {$organizacionId}");
            return Command::FAILURE;
        }

        $this->info("Actualizando API key para: {$organizacion->nombre} (ID: {$organizacion->id})");

        // Actualizar la API key (el mutator la encriptará automáticamente)
        $organizacion->shelly_api_key = $apiKey;
        $organizacion->save();

        $this->info("✓ API key actualizada correctamente");
        $this->info("  La clave ha sido encriptada y guardada en la base de datos.");

        // Verificar que se puede leer correctamente
        $verificacion = $organizacion->fresh()->shelly_api_key;
        if ($verificacion === $apiKey) {
            $this->info("✓ Verificación: La API key se puede leer correctamente");
        } else {
            $this->warn("⚠ Advertencia: La API key no coincide después de guardarla");
        }

        return Command::SUCCESS;
    }
}

