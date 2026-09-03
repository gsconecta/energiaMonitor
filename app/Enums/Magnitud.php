<?php

namespace App\Enums;

enum Magnitud: string
{
    case PotenciaActiva = 'potencia_activa';
    case PotenciaReactiva = 'potencia_reactiva';
    case PotenciaAparente = 'potencia_aparente';
    case Tension = 'tension';
    case Corriente = 'corriente';
    case CorrienteNeutro = 'corriente_neutro';
    case FactorPotencia = 'factor_potencia';
    case Frecuencia = 'frecuencia';
    case EnergiaActivaImportada = 'energia_activa_importada';
    case EnergiaActivaExportada = 'energia_activa_exportada';
    case EnergiaReactiva = 'energia_reactiva';
    case Thd = 'thd';

    public function label(): string
    {
        return match ($this) {
            self::PotenciaActiva => 'Potencia activa',
            self::PotenciaReactiva => 'Potencia reactiva',
            self::PotenciaAparente => 'Potencia aparente',
            self::Tension => 'Tensión',
            self::Corriente => 'Corriente',
            self::CorrienteNeutro => 'Corriente de neutro',
            self::FactorPotencia => 'Factor de potencia',
            self::Frecuencia => 'Frecuencia',
            self::EnergiaActivaImportada => 'Energía activa importada',
            self::EnergiaActivaExportada => 'Energía activa exportada',
            self::EnergiaReactiva => 'Energía reactiva',
            self::Thd => 'THD',
        };
    }

    /** @return list<array{value: string, label: string}> */
    public static function opcionesParaFormulario(): array
    {
        return array_map(fn (self $magnitud) => ['value' => $magnitud->value, 'label' => $magnitud->label()], self::cases());
    }
}
