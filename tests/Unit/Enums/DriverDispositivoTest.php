<?php

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Services\Lectores\ShellyCloudLector;
use Tests\TestCase;

uses(TestCase::class);

it('solo shelly_cloud tiene lector disponible', function () {
    expect(DriverDispositivo::ShellyCloud->lector())->toBeInstanceOf(ShellyCloudLector::class)
        ->and(DriverDispositivo::ShellyCloud->disponible())->toBeTrue()
        ->and(DriverDispositivo::ModbusTcp->lector())->toBeNull()
        ->and(DriverDispositivo::ModbusTcp->disponible())->toBeFalse()
        ->and(DriverDispositivo::BacnetIp->lector())->toBeNull()
        ->and(DriverDispositivo::BacnetIp->disponible())->toBeFalse();
});

it('shelly_cloud no pide campos de conexión', function () {
    expect(DriverDispositivo::ShellyCloud->camposConexion())->toBe([])
        ->and(DriverDispositivo::ShellyCloud->reglasConexion())->toBe([]);
});

it('modbus_tcp pide host, puerto y unidad con sus valores por defecto', function () {
    $campos = collect(DriverDispositivo::ModbusTcp->camposConexion())->keyBy('nombre');

    expect($campos->keys()->all())->toBe(['host', 'port', 'unit_id'])
        ->and($campos['host']['requerido'])->toBeTrue()
        ->and($campos['port']['default'])->toBe(502)
        ->and($campos['unit_id']['default'])->toBe(1);

    $reglas = DriverDispositivo::ModbusTcp->reglasConexion();

    expect($reglas)->toHaveKeys(['conexion.host', 'conexion.port', 'conexion.unit_id'])
        ->and($reglas['conexion.host'])->toContain('required')
        ->and($reglas['conexion.unit_id'])->toContain('between:1,247');
});

it('bacnet_ip pide host, puerto e instancia', function () {
    $campos = collect(DriverDispositivo::BacnetIp->camposConexion())->keyBy('nombre');

    expect($campos->keys()->all())->toBe(['host', 'port', 'device_instance'])
        ->and($campos['port']['default'])->toBe(47808)
        ->and($campos['device_instance']['requerido'])->toBeTrue()
        ->and(DriverDispositivo::BacnetIp->reglasConexion()['conexion.device_instance'])->toContain('between:0,4194302');
});

it('expone las opciones para el formulario con etiqueta y disponibilidad', function () {
    $opciones = collect(DriverDispositivo::opcionesParaFormulario())->keyBy('value');

    expect($opciones->keys()->all())->toBe(['shelly_cloud', 'modbus_tcp', 'bacnet_ip'])
        ->and($opciones['shelly_cloud']['label'])->toBe('Shelly Cloud')
        ->and($opciones['shelly_cloud']['disponible'])->toBeTrue()
        ->and($opciones['modbus_tcp']['disponible'])->toBeFalse()
        ->and($opciones['modbus_tcp']['campos_conexion'])->toHaveCount(3);
});

it('define los modos de canal y las magnitudes con etiqueta', function () {
    expect(ModoCanales::Fases->label())->toBe('Fases de un mismo circuito')
        ->and(ModoCanales::Circuitos->label())->toBe('Circuitos independientes')
        ->and(collect(ModoCanales::opcionesParaFormulario())->pluck('value')->all())->toBe(['circuitos', 'fases'])
        ->and(Magnitud::cases())->toHaveCount(12)
        ->and(Magnitud::EnergiaActivaImportada->label())->toBe('Energía activa importada')
        ->and(collect(Magnitud::opcionesParaFormulario())->first())->toHaveKeys(['value', 'label']);
});
