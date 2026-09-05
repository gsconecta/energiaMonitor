<?php

namespace App\Services\Dispositivos;

use App\Enums\ModoCanales;
use App\Models\ModeloDispositivo;
use Illuminate\Support\Facades\DB;

/**
 * Asigna a cada dispositivo el modelo del catálogo que corresponde a su texto antiguo.
 * Trabaja con el query builder para incluir los dispositivos eliminados y no disparar eventos.
 */
class AsignadorModeloLegado
{
    private const CODIGO_POR_TEXTO = [
        'shem-3' => 'shelly-3em',
        'shelly em3' => 'shelly-3em',
        'shelly pro 3em' => 'shelly-pro-3em',
        'shelly pro em 50' => 'shelly-pro-em-50',
    ];

    public function codigoPara(?string $modeloLegacy): ?string
    {
        $clave = mb_strtolower(trim((string) $modeloLegacy));

        return self::CODIGO_POR_TEXTO[$clave] ?? null;
    }

    /**
     * Asigna modelo solo a quien todavía no tiene uno. El filtro `whereNull('modelo_dispositivo_id')`
     * es un no-op en su única llamada real (la migración: la columna se acaba de crear, todo el
     * parque está sin modelo), pero como el método es público, protege una llamada futura: sin él,
     * `modo_canales` se pisaría a `circuitos` en todos los dispositivos, incluidos los que ya
     * tienen modelo asignado y se hayan pasado a `fases` desde el panel.
     *
     * @return array{asignados: int, sin_modelo: int}
     */
    public function asignarTodos(): array
    {
        return DB::transaction(function () {
            $idPorCodigo = ModeloDispositivo::query()->pluck('id', 'codigo');
            $resultado = ['asignados' => 0, 'sin_modelo' => 0];

            $dispositivosSinModelo = DB::table('dispositivos')
                ->whereNull('modelo_dispositivo_id')
                ->get(['id', 'modelo_legacy']);

            foreach ($dispositivosSinModelo as $fila) {
                $codigo = $this->codigoPara($fila->modelo_legacy);
                $modeloId = $codigo !== null ? $idPorCodigo->get($codigo) : null;

                DB::table('dispositivos')->where('id', $fila->id)->update([
                    'modelo_dispositivo_id' => $modeloId,
                    'modo_canales' => ModoCanales::Circuitos->value,
                ]);

                $resultado[$modeloId !== null ? 'asignados' : 'sin_modelo']++;
            }

            return $resultado;
        });
    }
}
