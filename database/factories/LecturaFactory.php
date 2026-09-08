<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<\App\Models\Lectura> */
class LecturaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'dispositivo_id' => DispositivoFactory::new(),
            'fecha_lectura' => now()->startOfMinute(),
            'potencia_total_w' => 1200.00,
            'potencia_canal_1_w' => 1200.00,
            'potencia_canal_2_w' => 0,
            'potencia_canal_3_w' => 0,
            'energia_total_kwh' => 100.125,
            'energia_canal_1_kwh' => 100.125,
            'energia_canal_2_kwh' => 0,
            'energia_canal_3_kwh' => 0,
            'voltaje_canal_1' => 230.12,
            'online' => true,
            'datos_raw' => ['fixture' => true, 'source' => 'synthetic'],
        ];
    }
}
