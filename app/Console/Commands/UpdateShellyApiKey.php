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

        $this->info("Actualizando API key para la organización: {$organizacion->nombre} (ID: {$organizacion->id})");

        // Use existing credential or create a new one
        $credencial = $organizacion->credencialShelly;

        if (!$credencial) {
            $this->info("Creando nueva Credencial Shelly para la organización...");
            $credencial = new \App\Models\CredencialShelly();
            $credencial->nombre = "Credencial - " . $organizacion->nombre;
            $credencial->server = $organizacion->shelly_server ?? 'https://api.shelly.cloud'; // Default or existing legacy server
        } else {
            $this->info("Actualizando Credencial Shelly existente: {$credencial->nombre}");
        }

        // Actualizar la API key
        $credencial->api_key = $apiKey;
        $credencial->save();

        if (!$organizacion->credencial_shelly_id) {
            $organizacion->credencial_shelly_id = $credencial->id;
            $organizacion->save();
        }

        $this->info("✓ API key actualizada y asignada correctamente");
        $this->info("  La clave ha sido guardada en la tabla credencial_shellies.");

        // Verificar que se puede leer correctamente
        $verificacion = $organizacion->fresh()->obtenerShellyApiKey();
        if ($verificacion === $apiKey) {
            $this->info("✓ Verificación: La API key se puede leer correctamente a través de la relación");
        } else {
            $this->warn("⚠ Advertencia: La API key no coincide después de guardarla");
        }

        return Command::SUCCESS;
    }
}

