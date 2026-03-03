<?php

namespace Database\Seeders;

use App\Models\Kpi;
use Illuminate\Database\Seeder;

class KpiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kpis = [
            [
                'name' => 'Energía producida',
                'description' => 'Energía generada por placas solares',
                'color' => '#F59E0B', // Amber
                'icon' => 'Sun',
            ],
            [
                'name' => 'Consumo casa',
                'description' => 'Energía consumida por la vivienda',
                'color' => '#3B82F6', // Blue
                'icon' => 'Home',
            ],
            [
                'name' => 'Energía importada',
                'description' => 'Energía importada de la red eléctrica',
                'color' => '#EF4444', // Red
                'icon' => 'ArrowDownFromLine',
            ],
            [
                'name' => 'Energía exportada',
                'description' => 'Energía exportada a la red eléctrica',
                'color' => '#10B981', // Green
                'icon' => 'ArrowUpFromLine',
            ],
        ];

        foreach ($kpis as $kpi) {
            Kpi::create($kpi);
        }
    }
}
