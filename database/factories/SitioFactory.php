<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<\App\Models\Sitio> */
class SitioFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organizacion_id' => OrganizacionFactory::new(),
            'nombre' => 'Instalación sintética',
            'codigo' => 'test-site-'.fake()->unique()->uuid(),
            'activa' => true,
        ];
    }
}
