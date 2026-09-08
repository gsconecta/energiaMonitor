<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<\App\Models\Organizacion> */
class OrganizacionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre' => 'Cliente sintético',
            'codigo' => 'test-org-'.fake()->unique()->uuid(),
            'tipo_perfil' => 'industrial',
            'activa' => true,
        ];
    }
}
