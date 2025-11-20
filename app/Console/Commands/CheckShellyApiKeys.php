<?php

namespace App\Console\Commands;

use App\Models\Organizacion;
use Illuminate\Console\Command;
use Illuminate\Contracts\Encryption\DecryptException;

class CheckShellyApiKeys extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'shelly:check-api-keys';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica el estado de las API keys de Shelly en las organizaciones';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizaciones = Organizacion::all();

        $this->info("Verificando API keys de Shelly para {$organizaciones->count()} organizaciones...\n");

        $table = [];
        
        foreach ($organizaciones as $org) {
            $rawValue = $org->getRawShellyApiKey();
            $decryptedValue = $org->shelly_api_key;
            
            $status = 'OK';
            $note = '';
            
            if (empty($rawValue)) {
                $status = 'VACÍO';
                $note = 'No hay API key configurada';
            } elseif (empty($decryptedValue)) {
                $status = 'ERROR';
                $note = 'No se puede descifrar (posiblemente encriptado con otra APP_KEY)';
            } elseif (!str_starts_with($rawValue, 'eyJ')) {
                $status = 'SIN ENCRIPTAR';
                $note = 'Valor en texto plano (debe ser encriptado)';
            }
            
            $table[] = [
                'ID' => $org->id,
                'Nombre' => $org->nombre,
                'Estado' => $status,
                'Nota' => $note,
                'Raw (primeros 20 chars)' => $rawValue ? substr($rawValue, 0, 20) . '...' : 'NULL',
            ];
        }

        $this->table(
            ['ID', 'Nombre', 'Estado', 'Nota', 'Raw (primeros 20 chars)'],
            $table
        );

        return Command::SUCCESS;
    }
}

