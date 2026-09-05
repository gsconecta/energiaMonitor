export type ModoCanales = 'circuitos' | 'fases';

/**
 * Un canal está disponible cuando su número no supera el nº de canales del modelo elegido: los
 * que sobran deben anularse explícitamente en el payload, porque el servidor los rechaza si
 * llegan con datos (ver GuardarDispositivoRequest::reglasCanalFueraDelModelo()).
 */
export function canalDisponible(canal: number, numCanales: number): boolean {
    return canal <= numCanales;
}

/**
 * Nombre que propone el backend (Dispositivo::getNombreCanal()) cuando el canal no tiene nombre
 * guardado: `L1`/`L2`/`L3` en modo fases, `Canal N` en modo circuitos. Se usa como placeholder
 * mientras se edita y como texto a mostrar cuando el campo está vacío, para que guardar sin tocar
 * nada no escriba ese literal en base de datos y el backend pueda seguir proponiéndolo.
 */
export function nombreCanalPropuesto(
    numero: number,
    modoCanales: ModoCanales,
): string {
    return modoCanales === 'fases' ? `L${numero}` : `Canal ${numero}`;
}
