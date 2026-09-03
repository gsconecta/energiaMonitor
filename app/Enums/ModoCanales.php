<?php

namespace App\Enums;

enum ModoCanales: string
{
    case Circuitos = 'circuitos';
    case Fases = 'fases';

    public function label(): string
    {
        return match ($this) {
            self::Circuitos => 'Circuitos independientes',
            self::Fases => 'Fases de un mismo circuito',
        };
    }

    /** @return list<array{value: string, label: string}> */
    public static function opcionesParaFormulario(): array
    {
        return array_map(fn (self $modo) => ['value' => $modo->value, 'label' => $modo->label()], self::cases());
    }
}
