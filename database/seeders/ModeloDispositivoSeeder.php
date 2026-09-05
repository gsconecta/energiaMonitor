<?php

namespace Database\Seeders;

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Models\ModeloDispositivo;
use Illuminate\Database\Seeder;

class ModeloDispositivoSeeder extends Seeder
{
    /**
     * Catálogo inicial. Idempotente: crea por `codigo` lo que falte, sin tocar lo que ya existe.
     *
     * Corregir las magnitudes de un modelo (típicamente los Circutor, sembrados con notas de
     * "confirmar con la hoja de datos") es una edición desde el panel de administración, no un
     * nuevo despliegue: un `php artisan db:seed` en un entorno ya en marcha no debe revertir esas
     * correcciones, ni `activo` ni `notas`. Antes con `updateOrCreate` sí lo hacía, silenciosamente.
     */
    public function run(): void
    {
        foreach ($this->catalogo() as $modelo) {
            ModeloDispositivo::firstOrCreate(['codigo' => $modelo['codigo']], $modelo);
        }
    }

    /** @return list<array<string, mixed>> */
    private function catalogo(): array
    {
        $energias = [Magnitud::EnergiaActivaImportada, Magnitud::EnergiaActivaExportada];
        $basicasPorFase = [Magnitud::PotenciaActiva, Magnitud::Tension, Magnitud::Corriente, Magnitud::FactorPotencia];

        return [
            // `nombre` va sin el fabricante: nombreCompleto() los une ("Shelly Pro 3EM").
            $this->modelo('shelly-3em', 'Shelly', 'EM Gen1', '3EM (SHEM-3)', DriverDispositivo::ShellyCloud, 3, ModoCanales::Fases, true,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, ...$energias]),
            $this->modelo('shelly-pro-3em', 'Shelly', 'Pro EM', 'Pro 3EM', DriverDispositivo::ShellyCloud, 3, ModoCanales::Fases, true,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::CorrienteNeutro, Magnitud::Frecuencia, ...$energias]),
            $this->modelo('shelly-pro-em-50', 'Shelly', 'Pro EM', 'Pro EM 50', DriverDispositivo::ShellyCloud, 2, ModoCanales::Circuitos, false,
                [...$basicasPorFase, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias]),
            $this->modelo('circutor-cvm-mini-mc-itf-bacnet-c2', 'Circutor', 'CVM-MINI', 'CVM-MINI-MC-ITF-BACnet-C2', DriverDispositivo::BacnetIp, 3, ModoCanales::Fases, false,
                [...$basicasPorFase, Magnitud::CorrienteNeutro, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias, Magnitud::EnergiaReactiva, Magnitud::Thd],
                'Magnitudes según documentación general de la familia: confirmar con la hoja de datos antes de implementar el lector.'),
            $this->modelo('circutor-cvm-e3-mini-mc-wieth', 'Circutor', 'CVM-E3-MINI', 'CVM-E3-MINI-MC-WiEth', DriverDispositivo::ModbusTcp, 3, ModoCanales::Fases, false,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias, Magnitud::EnergiaReactiva, Magnitud::Thd],
                'Magnitudes según documentación general de la familia: confirmar con la hoja de datos antes de implementar el lector.'),
        ];
    }

    /** @param list<Magnitud> $magnitudes */
    private function modelo(
        string $codigo,
        string $fabricante,
        string $familia,
        string $nombre,
        DriverDispositivo $driver,
        int $numCanales,
        ModoCanales $modoPorDefecto,
        bool $modoConfigurable,
        array $magnitudes,
        ?string $notas = null,
    ): array {
        return [
            'codigo' => $codigo,
            'fabricante' => $fabricante,
            'familia' => $familia,
            'nombre' => $nombre,
            'driver' => $driver,
            'num_canales' => $numCanales,
            'modo_canales_por_defecto' => $modoPorDefecto,
            'modo_canales_configurable' => $modoConfigurable,
            'magnitudes' => array_map(fn (Magnitud $m) => $m->value, $magnitudes),
            'activo' => true,
            'notas' => $notas,
        ];
    }
}
