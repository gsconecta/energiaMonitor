<?php

namespace Tests\Support;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;

/** Grafo sintético mínimo para pruebas HTTP, de captura y de integridad. */
final class EnergyScenario
{
    public static function create(): array
    {
        $client = Organizacion::factory()->create();
        $otherClient = Organizacion::factory()->create();
        $site = Sitio::factory()->for($client, 'organizacion')->create();
        $otherSite = Sitio::factory()->for($otherClient, 'organizacion')->create();
        $viewer = User::factory()->create(['email' => 'viewer@example.test', 'rol_global' => 'cliente']);
        $client->users()->attach($viewer, ['rol' => 'viewer']);
        $device = Dispositivo::factory()->for($site, 'sitio')->create();
        $otherDevice = Dispositivo::factory()->for($otherSite, 'sitio')->create();
        foreach ([$device, $otherDevice] as $meter) {
            foreach ([6, 3, 0] as $minutes) {
                Lectura::factory()->create([
                    'dispositivo_id' => $meter->id,
                    'fecha_lectura' => now()->startOfMinute()->subMinutes($minutes),
                    'energia_total_kwh' => 100.125 + (6 - $minutes) * 0.02,
                    'energia_canal_1_kwh' => 100.125 + (6 - $minutes) * 0.02,
                ]);
            }
        }

        return compact('client', 'otherClient', 'site', 'otherSite', 'viewer', 'device', 'otherDevice');
    }
}
