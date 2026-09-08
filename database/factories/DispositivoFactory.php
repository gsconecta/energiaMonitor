<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<\App\Models\Dispositivo> */
class DispositivoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'sitio_id' => SitioFactory::new(),
            'device_id' => 'test-device-'.fake()->unique()->uuid(),
            'nombre' => 'Medidor sintético',
            'modelo_dispositivo_id' => \App\Models\ModeloDispositivo::where('codigo', 'shelly-pro-3em')->value('id'),
            'num_fases' => 3,
            'modo_canales' => 'circuitos',
            'tipo_canal_1' => 'red_electrica',
            'activo' => true,
        ];
    }
}
