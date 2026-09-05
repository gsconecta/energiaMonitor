<?php

namespace App\Http\Requests;

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class GuardarModeloDispositivoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->esAdminOTecnico() ?? false;
    }

    public function rules(): array
    {
        $reglas = [
            'fabricante' => ['required', 'string', 'max:60'],
            'familia' => ['nullable', 'string', 'max:60'],
            'nombre' => ['required', 'string', 'max:120'],
            'driver' => ['required', Rule::enum(DriverDispositivo::class)],
            'num_canales' => ['required', 'integer', 'between:1,'.Lectura::MAX_CANALES],
            'modo_canales_por_defecto' => ['required', Rule::enum(ModoCanales::class)],
            'modo_canales_configurable' => ['boolean'],
            'magnitudes' => ['array'],
            'magnitudes.*' => [Rule::enum(Magnitud::class), 'distinct'],
            'activo' => ['boolean'],
            'notas' => ['nullable', 'string'],
        ];

        // El código solo se fija en el alta; en edición se ignora lo que llegue.
        if ($this->modeloEnEdicion() === null) {
            $reglas['codigo'] = ['required', 'string', 'max:60', 'alpha_dash', Rule::unique('modelos_dispositivo', 'codigo')];
        }

        return $reglas;
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $modelo = $this->modeloEnEdicion();

            if ($modelo === null || $validator->errors()->isNotEmpty()) {
                return;
            }

            $this->rechazarReduccionDeCanalesEnUso($validator, $modelo);
            $this->rechazarCambioDeDriverConDispositivos($validator, $modelo);
        });
    }

    private function modeloEnEdicion(): ?ModeloDispositivo
    {
        $modelo = $this->route('modelo');

        return $modelo instanceof ModeloDispositivo ? $modelo : null;
    }

    private function rechazarReduccionDeCanalesEnUso(Validator $validator, ModeloDispositivo $modelo): void
    {
        $nuevoTope = (int) $this->input('num_canales');

        if ($nuevoTope >= $modelo->num_canales) {
            return;
        }

        $enConflicto = $modelo->dispositivos()->withTrashed()
            ->where(function ($query) use ($nuevoTope) {
                for ($canal = $nuevoTope + 1; $canal <= Lectura::MAX_CANALES; $canal++) {
                    $query->orWhereNotNull("tipo_canal_{$canal}")->orWhereNotNull("nombre_canal_{$canal}");
                }
            })
            ->pluck('nombre');

        if ($enConflicto->isNotEmpty()) {
            $validator->errors()->add('num_canales', "No se puede bajar a {$nuevoTope} canal(es): tienen canales superiores configurados ".$enConflicto->join(', ').'. Vacía esos canales en los dispositivos primero.');
        }
    }

    private function rechazarCambioDeDriverConDispositivos(Validator $validator, ModeloDispositivo $modelo): void
    {
        if ($this->input('driver') === $modelo->driver->value) {
            return;
        }

        if ($modelo->dispositivos()->withTrashed()->exists()) {
            $validator->errors()->add('driver', 'No se puede cambiar el driver de un modelo que ya tiene dispositivos: crea otro modelo.');
        }
    }
}
