<?php

namespace Tests\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Esquema mínimo y compartido para los tests de dispositivos, modelos y lecturas.
 * Las migraciones antiguas del proyecto no son fiables en SQLite, por eso se crea a mano.
 */
class EsquemaDispositivos
{
    private const TABLAS = [
        'lecturas', 'dispositivos', 'modelos_dispositivo', 'sitios',
        'organizacion_user', 'credencial_shellies', 'organizaciones', 'users',
    ];

    public static function crear(): void
    {
        self::eliminar();

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('rol_global', ['cliente', 'tecnico', 'admin'])->default('cliente');
            $table->rememberToken()->nullable();
            $table->timestamps();
        });

        Schema::create('credencial_shellies', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('server')->nullable();
            $table->text('api_key')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('organizaciones', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('codigo')->nullable();
            $table->string('tipo_perfil')->default('industrial');
            $table->boolean('activa')->default(true);
            $table->text('shelly_api_key')->nullable();
            $table->string('shelly_server')->nullable();
            $table->unsignedBigInteger('credencial_shelly_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('organizacion_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizacion_id');
            $table->unsignedBigInteger('user_id');
            $table->string('rol')->default('viewer');
            $table->timestamps();
        });

        Schema::create('sitios', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizacion_id');
            $table->string('nombre');
            $table->string('codigo')->nullable();
            $table->boolean('activa')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('modelos_dispositivo', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 60)->unique();
            $table->string('fabricante', 60);
            $table->string('familia', 60)->nullable();
            $table->string('nombre', 120);
            $table->string('driver', 30);
            $table->unsignedTinyInteger('num_canales');
            $table->string('modo_canales_por_defecto', 20);
            $table->boolean('modo_canales_configurable')->default(false);
            $table->json('magnitudes')->nullable();
            $table->boolean('activo')->default(true);
            $table->text('notas')->nullable();
            $table->timestamps();
        });

        Schema::create('dispositivos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sitio_id');
            $table->unsignedBigInteger('modelo_dispositivo_id')->nullable();
            $table->string('device_id')->unique();
            $table->string('nombre');
            $table->string('modelo_legacy')->nullable();
            $table->string('modo_canales', 20)->default('circuitos');
            $table->string('ip_local')->nullable();
            $table->string('firmware')->nullable();
            $table->boolean('activo')->default(true);
            $table->unsignedTinyInteger('num_fases')->nullable();
            foreach ([1, 2, 3] as $canal) {
                $table->string("nombre_canal_{$canal}")->nullable();
                $table->string("color_canal_{$canal}")->nullable();
                $table->string("tipo_canal_{$canal}", 20)->nullable();
                $table->boolean("invertir_sentido_canal_{$canal}")->default(false);
            }
            $table->json('configuracion')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('lecturas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dispositivo_id');
            $table->timestamp('fecha_lectura');
            foreach (['potencia_total_w', 'potencia_canal_1_w', 'potencia_canal_2_w', 'potencia_canal_3_w',
                'reactiva_canal_1_var', 'reactiva_canal_2_var', 'reactiva_canal_3_var', 'reactiva_total_var',
                'energia_total_kwh', 'energia_retornada_kwh', 'energia_canal_1_kwh', 'energia_canal_2_kwh', 'energia_canal_3_kwh',
                'voltaje_canal_1', 'voltaje_canal_2', 'voltaje_canal_3', 'voltaje_promedio',
                'corriente_canal_1', 'corriente_canal_2', 'corriente_canal_3', 'corriente_neutro',
                'pf_canal_1', 'pf_canal_2', 'pf_canal_3'] as $columna) {
                $table->decimal($columna, 12, 3)->nullable();
            }
            $table->boolean('online')->default(true);
            $table->boolean('wifi_conectado')->default(true);
            $table->integer('wifi_rssi')->nullable();
            $table->integer('uptime_segundos')->nullable();
            $table->json('datos_raw')->nullable();
            $table->timestamps();
        });
    }

    public static function eliminar(): void
    {
        foreach (self::TABLAS as $tabla) {
            Schema::dropIfExists($tabla);
        }
    }
}
