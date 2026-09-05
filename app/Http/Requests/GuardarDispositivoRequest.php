<?php

namespace App\Http\Requests;

use App\Enums\ModoCanales;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validación de alta/edición de dispositivo. Las reglas dependen del modelo elegido:
 * canales por encima de `num_canales` deben llegar vacíos y la conexión sigue al driver.
 */
class GuardarDispositivoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $existente = $this->dispositivoEnEdicion();
        $modelo = $this->modeloElegido();
        $numCanales = $modelo?->num_canales ?? Lectura::MAX_CANALES;

        $reglas = [
            'sitio_id' => ['required', 'exists:sitios,id'],
            'device_id' => [
                'required',
                'string',
                Rule::unique('dispositivos', 'device_id')->ignore($existente?->id)->whereNull('deleted_at'),
            ],
            'nombre' => ['required', 'string', 'max:255'],
            'modelo_dispositivo_id' => [
                'required',
                // Activo, o el modelo que el dispositivo ya tiene asignado. El grupo anidado evita
                // que el OR se combine con el `id = ?` implícito de la regla y valide cualquier modelo.
                Rule::exists('modelos_dispositivo', 'id')->where(function ($query) use ($existente) {
                    $query->where(function ($grupo) use ($existente) {
                        $grupo->where('activo', true);
                        if ($existente?->modelo_dispositivo_id) {
                            $grupo->orWhere('id', $existente->modelo_dispositivo_id);
                        }
                    });
                }),
            ],
            'modo_canales' => ['required', Rule::enum(ModoCanales::class)],
            'num_fases' => ['nullable', 'integer', 'between:1,'.Lectura::MAX_CANALES],
            'ip_local' => ['nullable', 'ip'],
            'firmware' => ['nullable', 'string', 'max:255'],
            'activo' => ['boolean'],
            'conexion' => ['array'],
        ];

        for ($canal = 1; $canal <= Lectura::MAX_CANALES; $canal++) {
            $reglas += $canal <= $numCanales
                ? $this->reglasCanalDisponible($canal)
                : $this->reglasCanalFueraDelModelo($canal);
        }

        // Al crear, la conexión es obligatoria: no hay nada que conservar, y un Circutor sin
        // host sería un agujero. Al editar, solo se valida si la petición trae la clave
        // `conexion` (ausente = no tocar, misma semántica que atributosParaGuardar()): así un
        // formulario parcial que nunca gestiona la conexión —como el panel de nombres/colores
        // de la ficha— no queda bloqueado por campos que no le corresponden. Y si la edición
        // cambia de modelo hacia uno distinto, se valida aunque la petición no traiga `conexion`:
        // de lo contrario, pasar de Shelly Cloud a un Circutor sin enviar la clave dejaría
        // `conexion` vacía sin que ninguna regla lo impidiera (ver atributosParaGuardar()).
        $debeValidarConexion = $existente === null
            || $this->has('conexion')
            || $modelo?->id !== $existente?->modelo_dispositivo_id;

        return $reglas + ($debeValidarConexion ? ($modelo?->driver->reglasConexion() ?? []) : []);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $modelo = $this->modeloElegido();

            if ($modelo === null || $modelo->modo_canales_configurable) {
                return;
            }

            if ($this->input('modo_canales') !== $modelo->modo_canales_por_defecto->value) {
                $validator->errors()->add('modo_canales', "El modelo {$modelo->nombreCompleto()} solo admite el modo «{$modelo->modo_canales_por_defecto->label()}».");
            }
        });
    }

    /**
     * Atributos listos para create()/update(): conexión bajo configuracion.conexion,
     * canales sobrantes vacíos y, en modo fases, tipo e inversión replicados y num_fases fijado.
     *
     * Ausente = no tocar: si la petición no trae la clave `conexion`, se conserva la ya
     * guardada en vez de pisarla con un array vacío. Un formulario que no gestiona la
     * conexión —como el panel rápido de nombres/colores de la ficha— no debe poder borrarla.
     *
     * El dispositivo en edición se obtiene del route binding, igual que en rules(): no se recibe
     * por parámetro para que no puedan desincronizarse (un `update()` que olvidara pasarlo aquí
     * pisaría `configuracion.conexion` con `[]` en silencio).
     */
    public function atributosParaGuardar(): array
    {
        $existente = $this->dispositivoEnEdicion();
        $modelo = $this->modeloElegido();
        $datos = $this->validated();

        $conexion = $this->has('conexion') ? ($datos['conexion'] ?? []) : ($existente?->conexion() ?? []);
        unset($datos['conexion']);
        $datos['configuracion'] = array_merge($existente?->configuracion ?? [], ['conexion' => $conexion]);

        for ($canal = $modelo->num_canales + 1; $canal <= Lectura::MAX_CANALES; $canal++) {
            $datos["nombre_canal_{$canal}"] = null;
            $datos["color_canal_{$canal}"] = null;
            $datos["tipo_canal_{$canal}"] = null;
            $datos["invertir_sentido_canal_{$canal}"] = false;
        }

        if (ModoCanales::from($datos['modo_canales']) === ModoCanales::Fases) {
            for ($canal = 2; $canal <= $modelo->num_canales; $canal++) {
                $datos["tipo_canal_{$canal}"] = $datos['tipo_canal_1'] ?? null;
                $datos["invertir_sentido_canal_{$canal}"] = (bool) ($datos['invertir_sentido_canal_1'] ?? false);
            }
            $datos['num_fases'] = $modelo->num_canales;
        }

        return $datos;
    }

    public function modeloElegido(): ?ModeloDispositivo
    {
        $id = $this->input('modelo_dispositivo_id');

        return $id ? ModeloDispositivo::find($id) : null;
    }

    private function dispositivoEnEdicion(): ?Dispositivo
    {
        $dispositivo = $this->route('dispositivo');

        return $dispositivo instanceof Dispositivo ? $dispositivo : null;
    }

    private function reglasCanalDisponible(int $canal): array
    {
        return [
            "nombre_canal_{$canal}" => ['nullable', 'string', 'max:255'],
            "color_canal_{$canal}" => ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            "tipo_canal_{$canal}" => ['nullable', 'string', 'in:fotovoltaica,red_electrica'],
            "invertir_sentido_canal_{$canal}" => ['boolean'],
        ];
    }

    private function reglasCanalFueraDelModelo(int $canal): array
    {
        return [
            "nombre_canal_{$canal}" => ['prohibited'],
            "color_canal_{$canal}" => ['prohibited'],
            "tipo_canal_{$canal}" => ['prohibited'],
            "invertir_sentido_canal_{$canal}" => ['sometimes', 'declined'],
        ];
    }

    public function messages(): array
    {
        $mensajes = ['modelo_dispositivo_id.required' => 'Elige el modelo del dispositivo.'];

        for ($canal = 1; $canal <= Lectura::MAX_CANALES; $canal++) {
            $mensajes["tipo_canal_{$canal}.prohibited"] = "El modelo elegido no tiene canal {$canal}.";
            $mensajes["nombre_canal_{$canal}.prohibited"] = "El modelo elegido no tiene canal {$canal}.";
            $mensajes["color_canal_{$canal}.prohibited"] = "El modelo elegido no tiene canal {$canal}.";
        }

        return $mensajes;
    }
}
