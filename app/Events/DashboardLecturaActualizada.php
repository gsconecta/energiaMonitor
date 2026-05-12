<?php

namespace App\Events;

use App\Models\Lectura;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use InvalidArgumentException;

class DashboardLecturaActualizada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $lecturaId;

    public int $dispositivoId;

    public int $sitioId;

    public string $fechaLectura;

    public function __construct(Lectura $lectura)
    {
        $lectura->loadMissing('dispositivo');

        $dispositivo = $lectura->dispositivo;

        if (! $dispositivo) {
            throw new InvalidArgumentException('La lectura no tiene un dispositivo asociado.');
        }

        $this->lecturaId = (int) $lectura->id;
        $this->dispositivoId = (int) $dispositivo->id;
        $this->sitioId = (int) $dispositivo->sitio_id;
        $this->fechaLectura = $lectura->fecha_lectura?->toISOString() ?? now()->toISOString();
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('dashboard.site.'.$this->sitioId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'lectura.actualizada';
    }

    public function broadcastWith(): array
    {
        return [
            'lectura_id' => $this->lecturaId,
            'dispositivo_id' => $this->dispositivoId,
            'sitio_id' => $this->sitioId,
            'fecha_lectura' => $this->fechaLectura,
        ];
    }
}
