<?php

namespace App\Enums;

use App\Services\Lectores\LectorDispositivo;
use App\Services\Lectores\ShellyCloudLector;

enum DriverDispositivo: string
{
    case ShellyCloud = 'shelly_cloud';
    case ModbusTcp = 'modbus_tcp';
    case BacnetIp = 'bacnet_ip';

    public function label(): string
    {
        return match ($this) {
            self::ShellyCloud => 'Shelly Cloud',
            self::ModbusTcp => 'Modbus TCP',
            self::BacnetIp => 'BACnet/IP',
        };
    }

    /**
     * Campos de conexión que este driver pide por dispositivo.
     * Shelly Cloud no pide ninguno: usa device_id y la credencial de la organización.
     *
     * @return list<array{nombre: string, etiqueta: string, tipo: string, requerido: bool, default: int|string|null, reglas: list<string>}>
     */
    public function camposConexion(): array
    {
        return match ($this) {
            self::ShellyCloud => [],
            self::ModbusTcp => [
                $this->campoHost(),
                $this->campoPuerto(502),
                ['nombre' => 'unit_id', 'etiqueta' => 'Unidad Modbus', 'tipo' => 'entero', 'requerido' => true, 'default' => 1, 'reglas' => ['required', 'integer', 'between:1,247']],
            ],
            self::BacnetIp => [
                $this->campoHost(),
                $this->campoPuerto(47808),
                ['nombre' => 'device_instance', 'etiqueta' => 'Instancia BACnet', 'tipo' => 'entero', 'requerido' => true, 'default' => null, 'reglas' => ['required', 'integer', 'between:0,4194302']],
            ],
        };
    }

    /** @return array<string, list<string>> reglas de validación con clave `conexion.<campo>` */
    public function reglasConexion(): array
    {
        $reglas = [];

        foreach ($this->camposConexion() as $campo) {
            $reglas["conexion.{$campo['nombre']}"] = $campo['reglas'];
        }

        return $reglas;
    }

    public function lector(): ?LectorDispositivo
    {
        return match ($this) {
            self::ShellyCloud => app(ShellyCloudLector::class),
            self::ModbusTcp, self::BacnetIp => null,
        };
    }

    public function disponible(): bool
    {
        return $this->lector() !== null;
    }

    /** @return array{value: string, label: string, disponible: bool, campos_conexion: array} */
    public function toArray(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->label(),
            'disponible' => $this->disponible(),
            'campos_conexion' => $this->camposConexion(),
        ];
    }

    /** @return list<array{value: string, label: string, disponible: bool, campos_conexion: array}> */
    public static function opcionesParaFormulario(): array
    {
        return array_map(fn (self $driver) => $driver->toArray(), self::cases());
    }

    private function campoHost(): array
    {
        return ['nombre' => 'host', 'etiqueta' => 'Host o IP', 'tipo' => 'texto', 'requerido' => true, 'default' => null, 'reglas' => ['required', 'string', 'max:255']];
    }

    private function campoPuerto(int $porDefecto): array
    {
        return ['nombre' => 'port', 'etiqueta' => 'Puerto', 'tipo' => 'entero', 'requerido' => true, 'default' => $porDefecto, 'reglas' => ['required', 'integer', 'between:1,65535']];
    }
}
