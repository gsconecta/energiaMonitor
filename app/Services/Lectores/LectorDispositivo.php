<?php

namespace App\Services\Lectores;

use App\Models\Dispositivo;

interface LectorDispositivo
{
    /**
     * Devuelve los atributos normalizados listos para Lectura::create().
     *
     * @return array<string, mixed>
     *
     * @throws LecturaNoDisponible cuando el equipo no puede leerse (fuera de línea,
     *                             respuesta inválida, formato desconocido, sin credencial)
     */
    public function leer(Dispositivo $dispositivo, int $timeoutSegundos = 10): array;

    /** Milisegundos a esperar entre dos lecturas consecutivas con este lector. */
    public function pausaEntreLecturasMs(): int;
}
