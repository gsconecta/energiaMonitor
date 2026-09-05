# Catálogo de modelos de dispositivo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un catálogo de modelos de dispositivo compatibles (identidad, capacidades y driver de captura) gestionado desde `/admin`, del que cuelga cada dispositivo, y enrutar el colector de lecturas por el driver del modelo.

**Architecture:** Una tabla `modelos_dispositivo` con el `driver` validado contra un enum PHP; `dispositivos` gana `modelo_dispositivo_id`, `modo_canales` y la conexión en `configuracion.conexion`. El código Shelly del comando actual se extrae a `ShellyCloudLector` tras una interfaz `LectorDispositivo`; el comando pasa a `lecturas:obtener` y resuelve el lector por el driver del modelo. CRUD admin calcado del de credenciales Shelly; el formulario de dispositivo se adapta al modelo elegido.

**Tech Stack:** Laravel 12 (PHP ^8.2), Pest 4, Inertia 2 + React 19 + TypeScript, shadcn/ui, MariaDB 10.11 en producción y SQLite en memoria en tests.

**Spec:** `docs/superpowers/specs/2026-09-03-catalogo-modelos-dispositivo-design.md`

## Global Constraints

- Rama de trabajo: `feature/catalogo-modelos-dispositivo` (ya creada, con el spec como primer commit).
- Tope de canales: `Lectura::MAX_CANALES = 3`; toda validación de canales usa esa constante.
- Drivers cerrados en código: `shelly_cloud`, `modbus_tcp`, `bacnet_ip`. Solo `shelly_cloud` tiene lector.
- Los tests de `tests/Unit` no usan `RefreshDatabase`: crean el esquema a mano en `beforeEach` (varias migraciones antiguas son stubs). Las tablas nuevas y las columnas nuevas de `dispositivos` se crean SIEMPRE con `Tests\Support\EsquemaDispositivos` (Tarea 3), nunca repitiendo `Schema::create` en el fichero de test.
- Los controladores admin comprueban `auth()->user()->esAdminOTecnico()` en cada acción con `abort(403)`; los mensajes de usuario van en español.
- Ejecutar tests con `php artisan test --filter=<Nombre>`; tipos y lint del frontend con `npm run types` y `npm run lint`.
- Commits pequeños, uno por tarea como mínimo, con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Nada de este plan cambia `lecturas` ni la cadencia del colector.

---

## Mapa de ficheros

**Nuevos**

| Fichero | Responsabilidad |
|---|---|
| `app/Services/Lectores/LectorDispositivo.php` | Interfaz de lector: `leer()` y `pausaEntreLecturasMs()` |
| `app/Services/Lectores/LecturaNoDisponible.php` | Excepción con motivo legible |
| `app/Services/Lectores/ShellyCloudLector.php` | Petición a Shelly Cloud y normalización de los tres formatos (extraído del comando) |
| `app/Enums/DriverDispositivo.php` | Drivers cerrados: etiqueta, campos de conexión, reglas, lector |
| `app/Enums/ModoCanales.php` | `circuitos` / `fases` |
| `app/Enums/Magnitud.php` | Magnitudes que un modelo puede aportar |
| `app/Models/ModeloDispositivo.php` | Eloquent del catálogo |
| `database/migrations/2026_09_04_000001_create_modelos_dispositivo_table.php` | Tabla del catálogo |
| `database/migrations/2026_09_04_000002_add_modelo_dispositivo_to_dispositivos_table.php` | Columnas nuevas, rename `modelo` → `modelo_legacy`, seed y asignación del legado |
| `database/seeders/ModeloDispositivoSeeder.php` | Catálogo inicial, upsert por `codigo` |
| `app/Services/Dispositivos/AsignadorModeloLegado.php` | Mapea el texto antiguo de modelo a un `codigo` del catálogo |
| `app/Console/Commands/ObtenerLecturas.php` | Comando `lecturas:obtener` (sustituye a `ObtenerLecturasShelly.php`) |
| `app/Http/Controllers/Admin/ModeloDispositivoController.php` | CRUD admin |
| `app/Http/Requests/GuardarModeloDispositivoRequest.php` | Validación y reglas de negocio del catálogo |
| `app/Http/Requests/GuardarDispositivoRequest.php` | Validación de dispositivo según el modelo elegido |
| `resources/js/pages/Admin/ModelosDispositivo/{Index,Create,Edit}.tsx` | Páginas admin |
| `resources/js/components/modelos-dispositivo/formulario-modelo.tsx` | Formulario compartido por Create y Edit |
| `resources/js/components/dispositivos/campos-conexion.tsx` | Bloque «Conexión» generado desde `campos_conexion` |
| `tests/Support/EsquemaDispositivos.php` | Esquema de tests compartido (organizaciones, sitios, dispositivos, modelos, lecturas) |
| `tests/Fixtures/shelly/{pro-3em,pro-em-50,3em-gen1,desconocido}.json` | Respuestas de Shelly Cloud para los tests del lector |

**Modificados**

| Fichero | Cambio |
|---|---|
| `app/Models/Dispositivo.php` | Relación `modeloDispositivo()`, `driver()`, `conexion()`, cast `modo_canales`, `modelo` fuera de `$fillable`, nombres L1/L2/L3 |
| `app/Models/Lectura.php` | `MAX_CANALES` |
| `routes/console.php` | Programa `lecturas:obtener` |
| `routes/web.php` | Recurso `admin/modelos-dispositivo` |
| `routes/api.php` | `modelo` → relación / `modelo_legacy` |
| `app/Http/Controllers/DispositivosController.php` | Usa `GuardarDispositivoRequest`, props `modelos`, relación, `sincronizar` comprueba el código de salida |
| `resources/js/pages/Admin/ControlPanel.tsx` | Botón «Modelos compatibles» |
| `resources/js/pages/Dispositivos/Index.tsx`, `Show.tsx` | Selector de modelo, canales adaptativos, conexión, sincronizar deshabilitado |
| `tests/Unit/DispositivosGlobalPanelTest.php`, `tests/Unit/DashboardContextHeaderDesignTest.php` | Pasan al esquema compartido y al comando nuevo |

---

### Task 1: Contrato de lector y `ShellyCloudLector`

**Files:**
- Create: `app/Services/Lectores/LectorDispositivo.php`
- Create: `app/Services/Lectores/LecturaNoDisponible.php`
- Create: `app/Services/Lectores/ShellyCloudLector.php`
- Create: `tests/Fixtures/shelly/pro-3em.json`, `tests/Fixtures/shelly/pro-em-50.json`, `tests/Fixtures/shelly/3em-gen1.json`, `tests/Fixtures/shelly/desconocido.json`
- Test: `tests/Unit/Lectores/ShellyCloudLectorTest.php`
- Reference (solo lectura, se copia de aquí): `app/Console/Commands/ObtenerLecturasShelly.php:154-517`

**Interfaces:**
- Produces: `LectorDispositivo::leer(Dispositivo $dispositivo, int $timeoutSegundos = 10): array`, `LectorDispositivo::pausaEntreLecturasMs(): int`, `LecturaNoDisponible extends \RuntimeException`, `ShellyCloudLector implements LectorDispositivo`.
- Consumes: `Dispositivo->sitio->organizacion` con `obtenerShellyServer()`, `obtenerShellyApiKey()` y `tieneShellyApiKey()` (existen en `app/Models/Organizacion.php:140-175`).

Esta tarea todavía no tiene el esquema compartido (llega en la Tarea 3), así que el test crea a mano las tres tablas que necesita. En la Tarea 3 se sustituirá ese `beforeEach` por el helper.

- [ ] **Step 1: Crear los fixtures de Shelly Cloud**

`tests/Fixtures/shelly/pro-3em.json` (formato `em:0`, trifásico):

```json
{"isok":true,"data":{"online":true,"device_status":{"ts":1756900000,"em:0":{"id":0,"a_current":2.5,"a_voltage":230.1,"a_act_power":500.0,"a_aprt_power":575.0,"a_pf":0.87,"a_freq":50.0,"b_current":1.0,"b_voltage":231.0,"b_act_power":200.0,"b_aprt_power":231.0,"b_pf":0.86,"c_current":0.5,"c_voltage":229.5,"c_act_power":100.0,"c_aprt_power":114.75,"c_pf":0.87,"n_current":0.3,"total_act_power":800.0,"total_aprt_power":920.75},"emdata:0":{"id":0,"a_total_act_energy":1000.5,"a_total_act_ret_energy":10.0,"b_total_act_energy":500.25,"b_total_act_ret_energy":5.0,"c_total_act_energy":250.125,"c_total_act_ret_energy":2.5,"total_act":1750.875,"total_act_ret":17.5},"wifi":{"sta_ip":"192.168.1.20","status":"got ip","rssi":-55},"sys":{"uptime":86400,"unixtime":1756900000}}}}
```

`tests/Fixtures/shelly/pro-em-50.json` (formato `em1:x`, dos canales):

```json
{"isok":true,"data":{"online":true,"device_status":{"ts":1756900000,"em1:0":{"id":0,"current":3.0,"voltage":230.0,"act_power":690.0,"aprt_power":690.0,"pf":1.0,"freq":50.0,"calibration":"factory"},"em1:1":{"id":1,"current":1.0,"voltage":230.0,"act_power":-230.0,"aprt_power":230.0,"pf":-1.0,"freq":50.0,"calibration":"factory"},"em1data:0":{"id":0,"total_act_energy":120.5,"total_act_ret_energy":0.0},"em1data:1":{"id":1,"total_act_energy":10.0,"total_act_ret_energy":80.25},"wifi":{"sta_ip":"192.168.1.21","status":"got ip","rssi":-60},"sys":{"uptime":3600,"unixtime":1756900000}}}}
```

`tests/Fixtures/shelly/3em-gen1.json` (formato `emeters`, energías en Wh):

```json
{"isok":true,"data":{"online":true,"device_status":{"emeters":[{"power":400.0,"pf":0.9,"current":1.9,"voltage":230.0,"is_valid":true,"total":150000.0,"total_returned":2000.0},{"power":300.0,"pf":0.95,"current":1.4,"voltage":231.0,"is_valid":true,"total":80000.0,"total_returned":0.0},{"power":0.0,"pf":0.0,"current":0.0,"voltage":229.0,"is_valid":true,"total":0.0,"total_returned":0.0}],"total_power":700.0,"emeter_n":{"current":0.8},"wifi_sta":{"connected":true,"ip":"192.168.1.22","rssi":-65},"uptime":7200,"unixtime":1756900000}}}
```

`tests/Fixtures/shelly/desconocido.json` (un Shelly Plug: ningún formato de medidor):

```json
{"isok":true,"data":{"online":true,"device_status":{"ts":1756900000,"switch:0":{"id":0,"output":true,"apower":12.5}}}}
```

- [ ] **Step 2: Escribir el test del lector (falla)**

`tests/Unit/Lectores/ShellyCloudLectorTest.php`:

```php
<?php

use App\Models\Dispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\Lectores\LecturaNoDisponible;
use App\Services\Lectores\ShellyCloudLector;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    Schema::dropIfExists('dispositivos');
    Schema::dropIfExists('sitios');
    Schema::dropIfExists('organizaciones');

    Schema::create('organizaciones', function (Blueprint $table) {
        $table->id();
        $table->string('nombre');
        $table->boolean('activa')->default(true);
        $table->text('shelly_api_key')->nullable();
        $table->string('shelly_server')->nullable();
        $table->unsignedBigInteger('credencial_shelly_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('sitios', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('organizacion_id');
        $table->string('nombre');
        $table->boolean('activa')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('dispositivos', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('sitio_id');
        $table->string('device_id')->unique();
        $table->string('nombre');
        $table->boolean('activo')->default(true);
        $table->unsignedTinyInteger('num_fases')->nullable();
        $table->json('configuracion')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
});

function dispositivoShellyDePrueba(array $organizacion = []): Dispositivo
{
    $org = Organizacion::create(array_merge([
        'nombre' => 'Org Test',
        'activa' => true,
        'shelly_api_key' => 'clave-de-prueba',
        'shelly_server' => 'https://shelly-eu.example',
    ], $organizacion));

    $sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);

    return Dispositivo::create([
        'sitio_id' => $sitio->id,
        'device_id' => 'abc123',
        'nombre' => 'Medidor',
        'activo' => true,
    ]);
}

function respuestaShelly(string $fixture): array
{
    return json_decode(file_get_contents(base_path("tests/Fixtures/shelly/{$fixture}.json")), true);
}

it('normaliza el formato trifásico em:0', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('pro-3em'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(800.0)
        ->and($lectura['potencia_canal_1_w'])->toBe(500.0)
        ->and($lectura['energia_total_kwh'])->toBe(1750.875)
        ->and($lectura['energia_retornada_kwh'])->toBe(17.5)
        ->and($lectura['voltaje_promedio'])->toBe(230.2)
        ->and($lectura['reactiva_canal_1_var'])->toBe(283.95)
        ->and($lectura['wifi_conectado'])->toBe(1)
        ->and($lectura['wifi_rssi'])->toBe(-55)
        ->and($lectura['uptime_segundos'])->toBe(86400)
        ->and($lectura['fecha_lectura']->timestamp)->toBe(1756900000)
        ->and($lectura['datos_raw']['device_status']['em:0']['a_act_power'])->toBe(500.0);

    Http::assertSent(fn ($request) => $request['id'] === 'abc123' && $request['auth_key'] === 'clave-de-prueba');
});

it('normaliza el formato de dos canales em1:x', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('pro-em-50'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(460.0)
        ->and($lectura['potencia_canal_2_w'])->toBe(-230.0)
        ->and($lectura['potencia_canal_3_w'])->toBe(0.0)
        ->and($lectura['energia_total_kwh'])->toBe(130.5)
        ->and($lectura['energia_retornada_kwh'])->toBe(80.25)
        ->and($lectura['datos_raw']['em1:1']['act_power'])->toBe(-230.0);
});

it('normaliza el formato antiguo emeters convirtiendo Wh a kWh', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('3em-gen1'))]);

    $lectura = (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());

    expect($lectura['potencia_total_w'])->toBe(700.0)
        ->and($lectura['energia_canal_1_kwh'])->toBe(150.0)
        ->and($lectura['energia_total_kwh'])->toBe(230.0)
        ->and($lectura['energia_retornada_kwh'])->toBe(2.0)
        ->and($lectura['corriente_neutro'])->toBe(0.8)
        ->and($lectura['wifi_conectado'])->toBe(1)
        ->and($lectura['uptime_segundos'])->toBe(7200);
});

it('rechaza un formato de respuesta desconocido en vez de guardar ceros', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(respuestaShelly('desconocido'))]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'formato de respuesta desconocido');

it('rechaza una respuesta con isok falso', function () {
    Http::fake(['shelly-eu.example/*' => Http::response(['isok' => false, 'errors' => ['invalid_token' => 'bad']])]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'respuesta inválida');

it('rechaza un error HTTP', function () {
    Http::fake(['shelly-eu.example/*' => Http::response('Unauthorized', 401)]);

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba());
})->throws(LecturaNoDisponible::class, 'HTTP 401');

it('rechaza un dispositivo cuya organización no tiene credencial', function () {
    Http::fake();

    (new ShellyCloudLector)->leer(dispositivoShellyDePrueba(['shelly_api_key' => null, 'shelly_server' => null]));
})->throws(LecturaNoDisponible::class, 'organización sin credencial Shelly');

it('pausa un segundo entre lecturas', function () {
    expect((new ShellyCloudLector)->pausaEntreLecturasMs())->toBe(1000);
});
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

Run: `php artisan test --filter=ShellyCloudLectorTest`
Expected: FAIL con `Class "App\Services\Lectores\ShellyCloudLector" not found`.

- [ ] **Step 4: Crear la interfaz y la excepción**

`app/Services/Lectores/LectorDispositivo.php`:

```php
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
```

`app/Services/Lectores/LecturaNoDisponible.php`:

```php
<?php

namespace App\Services\Lectores;

use RuntimeException;

class LecturaNoDisponible extends RuntimeException
{
}
```

- [ ] **Step 5: Crear `ShellyCloudLector` moviendo el código del comando**

`app/Services/Lectores/ShellyCloudLector.php`. El cuerpo de `procesarRespuestaShelly()` y `prepararDatosRawOptimizados()` se copia **tal cual** de `app/Console/Commands/ObtenerLecturasShelly.php` (líneas 204-438 y 445-516) como métodos privados de esta clase, con dos cambios que se detallan debajo del esqueleto.

```php
<?php

namespace App\Services\Lectores;

use App\Models\Dispositivo;
use App\Models\Organizacion;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ShellyCloudLector implements LectorDispositivo
{
    private const PAUSA_ENTRE_LECTURAS_MS = 1000;

    public function leer(Dispositivo $dispositivo, int $timeoutSegundos = 10): array
    {
        $organizacion = $dispositivo->sitio?->organizacion;

        if (! $organizacion instanceof Organizacion || ! $organizacion->tieneShellyApiKey() || ! $organizacion->obtenerShellyServer()) {
            throw new LecturaNoDisponible('organización sin credencial Shelly');
        }

        $url = $this->urlEstado($organizacion->obtenerShellyServer());

        try {
            $response = Http::timeout($timeoutSegundos)->get($url, [
                'id' => $dispositivo->device_id,
                'auth_key' => $organizacion->obtenerShellyApiKey(),
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            throw new LecturaNoDisponible("sin conexión con Shelly Cloud: {$e->getMessage()}", previous: $e);
        }

        if (! $response->successful()) {
            Log::channel('shelly_readings')->warning("Error en respuesta de Shelly API para dispositivo {$dispositivo->id}", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new LecturaNoDisponible("HTTP {$response->status()} de Shelly Cloud");
        }

        $data = $response->json();

        if (! isset($data['isok']) || ! $data['isok'] || ! isset($data['data'])) {
            Log::channel('shelly_readings')->warning("Respuesta inválida de Shelly API para dispositivo {$dispositivo->id}", [
                'response' => $data,
            ]);

            throw new LecturaNoDisponible('respuesta inválida de Shelly Cloud (isok falso o sin data)');
        }

        return $this->procesarRespuestaShelly($dispositivo->id, $data);
    }

    public function pausaEntreLecturasMs(): int
    {
        return self::PAUSA_ENTRE_LECTURAS_MS;
    }

    private function urlEstado(string $shellyServer): string
    {
        $base = preg_replace('/\/device\/status.*$/', '', rtrim($shellyServer, '/'));

        return "{$base}/device/status";
    }

    // private function procesarRespuestaShelly(int $dispositivoId, array $responseData): array
    //     → copiar de ObtenerLecturasShelly.php líneas 204-438 (ver cambios 1 y 2 debajo)

    // private function prepararDatosRawOptimizados(array $deviceStatus): array
    //     → copiar de ObtenerLecturasShelly.php líneas 445-516 sin cambios
}
```

Cambio 1 en `procesarRespuestaShelly()`: detectar formato desconocido. Añadir `$formatoReconocido = false;` junto a las inicializaciones (tras `$numFases = null;`), poner `$formatoReconocido = true;` como primera línea dentro de cada una de las tres ramas (`if (isset($deviceStatus['em:0']) …`, `elseif (isset($deviceStatus['em1:0']) …`, `elseif (isset($deviceStatus['emeters']) …`) y, justo después de cerrar la cadena `if/elseif`, antes de `// Calcular reactiva`:

```php
        if (! $formatoReconocido) {
            throw new LecturaNoDisponible('formato de respuesta desconocido: no contiene em:0, em1:x ni emeters');
        }
```

Cambio 2: la firma pasa de `?array` a `array` (ya nunca devuelve `null`). No se copia la línea `Log::channel('shelly_readings')->info("Intentando consultar dispositivo … key_len …")` de la línea 163 del comando: escribía parte de la API key en el log.

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

Run: `php artisan test --filter=ShellyCloudLectorTest`
Expected: PASS (8 tests). Si `reactiva_canal_1_var` no da `283.95`, comprobar que se copió `round($reactivaCanal1, 2)`; si `voltaje_promedio` no da `230.2`, comprobar el `round(..., 2)` del promedio.

- [ ] **Step 7: Commit**

```bash
git add app/Services/Lectores tests/Unit/Lectores tests/Fixtures/shelly
git commit -m "feat: extraer la lectura de Shelly Cloud a ShellyCloudLector tras LectorDispositivo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Enums `DriverDispositivo`, `ModoCanales` y `Magnitud`

**Files:**
- Create: `app/Enums/DriverDispositivo.php`, `app/Enums/ModoCanales.php`, `app/Enums/Magnitud.php`
- Test: `tests/Unit/Enums/DriverDispositivoTest.php`

**Interfaces:**
- Consumes: `App\Services\Lectores\ShellyCloudLector`, `LectorDispositivo` (Tarea 1).
- Produces:
  - `DriverDispositivo::{ShellyCloud, ModbusTcp, BacnetIp}` con `label(): string`, `camposConexion(): array` (lista de `['nombre','etiqueta','tipo','requerido','default','reglas']`), `reglasConexion(): array<string, array>` (claves `conexion.<nombre>`), `lector(): ?LectorDispositivo`, `disponible(): bool`, `toArray(): array` (`value, label, disponible, campos_conexion`), `static opcionesParaFormulario(): array`.
  - `ModoCanales::{Circuitos, Fases}` con `label()`, `static opcionesParaFormulario()`.
  - `Magnitud` con 12 casos, `label()`, `static opcionesParaFormulario()`.

- [ ] **Step 1: Escribir el test (falla)**

`tests/Unit/Enums/DriverDispositivoTest.php`:

```php
<?php

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Services\Lectores\ShellyCloudLector;
use Tests\TestCase;

uses(TestCase::class);

it('solo shelly_cloud tiene lector disponible', function () {
    expect(DriverDispositivo::ShellyCloud->lector())->toBeInstanceOf(ShellyCloudLector::class)
        ->and(DriverDispositivo::ShellyCloud->disponible())->toBeTrue()
        ->and(DriverDispositivo::ModbusTcp->lector())->toBeNull()
        ->and(DriverDispositivo::ModbusTcp->disponible())->toBeFalse()
        ->and(DriverDispositivo::BacnetIp->lector())->toBeNull()
        ->and(DriverDispositivo::BacnetIp->disponible())->toBeFalse();
});

it('shelly_cloud no pide campos de conexión', function () {
    expect(DriverDispositivo::ShellyCloud->camposConexion())->toBe([])
        ->and(DriverDispositivo::ShellyCloud->reglasConexion())->toBe([]);
});

it('modbus_tcp pide host, puerto y unidad con sus valores por defecto', function () {
    $campos = collect(DriverDispositivo::ModbusTcp->camposConexion())->keyBy('nombre');

    expect($campos->keys()->all())->toBe(['host', 'port', 'unit_id'])
        ->and($campos['host']['requerido'])->toBeTrue()
        ->and($campos['port']['default'])->toBe(502)
        ->and($campos['unit_id']['default'])->toBe(1);

    $reglas = DriverDispositivo::ModbusTcp->reglasConexion();

    expect($reglas)->toHaveKeys(['conexion.host', 'conexion.port', 'conexion.unit_id'])
        ->and($reglas['conexion.host'])->toContain('required')
        ->and($reglas['conexion.unit_id'])->toContain('between:1,247');
});

it('bacnet_ip pide host, puerto e instancia', function () {
    $campos = collect(DriverDispositivo::BacnetIp->camposConexion())->keyBy('nombre');

    expect($campos->keys()->all())->toBe(['host', 'port', 'device_instance'])
        ->and($campos['port']['default'])->toBe(47808)
        ->and($campos['device_instance']['requerido'])->toBeTrue()
        ->and(DriverDispositivo::BacnetIp->reglasConexion()['conexion.device_instance'])->toContain('between:0,4194302');
});

it('expone las opciones para el formulario con etiqueta y disponibilidad', function () {
    $opciones = collect(DriverDispositivo::opcionesParaFormulario())->keyBy('value');

    expect($opciones->keys()->all())->toBe(['shelly_cloud', 'modbus_tcp', 'bacnet_ip'])
        ->and($opciones['shelly_cloud']['label'])->toBe('Shelly Cloud')
        ->and($opciones['shelly_cloud']['disponible'])->toBeTrue()
        ->and($opciones['modbus_tcp']['disponible'])->toBeFalse()
        ->and($opciones['modbus_tcp']['campos_conexion'])->toHaveCount(3);
});

it('define los modos de canal y las magnitudes con etiqueta', function () {
    expect(ModoCanales::Fases->label())->toBe('Fases de un mismo circuito')
        ->and(ModoCanales::Circuitos->label())->toBe('Circuitos independientes')
        ->and(collect(ModoCanales::opcionesParaFormulario())->pluck('value')->all())->toBe(['circuitos', 'fases'])
        ->and(Magnitud::cases())->toHaveCount(12)
        ->and(Magnitud::EnergiaActivaImportada->label())->toBe('Energía activa importada')
        ->and(collect(Magnitud::opcionesParaFormulario())->first())->toHaveKeys(['value', 'label']);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `php artisan test --filter=DriverDispositivoTest`
Expected: FAIL con `Class "App\Enums\DriverDispositivo" not found`.

- [ ] **Step 3: Implementar los tres enums**

`app/Enums/ModoCanales.php`:

```php
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
```

`app/Enums/Magnitud.php`:

```php
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
```

`app/Enums/DriverDispositivo.php`:

```php
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
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `php artisan test --filter=DriverDispositivoTest`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Enums tests/Unit/Enums
git commit -m "feat: enums de driver, modo de canales y magnitudes del catálogo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Esquema, modelos Eloquent, seeder y asignación del legado

**Files:**
- Create: `tests/Support/EsquemaDispositivos.php`
- Create: `database/migrations/2026_09_04_000001_create_modelos_dispositivo_table.php`
- Create: `database/migrations/2026_09_04_000002_add_modelo_dispositivo_to_dispositivos_table.php`
- Create: `app/Models/ModeloDispositivo.php`
- Create: `database/seeders/ModeloDispositivoSeeder.php`
- Create: `app/Services/Dispositivos/AsignadorModeloLegado.php`
- Modify: `app/Models/Dispositivo.php:18-50` (fillable/casts), `:57-65` (relaciones), `:307-315` (`getNombreCanal`)
- Modify: `app/Models/Lectura.php:9-12`
- Modify: `database/seeders/DatabaseSeeder.php:15-27`
- Modify: `tests/Unit/Lectores/ShellyCloudLectorTest.php` (usar el helper)
- Test: `tests/Unit/Modelos/ModeloDispositivoTest.php`

**Interfaces:**
- Consumes: `DriverDispositivo`, `ModoCanales`, `Magnitud` (Tarea 2).
- Produces:
  - `Tests\Support\EsquemaDispositivos::crear(): void` / `eliminar(): void` (tablas `users`, `organizaciones`, `organizacion_user`, `credencial_shellies`, `sitios`, `modelos_dispositivo`, `dispositivos`, `lecturas`).
  - `App\Models\ModeloDispositivo` (`$table = 'modelos_dispositivo'`, casts a enums, `dispositivos()`, `scopeActivos()`, `esBorrable(): bool`, `nombreCompleto(): string`).
  - `Dispositivo::modeloDispositivo(): BelongsTo`, `driver(): DriverDispositivo`, `conexion(): array`, `modoCanales(): ModoCanales`, `nombreModelo(): ?string`; `Lectura::MAX_CANALES`.
  - `Database\Seeders\ModeloDispositivoSeeder::run()` idempotente; códigos `shelly-3em`, `shelly-pro-3em`, `shelly-pro-em-50`, `circutor-cvm-mini-mc-itf-bacnet-c2`, `circutor-cvm-e3-mini-mc-wieth`.
  - `App\Services\Dispositivos\AsignadorModeloLegado::codigoPara(?string): ?string`, `asignarTodos(): array{asignados: int, sin_modelo: int}`.

- [ ] **Step 1: Crear el helper de esquema compartido**

`tests/Support/EsquemaDispositivos.php` (autocargado por PSR-4 `Tests\` → `tests/`):

```php
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
```

- [ ] **Step 2: Escribir el test de modelos, seeder y asignador (falla)**

`tests/Unit/Modelos/ModeloDispositivoTest.php`:

```php
<?php

use App\Enums\DriverDispositivo;
use App\Enums\ModoCanales;
use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\Dispositivos\AsignadorModeloLegado;
use Database\Seeders\ModeloDispositivoSeeder;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn () => EsquemaDispositivos::crear());
afterEach(fn () => EsquemaDispositivos::eliminar());

function sitioDePrueba(): Sitio
{
    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true]);

    return Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);
}

it('siembra el catálogo inicial de forma idempotente', function () {
    (new ModeloDispositivoSeeder)->run();
    (new ModeloDispositivoSeeder)->run();

    expect(ModeloDispositivo::count())->toBe(5)
        ->and(ModeloDispositivo::pluck('codigo')->sort()->values()->all())->toBe([
            'circutor-cvm-e3-mini-mc-wieth', 'circutor-cvm-mini-mc-itf-bacnet-c2',
            'shelly-3em', 'shelly-pro-3em', 'shelly-pro-em-50',
        ]);

    $pro3em = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    $cvm = ModeloDispositivo::where('codigo', 'circutor-cvm-mini-mc-itf-bacnet-c2')->first();

    expect($pro3em->driver)->toBe(DriverDispositivo::ShellyCloud)
        ->and($pro3em->num_canales)->toBe(3)
        ->and($pro3em->modo_canales_por_defecto)->toBe(ModoCanales::Fases)
        ->and($pro3em->modo_canales_configurable)->toBeTrue()
        ->and($pro3em->magnitudes)->toContain('frecuencia')
        ->and($cvm->driver)->toBe(DriverDispositivo::BacnetIp)
        ->and($cvm->driver->disponible())->toBeFalse()
        ->and($cvm->modo_canales_configurable)->toBeFalse();
});

it('un dispositivo sin modelo se lee con Shelly Cloud y sin conexión extra', function () {
    $dispositivo = Dispositivo::create(['sitio_id' => sitioDePrueba()->id, 'device_id' => 'd1', 'nombre' => 'Legado']);

    expect($dispositivo->driver())->toBe(DriverDispositivo::ShellyCloud)
        ->and($dispositivo->conexion())->toBe([])
        ->and($dispositivo->modoCanales())->toBe(ModoCanales::Circuitos)
        ->and($dispositivo->nombreModelo())->toBeNull();
});

it('un dispositivo con modelo expone driver, conexión y nombre del modelo', function () {
    (new ModeloDispositivoSeeder)->run();
    $modelo = ModeloDispositivo::where('codigo', 'circutor-cvm-e3-mini-mc-wieth')->first();

    $dispositivo = Dispositivo::create([
        'sitio_id' => sitioDePrueba()->id,
        'modelo_dispositivo_id' => $modelo->id,
        'device_id' => 'cvm-1',
        'nombre' => 'Cuadro general',
        'modo_canales' => ModoCanales::Fases,
        'configuracion' => ['conexion' => ['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1]],
    ]);

    expect($dispositivo->driver())->toBe(DriverDispositivo::ModbusTcp)
        ->and($dispositivo->conexion())->toBe(['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1])
        ->and($dispositivo->nombreModelo())->toBe('Circutor CVM-E3-MINI-MC-WiEth')
        ->and($dispositivo->getNombreCanal(2))->toBe('L2');
});

it('un modelo no es borrable mientras lo use un dispositivo, aunque esté eliminado', function () {
    (new ModeloDispositivoSeeder)->run();
    $modelo = ModeloDispositivo::where('codigo', 'shelly-3em')->first();

    expect($modelo->esBorrable())->toBeTrue();

    $dispositivo = Dispositivo::create(['sitio_id' => sitioDePrueba()->id, 'modelo_dispositivo_id' => $modelo->id, 'device_id' => 'd2', 'nombre' => 'X']);
    $dispositivo->delete();

    expect($modelo->fresh()->esBorrable())->toBeFalse();
});

it('mapea el texto de modelo antiguo a un código del catálogo', function (?string $texto, ?string $codigo) {
    expect((new AsignadorModeloLegado)->codigoPara($texto))->toBe($codigo);
})->with([
    ['SHEM-3', 'shelly-3em'],
    ['Shelly EM3', 'shelly-3em'],
    ['  shelly em3 ', 'shelly-3em'],
    ['Shelly Pro 3EM', 'shelly-pro-3em'],
    ['Shelly Pro EM 50', 'shelly-pro-em-50'],
    ['Shelly Plug S', null],
    ['', null],
    [null, null],
]);

it('asigna modelo a los dispositivos de legado y deja el resto sin modelo', function () {
    (new ModeloDispositivoSeeder)->run();
    $sitio = sitioDePrueba();
    $conocido = Dispositivo::create(['sitio_id' => $sitio->id, 'device_id' => 'a', 'nombre' => 'A']);
    $desconocido = Dispositivo::create(['sitio_id' => $sitio->id, 'device_id' => 'b', 'nombre' => 'B']);
    $conocido->forceFill(['modelo_legacy' => 'SHEM-3', 'modo_canales' => 'fases'])->save();
    $desconocido->forceFill(['modelo_legacy' => 'Otro'])->save();

    $resultado = (new AsignadorModeloLegado)->asignarTodos();

    expect($resultado)->toBe(['asignados' => 1, 'sin_modelo' => 1])
        ->and($conocido->fresh()->modeloDispositivo->codigo)->toBe('shelly-3em')
        ->and($conocido->fresh()->modoCanales())->toBe(ModoCanales::Circuitos)
        ->and($desconocido->fresh()->modelo_dispositivo_id)->toBeNull();
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `php artisan test --filter=ModeloDispositivoTest`
Expected: FAIL con `Class "App\Models\ModeloDispositivo" not found`.

- [ ] **Step 4: Crear el modelo `ModeloDispositivo`**

`app/Models/ModeloDispositivo.php`:

```php
<?php

namespace App\Models;

use App\Enums\DriverDispositivo;
use App\Enums\ModoCanales;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModeloDispositivo extends Model
{
    use HasFactory;

    protected $table = 'modelos_dispositivo';

    protected $fillable = [
        'codigo',
        'fabricante',
        'familia',
        'nombre',
        'driver',
        'num_canales',
        'modo_canales_por_defecto',
        'modo_canales_configurable',
        'magnitudes',
        'activo',
        'notas',
    ];

    protected $casts = [
        'driver' => DriverDispositivo::class,
        'num_canales' => 'integer',
        'modo_canales_por_defecto' => ModoCanales::class,
        'modo_canales_configurable' => 'boolean',
        'magnitudes' => 'array',
        'activo' => 'boolean',
    ];

    public function dispositivos(): HasMany
    {
        return $this->hasMany(Dispositivo::class);
    }

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    /** Los dispositivos eliminados siguen referenciando el modelo, por eso cuentan. */
    public function esBorrable(): bool
    {
        return ! $this->dispositivos()->withTrashed()->exists();
    }

    public function nombreCompleto(): string
    {
        return "{$this->fabricante} {$this->nombre}";
    }
}
```

- [ ] **Step 5: Adaptar `Dispositivo` y `Lectura`**

En `app/Models/Lectura.php`, dentro de la clase, antes de `$dispatchesEvents`:

```php
    /** Tope de canales que cabe en las columnas `*_canal_1..3` de `lecturas`. */
    public const MAX_CANALES = 3;
```

En `app/Models/Dispositivo.php`:

1. Imports: añadir `use App\Enums\DriverDispositivo;`, `use App\Enums\ModoCanales;`, `use Illuminate\Database\Eloquent\Relations\BelongsTo;`.
2. En `$fillable`: sustituir `'modelo',` por `'modelo_dispositivo_id',` y añadir `'modo_canales',` justo después de `'num_fases',`.
3. En `$casts`: añadir `'modo_canales' => ModoCanales::class,`.
4. Junto a `sitio()`:

```php
    public function modeloDispositivo(): BelongsTo
    {
        return $this->belongsTo(ModeloDispositivo::class);
    }

    /** Sin modelo asignado (legado) el dispositivo se trata como un Shelly Cloud. */
    public function driver(): DriverDispositivo
    {
        return $this->modeloDispositivo?->driver ?? DriverDispositivo::ShellyCloud;
    }

    /** @return array<string, mixed> datos de conexión que pide el driver (vacío para Shelly Cloud) */
    public function conexion(): array
    {
        return $this->configuracion['conexion'] ?? [];
    }

    public function modoCanales(): ModoCanales
    {
        return $this->modo_canales ?? ModoCanales::Circuitos;
    }

    public function nombreModelo(): ?string
    {
        return $this->modeloDispositivo?->nombreCompleto() ?? $this->modelo_legacy;
    }
```

5. `getNombreCanal()` pasa a proponer `L1`/`L2`/`L3` cuando los canales son fases:

```php
    public function getNombreCanal(int $numero): string
    {
        $nombreGuardado = match ($numero) {
            1 => $this->nombre_canal_1,
            2 => $this->nombre_canal_2,
            3 => $this->nombre_canal_3,
            default => null,
        };

        if ($nombreGuardado !== null && $nombreGuardado !== '') {
            return $nombreGuardado;
        }

        return $this->modoCanales() === ModoCanales::Fases ? "L{$numero}" : "Canal {$numero}";
    }
```

- [ ] **Step 6: Crear el seeder y el asignador**

`database/seeders/ModeloDispositivoSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Models\ModeloDispositivo;
use Illuminate\Database\Seeder;

class ModeloDispositivoSeeder extends Seeder
{
    /** Catálogo inicial. Idempotente: se hace upsert por `codigo`. */
    public function run(): void
    {
        foreach ($this->catalogo() as $modelo) {
            ModeloDispositivo::updateOrCreate(['codigo' => $modelo['codigo']], $modelo);
        }
    }

    /** @return list<array<string, mixed>> */
    private function catalogo(): array
    {
        $energias = [Magnitud::EnergiaActivaImportada, Magnitud::EnergiaActivaExportada];
        $basicasPorFase = [Magnitud::PotenciaActiva, Magnitud::Tension, Magnitud::Corriente, Magnitud::FactorPotencia];

        return [
            // `nombre` va sin el fabricante: nombreCompleto() los une ("Shelly Pro 3EM").
            $this->modelo('shelly-3em', 'Shelly', 'EM Gen1', '3EM (SHEM-3)', DriverDispositivo::ShellyCloud, 3, ModoCanales::Fases, true,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, ...$energias]),
            $this->modelo('shelly-pro-3em', 'Shelly', 'Pro EM', 'Pro 3EM', DriverDispositivo::ShellyCloud, 3, ModoCanales::Fases, true,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::CorrienteNeutro, Magnitud::Frecuencia, ...$energias]),
            $this->modelo('shelly-pro-em-50', 'Shelly', 'Pro EM', 'Pro EM 50', DriverDispositivo::ShellyCloud, 2, ModoCanales::Circuitos, false,
                [...$basicasPorFase, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias]),
            $this->modelo('circutor-cvm-mini-mc-itf-bacnet-c2', 'Circutor', 'CVM-MINI', 'CVM-MINI-MC-ITF-BACnet-C2', DriverDispositivo::BacnetIp, 3, ModoCanales::Fases, false,
                [...$basicasPorFase, Magnitud::CorrienteNeutro, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias, Magnitud::EnergiaReactiva, Magnitud::Thd],
                'Magnitudes según documentación general de la familia: confirmar con la hoja de datos antes de implementar el lector.'),
            $this->modelo('circutor-cvm-e3-mini-mc-wieth', 'Circutor', 'CVM-E3-MINI', 'CVM-E3-MINI-MC-WiEth', DriverDispositivo::ModbusTcp, 3, ModoCanales::Fases, false,
                [...$basicasPorFase, Magnitud::PotenciaReactiva, Magnitud::PotenciaAparente, Magnitud::Frecuencia, ...$energias, Magnitud::EnergiaReactiva, Magnitud::Thd],
                'Magnitudes según documentación general de la familia: confirmar con la hoja de datos antes de implementar el lector.'),
        ];
    }

    /** @param list<Magnitud> $magnitudes */
    private function modelo(
        string $codigo,
        string $fabricante,
        string $familia,
        string $nombre,
        DriverDispositivo $driver,
        int $numCanales,
        ModoCanales $modoPorDefecto,
        bool $modoConfigurable,
        array $magnitudes,
        ?string $notas = null,
    ): array {
        return [
            'codigo' => $codigo,
            'fabricante' => $fabricante,
            'familia' => $familia,
            'nombre' => $nombre,
            'driver' => $driver,
            'num_canales' => $numCanales,
            'modo_canales_por_defecto' => $modoPorDefecto,
            'modo_canales_configurable' => $modoConfigurable,
            'magnitudes' => array_map(fn (Magnitud $m) => $m->value, $magnitudes),
            'activo' => true,
            'notas' => $notas,
        ];
    }
}
```

`app/Services/Dispositivos/AsignadorModeloLegado.php`:

```php
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

    /** @return array{asignados: int, sin_modelo: int} */
    public function asignarTodos(): array
    {
        $idPorCodigo = ModeloDispositivo::query()->pluck('id', 'codigo');
        $resultado = ['asignados' => 0, 'sin_modelo' => 0];

        foreach (DB::table('dispositivos')->get(['id', 'modelo_legacy']) as $fila) {
            $codigo = $this->codigoPara($fila->modelo_legacy);
            $modeloId = $codigo !== null ? $idPorCodigo->get($codigo) : null;

            DB::table('dispositivos')->where('id', $fila->id)->update([
                'modelo_dispositivo_id' => $modeloId,
                'modo_canales' => ModoCanales::Circuitos->value,
            ]);

            $resultado[$modeloId !== null ? 'asignados' : 'sin_modelo']++;
        }

        return $resultado;
    }
}
```

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `php artisan test --filter=ModeloDispositivoTest`
Expected: PASS (6 tests, 13 con el dataset).

- [ ] **Step 8: Escribir las migraciones**

`database/migrations/2026_09_04_000001_create_modelos_dispositivo_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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
    }

    public function down(): void
    {
        Schema::dropIfExists('modelos_dispositivo');
    }
};
```

`database/migrations/2026_09_04_000002_add_modelo_dispositivo_to_dispositivos_table.php`:

```php
<?php

use App\Enums\ModoCanales;
use App\Services\Dispositivos\AsignadorModeloLegado;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->foreignId('modelo_dispositivo_id')
                ->nullable()
                ->after('sitio_id')
                ->constrained('modelos_dispositivo')
                ->restrictOnDelete();
            $table->string('modo_canales', 20)->default(ModoCanales::Circuitos->value)->after('num_fases');
        });

        Schema::table('dispositivos', function (Blueprint $table) {
            $table->renameColumn('modelo', 'modelo_legacy');
        });

        (new ModeloDispositivoSeeder)->run();

        $resultado = (new AsignadorModeloLegado)->asignarTodos();

        Log::info('Catálogo de modelos: asignación del legado terminada.', $resultado);
    }

    public function down(): void
    {
        Schema::table('dispositivos', function (Blueprint $table) {
            $table->renameColumn('modelo_legacy', 'modelo');
        });

        Schema::table('dispositivos', function (Blueprint $table) {
            $table->dropColumn('modo_canales');
            $table->dropConstrainedForeignId('modelo_dispositivo_id');
        });
    }
};
```

En `database/seeders/DatabaseSeeder.php`, al final de `run()`, añadir `$this->call(ModeloDispositivoSeeder::class);` para las instalaciones nuevas.

- [ ] **Step 9: Comprobar las migraciones contra una base vacía**

Run: `php artisan migrate:fresh --database=sqlite --env=testing --force` no sirve (las migraciones antiguas son stubs en SQLite). Comprobar en su lugar contra la base local MySQL del `.env`: `php artisan migrate --pretend` y revisar que aparecen `create table modelos_dispositivo`, `alter table dispositivos add … modelo_dispositivo_id`, `rename column modelo to modelo_legacy`. Si la base local no es alcanzable, dejar constancia en el commit y validar en el despliegue con `php artisan migrate --pretend` en el servidor antes del `--force`.

- [ ] **Step 10: Pasar el test del lector al helper**

En `tests/Unit/Lectores/ShellyCloudLectorTest.php`, sustituir todo el `beforeEach` (los tres `dropIfExists` y los tres `Schema::create`) por:

```php
use Tests\Support\EsquemaDispositivos;

beforeEach(fn () => EsquemaDispositivos::crear());
afterEach(fn () => EsquemaDispositivos::eliminar());
```

y quitar los imports de `Blueprint` y `Schema` que quedan sin uso.

Run: `php artisan test --filter="ShellyCloudLectorTest|ModeloDispositivoTest|DriverDispositivoTest"`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add app/Models database/migrations database/seeders app/Services/Dispositivos tests/Support tests/Unit/Modelos tests/Unit/Lectores
git commit -m "feat: catálogo modelos_dispositivo, relación en dispositivos, seeder y asignación del legado" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Comando `lecturas:obtener` enrutado por driver

**Files:**
- Create: `app/Console/Commands/ObtenerLecturas.php`
- Delete: `app/Console/Commands/ObtenerLecturasShelly.php`
- Modify: `routes/console.php:14`
- Modify: `app/Console/Commands/DiagnosticoScheduler.php` (todas las apariciones de `shelly:obtener-lecturas`)
- Modify: `app/Http/Controllers/DispositivosController.php:345-361` (`sincronizar`)
- Modify: `tests/Unit/DispositivosGlobalPanelTest.php:281-283`
- Test: `tests/Unit/Comandos/ObtenerLecturasTest.php`

**Interfaces:**
- Consumes: `Dispositivo::driver()`, `DriverDispositivo::lector()`, `LectorDispositivo::leer()/pausaEntreLecturasMs()`, `LecturaNoDisponible`, `EvaluadorUmbrales::evaluar(Lectura, Dispositivo): array`, `Tests\Support\EsquemaDispositivos`.
- Produces: comando `lecturas:obtener {--dispositivo=} {--timeout=10}` con alias `shelly:obtener-lecturas`; códigos de salida según el spec.

- [ ] **Step 1: Escribir el test del comando (falla)**

`tests/Unit/Comandos/ObtenerLecturasTest.php`:

```php
<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Services\EvaluadorUmbrales;
use App\Services\Lectores\LectorDispositivo;
use App\Services\Lectores\LecturaNoDisponible;
use App\Services\Lectores\ShellyCloudLector;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

/** Lector de pruebas: responde por device_id con un array de lectura o lanzando la excepción indicada. */
class LectorFalso implements LectorDispositivo
{
    /** @param array<string, array|\Throwable> $respuestas */
    public function __construct(private array $respuestas) {}

    public function leer(Dispositivo $dispositivo, int $timeoutSegundos = 10): array
    {
        $respuesta = $this->respuestas[$dispositivo->device_id] ?? throw new LecturaNoDisponible('sin respuesta preparada');

        if ($respuesta instanceof Throwable) {
            throw $respuesta;
        }

        return $respuesta + ['dispositivo_id' => $dispositivo->id];
    }

    public function pausaEntreLecturasMs(): int
    {
        return 0;
    }
}

beforeEach(function () {
    EsquemaDispositivos::crear();
    Event::fake([DashboardLecturaActualizada::class]);
    $this->mock(EvaluadorUmbrales::class)->shouldReceive('evaluar')->andReturn([]);
    (new ModeloDispositivoSeeder)->run();

    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true, 'shelly_api_key' => 'k', 'shelly_server' => 'https://s']);
    $this->sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function lecturaDePrueba(float $potencia = 100.0): array
{
    return ['fecha_lectura' => now(), 'potencia_total_w' => $potencia, 'energia_total_kwh' => 1.0];
}

function dispositivoDePrueba(TestCase $test, string $deviceId, ?string $codigoModelo = null): Dispositivo
{
    return Dispositivo::create([
        'sitio_id' => $test->sitio->id,
        'device_id' => $deviceId,
        'nombre' => "Equipo {$deviceId}",
        'modelo_dispositivo_id' => $codigoModelo ? ModeloDispositivo::where('codigo', $codigoModelo)->value('id') : null,
        'activo' => true,
    ]);
}

it('lee un dispositivo sin modelo con el lector de Shelly Cloud', function () {
    dispositivoDePrueba($this, 'legado');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['legado' => lecturaDePrueba(250)]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and((float) Lectura::first()->potencia_total_w)->toBe(250.0)
        ->and(Artisan::output())->toContain('Exitosos');
});

it('omite los dispositivos cuyo driver no tiene lector sin contarlos como error', function () {
    dispositivoDePrueba($this, 'cvm', 'circutor-cvm-mini-mc-itf-bacnet-c2');
    dispositivoDePrueba($this, 'shelly', 'shelly-pro-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['shelly' => lecturaDePrueba()]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and(Artisan::output())->toContain('Omitidos')->toContain('1');
});

it('un fallo de lectura no detiene el resto', function () {
    dispositivoDePrueba($this, 'roto', 'shelly-3em');
    dispositivoDePrueba($this, 'sano', 'shelly-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso([
        'roto' => new LecturaNoDisponible('formato de respuesta desconocido'),
        'sano' => lecturaDePrueba(),
    ]));

    $codigo = Artisan::call('lecturas:obtener');

    expect($codigo)->toBe(0)
        ->and(Lectura::count())->toBe(1)
        ->and(Artisan::output())->toContain('formato de respuesta desconocido');
});

it('devuelve fallo cuando todo son errores', function () {
    dispositivoDePrueba($this, 'roto', 'shelly-3em');
    app()->instance(ShellyCloudLector::class, new LectorFalso(['roto' => new LecturaNoDisponible('HTTP 500')]));

    expect(Artisan::call('lecturas:obtener'))->toBe(1)
        ->and(Lectura::count())->toBe(0);
});

it('con --dispositivo devuelve fallo si el modelo no tiene lector', function () {
    $cvm = dispositivoDePrueba($this, 'cvm', 'circutor-cvm-e3-mini-mc-wieth');

    expect(Artisan::call('lecturas:obtener', ['--dispositivo' => $cvm->id]))->toBe(1)
        ->and(Artisan::output())->toContain('sin lector');
});

it('mantiene el alias antiguo del comando', function () {
    expect(Artisan::call('shelly:obtener-lecturas'))->toBe(0)
        ->and(Artisan::output())->toContain('No hay dispositivos');
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `php artisan test --filter=ObtenerLecturasTest`
Expected: FAIL con `There are no commands defined in the "lecturas" namespace` (o `Command "lecturas:obtener" is not defined`).

- [ ] **Step 3: Crear el comando y borrar el antiguo**

`app/Console/Commands/ObtenerLecturas.php`:

```php
<?php

namespace App\Console\Commands;

use App\Models\Dispositivo;
use App\Models\Lectura;
use App\Services\EvaluadorUmbrales;
use App\Services\Lectores\LectorDispositivo;
use App\Services\Lectores\LecturaNoDisponible;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class ObtenerLecturas extends Command
{
    protected $signature = 'lecturas:obtener
                            {--dispositivo= : ID del dispositivo específico}
                            {--timeout=10 : Timeout en segundos para cada lectura}';

    protected $aliases = ['shelly:obtener-lecturas'];

    protected $description = 'Obtiene una lectura de cada dispositivo activo a través del lector de su modelo y la guarda';

    private int $exitosos = 0;

    private int $errores = 0;

    private int $omitidos = 0;

    private int $fasesActualizadas = 0;

    /** @var array<string, true> drivers sin lector ya avisados en esta ejecución */
    private array $driversAvisados = [];

    public function handle(EvaluadorUmbrales $evaluador): int
    {
        $dispositivoId = $this->option('dispositivo');
        $timeout = (int) $this->option('timeout');

        $dispositivos = $this->dispositivosALeer($dispositivoId);

        if ($dispositivos->isEmpty()) {
            $this->warn('No hay dispositivos activos que leer.');

            return $dispositivoId ? self::FAILURE : self::SUCCESS;
        }

        $this->info("Procesando {$dispositivos->count()} dispositivo(s)...");

        foreach ($dispositivos->values() as $indice => $dispositivo) {
            $this->line("Procesando: {$dispositivo->nombre} ({$dispositivo->device_id})");

            $lector = $dispositivo->driver()->lector();

            if ($lector === null) {
                $this->omitir($dispositivo);

                continue;
            }

            $this->leerYGuardar($dispositivo, $lector, $timeout, $evaluador);

            if ($indice < $dispositivos->count() - 1) {
                usleep($lector->pausaEntreLecturasMs() * 1000);
            }
        }

        $this->mostrarResumen();

        return $this->codigoDeSalida(unSoloDispositivo: (bool) $dispositivoId);
    }

    private function dispositivosALeer(?string $dispositivoId): Collection
    {
        $query = Dispositivo::with(['sitio.organizacion.credencialShelly', 'modeloDispositivo'])
            ->activos()
            ->whereHas('sitio.organizacion', fn ($q) => $q->where('activa', true))
            ->orderBy('id');

        if ($dispositivoId) {
            $query->where('id', $dispositivoId);
        }

        return $query->get();
    }

    private function leerYGuardar(Dispositivo $dispositivo, LectorDispositivo $lector, int $timeout, EvaluadorUmbrales $evaluador): void
    {
        try {
            $lectura = Lectura::create($lector->leer($dispositivo, $timeout));

            $alertas = $evaluador->evaluar($lectura, $dispositivo);
            if ($alertas !== []) {
                $this->warn('  ⚠️  '.count($alertas).' alerta(s) de umbral generada(s)');
            }

            if ($dispositivo->actualizarNumFasesAuto()) {
                $this->fasesActualizadas++;
            }

            Log::channel('shelly_readings')->info("Lectura exitosa para dispositivo {$dispositivo->id} ({$dispositivo->device_id})");
            $this->info('  ✅ Lectura guardada');
            $this->exitosos++;
        } catch (LecturaNoDisponible $e) {
            $this->warn("  ❌ Sin lectura: {$e->getMessage()}");
            Log::channel('shelly_readings')->warning("Lectura no disponible para dispositivo {$dispositivo->id} ({$dispositivo->device_id}): {$e->getMessage()}");
            $this->errores++;
        } catch (Throwable $e) {
            $this->error("  ❌ Error: {$e->getMessage()}");
            Log::channel('shelly_readings')->error("Error obteniendo lectura del dispositivo {$dispositivo->id}", [
                'dispositivo_id' => $dispositivo->id,
                'device_id' => $dispositivo->device_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->errores++;
        }
    }

    private function omitir(Dispositivo $dispositivo): void
    {
        $driver = $dispositivo->driver();

        if (! isset($this->driversAvisados[$driver->value])) {
            Log::channel('shelly_readings')->warning("Driver {$driver->label()} sin lector disponible: se omiten sus dispositivos");
            $this->driversAvisados[$driver->value] = true;
        }

        $this->line("  ⏭️  Omitido: el modelo usa {$driver->label()}, que aún no tiene lector disponible");
        $this->omitidos++;
    }

    private function mostrarResumen(): void
    {
        $this->newLine();
        $this->info('Resumen:');
        $this->table(['Estado', 'Cantidad'], [
            ['✅ Exitosos', $this->exitosos],
            ['❌ Errores', $this->errores],
            ['⏭️ Omitidos (sin lector)', $this->omitidos],
            ['🔄 Fases actualizadas', $this->fasesActualizadas],
        ]);
    }

    /**
     * Con --dispositivo, fallo si ese equipo no se leyó. En ejecución completa, fallo solo si hubo
     * errores y ningún éxito: una ejecución con todo omitido es SUCCESS para no disparar onFailure
     * cada tres minutos por modelos que aún no tienen lector.
     */
    private function codigoDeSalida(bool $unSoloDispositivo): int
    {
        if ($unSoloDispositivo) {
            return $this->exitosos === 1 ? self::SUCCESS : self::FAILURE;
        }

        return ($this->errores > 0 && $this->exitosos === 0) ? self::FAILURE : self::SUCCESS;
    }
}
```

Borrar el comando antiguo: `git rm app/Console/Commands/ObtenerLecturasShelly.php`.

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `php artisan test --filter=ObtenerLecturasTest`
Expected: PASS (6 tests). Si el test del alias falla con «command not defined», comprobar que la propiedad se llama exactamente `$aliases` (Laravel 12 la registra en `Illuminate\Console\Command::configure()`).

- [ ] **Step 5: Programar el nombre nuevo y actualizar el diagnóstico**

En `routes/console.php` línea 14: `Schedule::command('shelly:obtener-lecturas')` → `Schedule::command('lecturas:obtener')`; en el `onFailure` de debajo, el mensaje pasa a `'Error al ejecutar comando lecturas:obtener'`.

En `app/Console/Commands/DiagnosticoScheduler.php`, sustituir todas las apariciones del texto `shelly:obtener-lecturas` por `lecturas:obtener` (mensajes y comprobación del comando):

```bash
grep -n "shelly:obtener-lecturas" app/Console/Commands/DiagnosticoScheduler.php
```

y editarlas a mano; volver a ejecutar el `grep` y comprobar que no queda ninguna.

Run: `php artisan schedule:list`
Expected: aparece `*/3 * * * *  php artisan lecturas:obtener`.

- [ ] **Step 6: `sincronizar` comprueba el código de salida**

En `app/Http/Controllers/DispositivosController.php`, sustituir el método `sincronizar` completo por:

```php
    /**
     * Sincronizar manualmente un dispositivo.
     */
    public function sincronizar(Request $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        try {
            $codigo = \Artisan::call('lecturas:obtener', [
                '--dispositivo' => $dispositivo->id,
            ]);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al sincronizar el dispositivo: '.$e->getMessage());
        }

        if ($codigo !== \Illuminate\Console\Command::SUCCESS) {
            return redirect()->back()
                ->with('error', 'No se pudo sincronizar el dispositivo: '.trim(\Artisan::output()));
        }

        return redirect()->back()
            ->with('success', 'Dispositivo sincronizado correctamente');
    }
```

En `tests/Unit/DispositivosGlobalPanelTest.php` líneas 281-283, el mock pasa a:

```php
    Artisan::shouldReceive('call')
        ->once()
        ->with('lecturas:obtener', ['--dispositivo' => $dispositivo->id])
        ->andReturn(0);
```

Run: `php artisan test --filter="ObtenerLecturasTest|DispositivosGlobalPanelTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/Console/Commands routes/console.php app/Http/Controllers/DispositivosController.php tests/Unit/Comandos tests/Unit/DispositivosGlobalPanelTest.php
git commit -m "feat: comando lecturas:obtener enrutado por el driver del modelo, con alias del nombre antiguo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: CRUD admin del catálogo (backend)

**Files:**
- Create: `app/Http/Requests/GuardarModeloDispositivoRequest.php`
- Create: `app/Http/Controllers/Admin/ModeloDispositivoController.php`
- Modify: `routes/web.php:67-69` (después del recurso de credenciales)
- Test: `tests/Unit/Admin/ModelosDispositivoTest.php`

**Interfaces:**
- Consumes: `ModeloDispositivo`, enums, `Lectura::MAX_CANALES`, `Tests\Support\EsquemaDispositivos`, `ModeloDispositivoSeeder`.
- Produces: rutas `admin.modelos-dispositivo.{index,create,store,edit,update,destroy}` (parámetro `modelo`); props de Inertia:
  - `Admin/ModelosDispositivo/Index`: `modelos: ModeloArray[]`.
  - `Admin/ModelosDispositivo/Create`: `opciones: {drivers, modos, magnitudes}`.
  - `Admin/ModelosDispositivo/Edit`: `modelo: ModeloArray`, `opciones`.
  - `ModeloArray = {id, codigo, fabricante, familia, nombre, driver, driver_label, driver_disponible, num_canales, modo_canales_por_defecto, modo_canales_configurable, magnitudes: string[], activo, notas, dispositivos_count}`.

- [ ] **Step 1: Escribir el test (falla)**

`tests/Unit/Admin/ModelosDispositivoTest.php`:

```php
<?php

use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Database\Seeders\ModeloDispositivoSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    EsquemaDispositivos::crear();
    (new ModeloDispositivoSeeder)->run();
    $this->admin = User::factory()->create(['rol_global' => 'admin']);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function modeloValido(array $cambios = []): array
{
    return array_merge([
        'codigo' => 'shelly-em-gen1',
        'fabricante' => 'Shelly',
        'familia' => 'EM Gen1',
        'nombre' => 'Shelly EM',
        'driver' => 'shelly_cloud',
        'num_canales' => 2,
        'modo_canales_por_defecto' => 'circuitos',
        'modo_canales_configurable' => false,
        'magnitudes' => ['potencia_activa', 'tension'],
        'activo' => true,
        'notas' => null,
    ], $cambios);
}

function dispositivoConModelo(ModeloDispositivo $modelo, array $extra = []): Dispositivo
{
    $org = Organizacion::create(['nombre' => 'Org', 'activa' => true]);
    $sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'activa' => true]);

    return Dispositivo::create(array_merge([
        'sitio_id' => $sitio->id,
        'modelo_dispositivo_id' => $modelo->id,
        'device_id' => 'dev-'.uniqid(),
        'nombre' => 'Equipo',
    ], $extra));
}

it('muestra el catálogo a técnicos y administradores', function () {
    $tecnico = User::factory()->create(['rol_global' => 'tecnico']);

    $this->actingAs($tecnico)->get('/admin/modelos-dispositivo')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Index')
            ->has('modelos', 5)
            ->has('modelos.0', fn (Assert $modelo) => $modelo
                ->hasAll(['id', 'codigo', 'fabricante', 'familia', 'nombre', 'driver', 'driver_label', 'driver_disponible',
                    'num_canales', 'modo_canales_por_defecto', 'modo_canales_configurable', 'magnitudes', 'activo', 'notas', 'dispositivos_count'])));
});

it('bloquea el catálogo a los clientes', function () {
    $cliente = User::factory()->create(['rol_global' => 'cliente']);

    $this->actingAs($cliente)->get('/admin/modelos-dispositivo')->assertForbidden();
    $this->actingAs($cliente)->post('/admin/modelos-dispositivo', modeloValido())->assertForbidden();
});

it('crea un modelo válido', function () {
    $this->actingAs($this->admin)
        ->post('/admin/modelos-dispositivo', modeloValido())
        ->assertRedirect(route('admin.modelos-dispositivo.index'));

    $modelo = ModeloDispositivo::where('codigo', 'shelly-em-gen1')->first();

    expect($modelo)->not->toBeNull()
        ->and($modelo->num_canales)->toBe(2)
        ->and($modelo->magnitudes)->toBe(['potencia_activa', 'tension']);
});

it('rechaza driver desconocido, canales fuera de rango y código repetido', function () {
    $this->actingAs($this->admin)
        ->from('/admin/modelos-dispositivo/create')
        ->post('/admin/modelos-dispositivo', modeloValido(['driver' => 'zigbee', 'num_canales' => 4, 'codigo' => 'shelly-3em']))
        ->assertRedirect('/admin/modelos-dispositivo/create')
        ->assertSessionHasErrors(['driver', 'num_canales', 'codigo']);
});

it('no permite bajar los canales por debajo de los configurados en sus dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo, ['tipo_canal_3' => 'red_electrica', 'nombre' => 'Cuadro taller']);

    $this->actingAs($this->admin)
        ->from("/admin/modelos-dispositivo/{$modelo->id}/edit")
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['num_canales' => 2, 'driver' => 'shelly_cloud']))
        ->assertSessionHasErrors('num_canales');

    expect($modelo->fresh()->num_canales)->toBe(3);
    expect(session('errors')->first('num_canales'))->toContain('Cuadro taller');
});

it('no permite cambiar el driver de un modelo con dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo);

    $this->actingAs($this->admin)
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['num_canales' => 3, 'driver' => 'modbus_tcp']))
        ->assertSessionHasErrors('driver');

    expect($modelo->fresh()->driver->value)->toBe('shelly_cloud');
});

it('en edición conserva el código y permite desactivar aunque tenga dispositivos', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-pro-3em')->first();
    dispositivoConModelo($modelo);

    $this->actingAs($this->admin)
        ->put("/admin/modelos-dispositivo/{$modelo->id}", modeloValido(['codigo' => 'otro-codigo', 'num_canales' => 3, 'driver' => 'shelly_cloud', 'activo' => false]))
        ->assertRedirect(route('admin.modelos-dispositivo.index'));

    expect($modelo->fresh()->codigo)->toBe('shelly-pro-3em')
        ->and($modelo->fresh()->activo)->toBeFalse();
});

it('no elimina un modelo con dispositivos y sí uno sin ellos', function () {
    $conUso = ModeloDispositivo::where('codigo', 'shelly-3em')->first();
    dispositivoConModelo($conUso);
    $sinUso = ModeloDispositivo::where('codigo', 'circutor-cvm-e3-mini-mc-wieth')->first();

    $this->actingAs($this->admin)->delete("/admin/modelos-dispositivo/{$conUso->id}")->assertSessionHasErrors('error');
    $this->actingAs($this->admin)->delete("/admin/modelos-dispositivo/{$sinUso->id}")->assertRedirect(route('admin.modelos-dispositivo.index'));

    expect(ModeloDispositivo::find($conUso->id))->not->toBeNull()
        ->and(ModeloDispositivo::find($sinUso->id))->toBeNull();
});

it('las páginas de alta y edición reciben las opciones de los enums', function () {
    $modelo = ModeloDispositivo::where('codigo', 'shelly-3em')->first();

    $this->actingAs($this->admin)->get('/admin/modelos-dispositivo/create')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Create')
            ->has('opciones.drivers', 3)
            ->has('opciones.modos', 2)
            ->has('opciones.magnitudes', 12));

    $this->actingAs($this->admin)->get("/admin/modelos-dispositivo/{$modelo->id}/edit")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/ModelosDispositivo/Edit')
            ->where('modelo.codigo', 'shelly-3em')
            ->has('opciones.drivers', 3));
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `php artisan test --filter=ModelosDispositivoTest`
Expected: FAIL (404 en las rutas: aún no existen).

- [ ] **Step 3: Crear el FormRequest**

`app/Http/Requests/GuardarModeloDispositivoRequest.php`:

```php
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
```

- [ ] **Step 4: Crear el controlador y la ruta**

`app/Http/Controllers/Admin/ModeloDispositivoController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DriverDispositivo;
use App\Enums\Magnitud;
use App\Enums\ModoCanales;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarModeloDispositivoRequest;
use App\Models\ModeloDispositivo;
use Inertia\Inertia;

class ModeloDispositivoController extends Controller
{
    public function index()
    {
        $this->autorizar();

        $modelos = ModeloDispositivo::withCount(['dispositivos' => fn ($query) => $query->withTrashed()])
            ->orderBy('fabricante')
            ->orderBy('nombre')
            ->get()
            ->map(fn (ModeloDispositivo $modelo) => $this->aArray($modelo));

        return Inertia::render('Admin/ModelosDispositivo/Index', ['modelos' => $modelos]);
    }

    public function create()
    {
        $this->autorizar();

        return Inertia::render('Admin/ModelosDispositivo/Create', ['opciones' => $this->opciones()]);
    }

    public function store(GuardarModeloDispositivoRequest $request)
    {
        ModeloDispositivo::create($request->validated());

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo creado correctamente.');
    }

    public function edit(ModeloDispositivo $modelo)
    {
        $this->autorizar();
        $modelo->loadCount(['dispositivos' => fn ($query) => $query->withTrashed()]);

        return Inertia::render('Admin/ModelosDispositivo/Edit', [
            'modelo' => $this->aArray($modelo),
            'opciones' => $this->opciones(),
        ]);
    }

    public function update(GuardarModeloDispositivoRequest $request, ModeloDispositivo $modelo)
    {
        $modelo->update($request->validated());

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo actualizado correctamente.');
    }

    public function destroy(ModeloDispositivo $modelo)
    {
        $this->autorizar();

        if (! $modelo->esBorrable()) {
            return back()->withErrors(['error' => 'No se puede eliminar porque hay dispositivos usando este modelo.']);
        }

        $modelo->delete();

        return redirect()->route('admin.modelos-dispositivo.index')
            ->with('success', 'Modelo eliminado correctamente.');
    }

    private function autorizar(): void
    {
        abort_unless(auth()->user()->esAdminOTecnico(), 403);
    }

    private function opciones(): array
    {
        return [
            'drivers' => DriverDispositivo::opcionesParaFormulario(),
            'modos' => ModoCanales::opcionesParaFormulario(),
            'magnitudes' => Magnitud::opcionesParaFormulario(),
        ];
    }

    private function aArray(ModeloDispositivo $modelo): array
    {
        return [
            'id' => $modelo->id,
            'codigo' => $modelo->codigo,
            'fabricante' => $modelo->fabricante,
            'familia' => $modelo->familia,
            'nombre' => $modelo->nombre,
            'driver' => $modelo->driver->value,
            'driver_label' => $modelo->driver->label(),
            'driver_disponible' => $modelo->driver->disponible(),
            'num_canales' => $modelo->num_canales,
            'modo_canales_por_defecto' => $modelo->modo_canales_por_defecto->value,
            'modo_canales_configurable' => $modelo->modo_canales_configurable,
            'magnitudes' => $modelo->magnitudes ?? [],
            'activo' => $modelo->activo,
            'notas' => $modelo->notas,
            'dispositivos_count' => $modelo->dispositivos_count ?? 0,
        ];
    }
}
```

En `routes/web.php`, justo después del recurso `admin/credenciales-shelly` (líneas 67-69):

```php
    Route::resource('admin/modelos-dispositivo', \App\Http\Controllers\Admin\ModeloDispositivoController::class)
        ->names('admin.modelos-dispositivo')
        ->parameters(['modelos-dispositivo' => 'modelo'])
        ->except(['show']);
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `php artisan test --filter=ModelosDispositivoTest`
Expected: PASS (9 tests). Si el test de la página falla por «component not found», es normal hasta la Tarea 6 solo si Inertia intenta resolver el fichero; con `assertInertia` no lo resuelve.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Requests/GuardarModeloDispositivoRequest.php app/Http/Controllers/Admin/ModeloDispositivoController.php routes/web.php tests/Unit/Admin
git commit -m "feat: CRUD admin del catálogo de modelos con reglas de negocio" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Páginas admin del catálogo y botón en el panel

**Files:**
- Create: `resources/js/components/modelos-dispositivo/formulario-modelo.tsx`
- Create: `resources/js/pages/Admin/ModelosDispositivo/Index.tsx`, `Create.tsx`, `Edit.tsx`
- Modify: `resources/js/pages/Admin/ControlPanel.tsx:15-24` (import) y `:234-243` (botón)

**Interfaces:**
- Consumes: props de la Tarea 5 (`modelos`, `modelo`, `opciones`).
- Produces: tipos exportados `ModeloDispositivo`, `OpcionesFormulario` desde `formulario-modelo.tsx`.

No hay test automático de React en el proyecto; la verificación es `npm run types`, `npm run lint` y comprobar las tres páginas en el navegador con un usuario admin.

- [ ] **Step 1: Crear el formulario compartido**

`resources/js/components/modelos-dispositivo/formulario-modelo.tsx`:

```tsx
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { router, useForm } from '@inertiajs/react';

export interface CampoConexion {
    nombre: string;
    etiqueta: string;
    tipo: 'texto' | 'entero';
    requerido: boolean;
    default: number | string | null;
}

export interface OpcionDriver {
    value: string;
    label: string;
    disponible: boolean;
    campos_conexion: CampoConexion[];
}

export interface OpcionesFormulario {
    drivers: OpcionDriver[];
    modos: { value: string; label: string }[];
    magnitudes: { value: string; label: string }[];
}

export interface ModeloDispositivo {
    id: number;
    codigo: string;
    fabricante: string;
    familia: string | null;
    nombre: string;
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    num_canales: number;
    modo_canales_por_defecto: string;
    modo_canales_configurable: boolean;
    magnitudes: string[];
    activo: boolean;
    notas: string | null;
    dispositivos_count: number;
}

type DatosFormulario = {
    codigo: string;
    fabricante: string;
    familia: string;
    nombre: string;
    driver: string;
    num_canales: number;
    modo_canales_por_defecto: string;
    modo_canales_configurable: boolean;
    magnitudes: string[];
    activo: boolean;
    notas: string;
};

interface Props {
    opciones: OpcionesFormulario;
    modelo?: ModeloDispositivo;
}

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

function proponerCodigo(fabricante: string, nombre: string): string {
    return `${fabricante} ${nombre}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function FormularioModelo({ opciones, modelo }: Props) {
    const modoEdicion = modelo !== undefined;
    const { data, setData, post, put, processing, errors } = useForm<DatosFormulario>({
        codigo: modelo?.codigo ?? '',
        fabricante: modelo?.fabricante ?? '',
        familia: modelo?.familia ?? '',
        nombre: modelo?.nombre ?? '',
        driver: modelo?.driver ?? opciones.drivers[0]?.value ?? '',
        num_canales: modelo?.num_canales ?? 3,
        modo_canales_por_defecto: modelo?.modo_canales_por_defecto ?? 'fases',
        modo_canales_configurable: modelo?.modo_canales_configurable ?? false,
        magnitudes: modelo?.magnitudes ?? [],
        activo: modelo?.activo ?? true,
        notas: modelo?.notas ?? '',
    });

    const driverElegido = opciones.drivers.find((driver) => driver.value === data.driver);

    const actualizarIdentidad = (campo: 'fabricante' | 'nombre', valor: string) => {
        const siguiente = { ...data, [campo]: valor };
        setData({
            ...siguiente,
            codigo: modoEdicion ? data.codigo : proponerCodigo(siguiente.fabricante, siguiente.nombre),
        });
    };

    const alternarMagnitud = (valor: string, marcada: boolean) => {
        setData(
            'magnitudes',
            marcada ? [...data.magnitudes, valor] : data.magnitudes.filter((m) => m !== valor),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modoEdicion) {
            put(`/admin/modelos-dispositivo/${modelo.id}`);
        } else {
            post('/admin/modelos-dispositivo');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="fabricante">
                        Fabricante <span className="text-red-500">*</span>
                    </Label>
                    <Input id="fabricante" value={data.fabricante} onChange={(e) => actualizarIdentidad('fabricante', e.target.value)} required placeholder="Shelly" />
                    <InputError message={errors.fabricante} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="nombre">
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input id="nombre" value={data.nombre} onChange={(e) => actualizarIdentidad('nombre', e.target.value)} required placeholder="Shelly Pro 3EM" />
                    <InputError message={errors.nombre} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="familia">Familia</Label>
                    <Input id="familia" value={data.familia} onChange={(e) => setData('familia', e.target.value)} placeholder="Pro EM" />
                    <InputError message={errors.familia} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="codigo">
                        Código <span className="text-red-500">*</span>
                    </Label>
                    <Input id="codigo" value={data.codigo} onChange={(e) => setData('codigo', e.target.value)} readOnly={modoEdicion} required className="font-mono" />
                    <p className="text-xs text-muted-foreground">
                        {modoEdicion ? 'El código no se puede cambiar: lo usan seeders y logs.' : 'Se propone a partir de fabricante y nombre; puedes ajustarlo antes de guardar.'}
                    </p>
                    <InputError message={errors.codigo} />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="driver">
                        Driver <span className="text-red-500">*</span>
                    </Label>
                    <select id="driver" value={data.driver} onChange={(e) => setData('driver', e.target.value)} className={selectClassName} required>
                        {opciones.drivers.map((driver) => (
                            <option key={driver.value} value={driver.value}>
                                {driver.label} {driver.disponible ? '' : '(pendiente de lector)'}
                            </option>
                        ))}
                    </select>
                    {driverElegido && !driverElegido.disponible && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">Este driver aún no tiene lector: los dispositivos de este modelo se darán de alta pero no se leerán.</p>
                    )}
                    <InputError message={errors.driver} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="num_canales">
                        Nº de canales <span className="text-red-500">*</span>
                    </Label>
                    <select id="num_canales" value={data.num_canales} onChange={(e) => setData('num_canales', parseInt(e.target.value))} className={selectClassName}>
                        {[1, 2, 3].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.num_canales} />
                </div>
            </div>

            <div className="grid gap-3 rounded-md border p-4">
                <Label>Modo de canales por defecto</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                    {opciones.modos.map((modo) => (
                        <label key={modo.value} className="flex items-center gap-2 text-sm">
                            <input type="radio" name="modo_canales_por_defecto" value={modo.value} checked={data.modo_canales_por_defecto === modo.value} onChange={() => setData('modo_canales_por_defecto', modo.value)} />
                            {modo.label}
                        </label>
                    ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={data.modo_canales_configurable} onCheckedChange={(v) => setData('modo_canales_configurable', v === true)} />
                    El instalador puede cambiar el modo en cada dispositivo
                </label>
                <InputError message={errors.modo_canales_por_defecto} />
            </div>

            <div className="grid gap-3 rounded-md border p-4">
                <Label>Magnitudes que aporta</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {opciones.magnitudes.map((magnitud) => (
                        <label key={magnitud.value} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={data.magnitudes.includes(magnitud.value)} onCheckedChange={(v) => alternarMagnitud(magnitud.value, v === true)} />
                            {magnitud.label}
                        </label>
                    ))}
                </div>
                <InputError message={errors.magnitudes} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" value={data.notas} onChange={(e) => setData('notas', e.target.value)} rows={3} />
                <InputError message={errors.notas} />
            </div>

            <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={data.activo} onCheckedChange={(v) => setData('activo', v === true)} />
                Activo (seleccionable al dar de alta dispositivos)
            </label>

            <div className="flex gap-3">
                <Button type="submit" disabled={processing} className="flex-1">
                    {processing ? 'Guardando...' : modoEdicion ? 'Guardar cambios' : 'Crear modelo'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/modelos-dispositivo')} className="flex-1">
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Crear las páginas Create y Edit**

`resources/js/pages/Admin/ModelosDispositivo/Create.tsx`:

```tsx
import FormularioModelo, { type OpcionesFormulario } from '@/components/modelos-dispositivo/formulario-modelo';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control Global', href: '/admin/control-panel' },
    { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
    { title: 'Nuevo modelo', href: '#' },
];

export default function ModelosDispositivoCreate({ opciones }: { opciones: OpcionesFormulario }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo modelo compatible" />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuevo modelo compatible</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Describe el equipo: fabricante, driver de captura, canales y magnitudes.</p>
                    </div>
                    <Card>
                        <CardContent className="p-6">
                            <FormularioModelo opciones={opciones} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
```

`resources/js/pages/Admin/ModelosDispositivo/Edit.tsx`:

```tsx
import FormularioModelo, { type ModeloDispositivo, type OpcionesFormulario } from '@/components/modelos-dispositivo/formulario-modelo';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    modelo: ModeloDispositivo;
    opciones: OpcionesFormulario;
}

export default function ModelosDispositivoEdit({ modelo, opciones }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Panel de Control Global', href: '/admin/control-panel' },
        { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
        { title: modelo.nombre, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${modelo.nombre}`} />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {modelo.fabricante} {modelo.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {modelo.dispositivos_count} dispositivo(s) usan este modelo. Con dispositivos no se puede cambiar el driver ni reducir canales configurados.
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-6">
                            <FormularioModelo opciones={opciones} modelo={modelo} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
```

- [ ] **Step 3: Crear la página Index**

`resources/js/pages/Admin/ModelosDispositivo/Index.tsx`:

```tsx
import { type ModeloDispositivo } from '@/components/modelos-dispositivo/formulario-modelo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control Global', href: '/admin/control-panel' },
    { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
];

export default function ModelosDispositivoIndex({ modelos }: { modelos: ModeloDispositivo[] }) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;

    const alternarActivo = (modelo: ModeloDispositivo) => {
        router.put(`/admin/modelos-dispositivo/${modelo.id}`, { ...modelo, activo: !modelo.activo }, { preserveScroll: true });
    };

    const eliminar = (modelo: ModeloDispositivo) => {
        if (confirm(`¿Eliminar el modelo ${modelo.fabricante} ${modelo.nombre}?`)) {
            router.delete(`/admin/modelos-dispositivo/${modelo.id}`, { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modelos compatibles" />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Modelos compatibles</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Catálogo de equipos que la plataforma sabe describir y, cuando hay lector, leer.</p>
                    </div>
                    <Button onClick={() => router.visit('/admin/modelos-dispositivo/create')} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo modelo
                    </Button>
                </div>

                {errors?.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{errors.error}</p>}

                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Canales</TableHead>
                                <TableHead className="text-right">Dispositivos</TableHead>
                                <TableHead>Activo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modelos.map((modelo) => (
                                <TableRow key={modelo.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {modelo.fabricante} {modelo.nombre}
                                        </div>
                                        <div className="font-mono text-xs text-muted-foreground">{modelo.codigo}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary">{modelo.driver_label}</Badge>
                                            {!modelo.driver_disponible && <Badge variant="outline">sin lector</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {modelo.num_canales} · {modelo.modo_canales_por_defecto}
                                        {modelo.modo_canales_configurable ? ' (configurable)' : ''}
                                    </TableCell>
                                    <TableCell className="text-right">{modelo.dispositivos_count}</TableCell>
                                    <TableCell>
                                        <input type="checkbox" checked={modelo.activo} onChange={() => alternarActivo(modelo)} aria-label={`Activo: ${modelo.nombre}`} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => router.visit(`/admin/modelos-dispositivo/${modelo.id}/edit`)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={modelo.dispositivos_count > 0}
                                            title={modelo.dispositivos_count > 0 ? 'No puedes eliminar un modelo en uso' : 'Eliminar modelo'}
                                            onClick={() => eliminar(modelo)}
                                            className="text-red-600 disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
```

- [ ] **Step 4: Botón en el Centro de Mando**

En `resources/js/pages/Admin/ControlPanel.tsx`, añadir `Boxes,` a la lista de iconos importados de `lucide-react` (líneas 15-24, en orden alfabético tras `ArrowRight`). Sustituir el botón de la cabecera (líneas 234-243) por los dos botones dentro de un contenedor:

```tsx
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={() => router.visit('/admin/modelos-dispositivo')}
                            variant="outline"
                            className="gap-2"
                        >
                            <Boxes className="h-4 w-4" />
                            Modelos compatibles
                        </Button>
                        <Button
                            onClick={() =>
                                router.visit('/admin/credenciales-shelly')
                            }
                            variant="outline"
                            className="gap-2"
                        >
                            <Key className="h-4 w-4" />
                            Credenciales Shelly
                        </Button>
                    </div>
```

- [ ] **Step 5: Verificar tipos, lint y las páginas**

Run: `npm run types && npm run lint`
Expected: sin errores de tipos ni de lint.

Run: `composer dev` (o `php artisan serve` + `npm run dev`), entrar con un usuario admin, abrir `/admin/control-panel` → «Modelos compatibles»: se listan los 5 modelos sembrados, se crea uno nuevo, se edita (el código queda de solo lectura), el interruptor de activo cambia sin perder el scroll y el borrado de un modelo en uso muestra el error.

- [ ] **Step 6: Commit**

```bash
git add resources/js/components/modelos-dispositivo resources/js/pages/Admin/ModelosDispositivo resources/js/pages/Admin/ControlPanel.tsx
git commit -m "feat: páginas admin del catálogo de modelos y acceso desde el Centro de Mando" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Dispositivos con modelo (backend)

**Files:**
- Create: `app/Http/Requests/GuardarDispositivoRequest.php`
- Modify: `app/Http/Controllers/DispositivosController.php` (`index` líneas 25-28 y 50-56, `show` 121-176, `store` 200-266, `update` 268-315)
- Modify: `routes/api.php:36-45`, `:85-90`, `:140-160`
- Modify: `tests/Unit/DispositivosGlobalPanelTest.php` (esquema y payloads)
- Test: `tests/Unit/DispositivosModeloTest.php`

**Interfaces:**
- Consumes: `ModeloDispositivo`, `Dispositivo::driver()/conexion()/modoCanales()/nombreModelo()`, `DriverDispositivo::reglasConexion()/camposConexion()`, `Lectura::MAX_CANALES`, `EsquemaDispositivos`, `ModeloDispositivoSeeder`.
- Produces:
  - `GuardarDispositivoRequest::atributosParaGuardar(?Dispositivo $existente = null): array`.
  - Props de `Dispositivos/Index`: cada dispositivo añade `modelo` (nombre completo o texto legado), `modelo_dispositivo_id`, `modo_canales`, `driver`, `driver_label`, `driver_disponible`, `conexion`; prop nueva `modelos: {id, fabricante, nombre, activo, driver, driver_label, driver_disponible, num_canales, modo_canales_por_defecto, modo_canales_configurable, campos_conexion}[]`.
  - Props de `Dispositivos/Show`: el dispositivo añade `modelo`, `driver_label`, `driver_disponible`, `conexion_resumen`.
  - Campos que envía el formulario: los actuales menos `modelo`, más `modelo_dispositivo_id`, `modo_canales` y `conexion` (objeto).

- [ ] **Step 1: Escribir el test (falla)**

`tests/Unit/DispositivosModeloTest.php`:

```php
<?php

use App\Events\DashboardLecturaActualizada;
use App\Models\Dispositivo;
use App\Models\ModeloDispositivo;
use App\Models\Organizacion;
use App\Models\Sitio;
use App\Models\User;
use Database\Seeders\ModeloDispositivoSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\EsquemaDispositivos;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    EsquemaDispositivos::crear();
    Event::fake([DashboardLecturaActualizada::class]);
    (new ModeloDispositivoSeeder)->run();
    $this->admin = User::factory()->create(['rol_global' => 'admin']);
    $org = Organizacion::create(['nombre' => 'Org', 'codigo' => 'org', 'activa' => true]);
    $this->sitio = Sitio::create(['organizacion_id' => $org->id, 'nombre' => 'Sitio', 'codigo' => 'sitio', 'activa' => true]);
});

afterEach(fn () => EsquemaDispositivos::eliminar());

function idModelo(string $codigo): int
{
    return ModeloDispositivo::where('codigo', $codigo)->value('id');
}

function payloadDispositivo(TestCase $test, array $cambios = []): array
{
    return array_merge([
        'sitio_id' => $test->sitio->id,
        'device_id' => 'dev-1',
        'nombre' => 'Cuadro',
        'modelo_dispositivo_id' => idModelo('shelly-pro-3em'),
        'modo_canales' => 'circuitos',
        'num_fases' => null,
        'tipo_canal_1' => 'red_electrica',
        'tipo_canal_2' => null,
        'tipo_canal_3' => null,
        'invertir_sentido_canal_1' => false,
        'activo' => true,
        'conexion' => [],
    ], $cambios);
}

it('exige un modelo activo al crear', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => null]))
        ->assertSessionHasErrors('modelo_dispositivo_id');

    ModeloDispositivo::where('codigo', 'shelly-3em')->update(['activo' => false]);

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-3em')]))
        ->assertSessionHasErrors('modelo_dispositivo_id');
});

it('rechaza canales por encima de los del modelo', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('shelly-pro-em-50'),
            'tipo_canal_3' => 'fotovoltaica',
        ]))
        ->assertSessionHasErrors('tipo_canal_3');
});

it('exige los campos de conexión del driver y los guarda en configuracion.conexion', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
            'modo_canales' => 'fases',
        ]))
        ->assertSessionHasErrors('conexion.host');

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, [
            'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
            'modo_canales' => 'fases',
            'tipo_canal_1' => 'red_electrica',
            'invertir_sentido_canal_1' => true,
            'conexion' => ['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1],
        ]))
        ->assertRedirect(route('dispositivos.index'));

    $dispositivo = Dispositivo::where('device_id', 'dev-1')->first();

    expect($dispositivo->conexion())->toBe(['host' => '192.168.1.50', 'port' => 502, 'unit_id' => 1])
        ->and($dispositivo->num_fases)->toBe(3)
        ->and($dispositivo->tipo_canal_3)->toBe('red_electrica')
        ->and($dispositivo->invertir_sentido_canal_3)->toBeTrue()
        ->and($dispositivo->modoCanales()->value)->toBe('fases');
});

it('solo permite cambiar el modo de canales si el modelo es configurable', function () {
    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-pro-em-50'), 'modo_canales' => 'fases']))
        ->assertSessionHasErrors('modo_canales');

    $this->actingAs($this->admin)
        ->post('/dispositivos', payloadDispositivo($this, ['modelo_dispositivo_id' => idModelo('shelly-pro-3em'), 'modo_canales' => 'circuitos']))
        ->assertRedirect(route('dispositivos.index'));
});

it('obliga a asignar modelo al editar un dispositivo de legado', function () {
    $legado = Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'viejo', 'nombre' => 'Viejo']);

    $this->actingAs($this->admin)
        ->put("/dispositivos/{$legado->id}", payloadDispositivo($this, ['device_id' => 'viejo', 'modelo_dispositivo_id' => null]))
        ->assertSessionHasErrors('modelo_dispositivo_id');

    $this->actingAs($this->admin)
        ->put("/dispositivos/{$legado->id}", payloadDispositivo($this, ['device_id' => 'viejo']))
        ->assertRedirect(route('dispositivos.index'));

    expect($legado->fresh()->modeloDispositivo->codigo)->toBe('shelly-pro-3em');
});

it('el listado expone los modelos y el nombre del modelo de cada dispositivo', function () {
    Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'a', 'nombre' => 'A', 'modelo_dispositivo_id' => idModelo('shelly-pro-3em')]);

    $this->actingAs($this->admin)->get('/dispositivos')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dispositivos/Index')
            ->has('modelos', 5)
            ->has('modelos.0', fn (Assert $m) => $m->hasAll(['id', 'fabricante', 'nombre', 'activo', 'driver', 'driver_label', 'driver_disponible', 'num_canales', 'modo_canales_por_defecto', 'modo_canales_configurable', 'campos_conexion']))
            ->where('dispositivos.0.modelo', 'Shelly Pro 3EM')
            ->where('dispositivos.0.driver_disponible', true)
            ->where('dispositivos.0.modo_canales', 'circuitos'));
});

it('la ficha resume la conexión y avisa si no hay lector', function () {
    $cvm = Dispositivo::create([
        'sitio_id' => $this->sitio->id, 'device_id' => 'cvm', 'nombre' => 'CVM',
        'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth'),
        'configuracion' => ['conexion' => ['host' => '10.0.0.5', 'port' => 502, 'unit_id' => 7]],
    ]);

    $this->actingAs($this->admin)->get("/dispositivos/{$cvm->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('dispositivo.driver_label', 'Modbus TCP')
            ->where('dispositivo.driver_disponible', false)
            ->where('dispositivo.conexion_resumen', '10.0.0.5:502 · unidad 7'));
});

it('sincronizar muestra el motivo cuando el comando falla', function () {
    $cvm = Dispositivo::create(['sitio_id' => $this->sitio->id, 'device_id' => 'cvm', 'nombre' => 'CVM', 'modelo_dispositivo_id' => idModelo('circutor-cvm-e3-mini-mc-wieth')]);

    Artisan::shouldReceive('call')->once()->with('lecturas:obtener', ['--dispositivo' => $cvm->id])->andReturn(1);
    Artisan::shouldReceive('output')->once()->andReturn("Omitido: el modelo usa Modbus TCP, que aún no tiene lector disponible\n");

    $this->actingAs($this->admin)
        ->from('/dispositivos')
        ->post("/dispositivos/{$cvm->id}/sincronizar")
        ->assertRedirect('/dispositivos')
        ->assertSessionHas('error', fn (string $mensaje) => str_contains($mensaje, 'no tiene lector'));
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `php artisan test --filter=DispositivosModeloTest`
Expected: FAIL (validación actual acepta el payload sin `modelo_dispositivo_id`; `modelos` no existe en las props).

- [ ] **Step 3: Crear `GuardarDispositivoRequest`**

`app/Http/Requests/GuardarDispositivoRequest.php`:

```php
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

        return $reglas + ($modelo?->driver->reglasConexion() ?? []);
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
     */
    public function atributosParaGuardar(?Dispositivo $existente = null): array
    {
        $modelo = $this->modeloElegido();
        $datos = $this->validated();

        $conexion = $datos['conexion'] ?? [];
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
```

- [ ] **Step 4: Adaptar `DispositivosController`**

Imports nuevos: `use App\Http\Requests\GuardarDispositivoRequest;` y `use App\Models\ModeloDispositivo;` (se puede retirar `Illuminate\Validation\Rule` si ya no se usa).

En `index()`: el `with([...])` de la línea 25 añade `'modeloDispositivo'`; en el `map`, sustituir `'modelo' => $dispositivo->modelo,` por:

```php
                    'modelo' => $dispositivo->nombreModelo(),
                    'modelo_dispositivo_id' => $dispositivo->modelo_dispositivo_id,
                    'modo_canales' => $dispositivo->modoCanales()->value,
                    'driver' => $dispositivo->driver()->value,
                    'driver_label' => $dispositivo->driver()->label(),
                    'driver_disponible' => $dispositivo->driver()->disponible(),
                    'conexion' => $dispositivo->conexion(),
```

y en el `Inertia::render('Dispositivos/Index', [...])` añadir `'modelos' => $this->modelosParaFormulario(),`.

En `show()`: `$dispositivo->load('sitio.organizacion')` pasa a `->load(['sitio.organizacion', 'modeloDispositivo'])`; sustituir `'modelo' => $dispositivo->modelo,` por:

```php
                'modelo' => $dispositivo->nombreModelo(),
                'driver_label' => $dispositivo->driver()->label(),
                'driver_disponible' => $dispositivo->driver()->disponible(),
                'conexion_resumen' => $this->resumenConexion($dispositivo),
```

`store()` y `update()` completos:

```php
    public function store(GuardarDispositivoRequest $request)
    {
        $atributos = $request->atributosParaGuardar();

        $sitio = Sitio::findOrFail($atributos['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivoExistente = Dispositivo::withTrashed()
            ->where('device_id', $atributos['device_id'])
            ->first();

        if ($dispositivoExistente) {
            if (! $dispositivoExistente->trashed()) {
                return back()->withErrors([
                    'device_id' => 'Este dispositivo ya esta siendo usado por otra organizacion o sitio.',
                ])->withInput();
            }

            $dispositivoExistente->forceDelete();
        }

        Dispositivo::create($atributos);

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo creado correctamente');
    }

    public function update(GuardarDispositivoRequest $request, Dispositivo $dispositivo)
    {
        $this->ensureCanAccessDispositivo($request, $dispositivo);

        $atributos = $request->atributosParaGuardar($dispositivo);

        $sitio = Sitio::findOrFail($atributos['sitio_id']);
        $this->ensureCanAccessSitio($request, $sitio);

        $dispositivo->update($atributos);

        if (($atributos['num_fases'] ?? null) === null) {
            $dispositivo->actualizarNumFasesAuto();
        }

        return redirect()->route('dispositivos.index')
            ->with('success', 'Dispositivo actualizado correctamente');
    }
```

(El `try/catch` de `QueryException` del `store` original desaparece: la regla `unique` y la comprobación previa ya cubren el caso.)

Métodos privados nuevos al final de la clase:

```php
    private function modelosParaFormulario(): \Illuminate\Support\Collection
    {
        return ModeloDispositivo::orderBy('fabricante')->orderBy('nombre')->get()
            ->map(fn (ModeloDispositivo $modelo) => [
                'id' => $modelo->id,
                'fabricante' => $modelo->fabricante,
                'nombre' => $modelo->nombre,
                'activo' => $modelo->activo,
                'driver' => $modelo->driver->value,
                'driver_label' => $modelo->driver->label(),
                'driver_disponible' => $modelo->driver->disponible(),
                'num_canales' => $modelo->num_canales,
                'modo_canales_por_defecto' => $modelo->modo_canales_por_defecto->value,
                'modo_canales_configurable' => $modelo->modo_canales_configurable,
                'campos_conexion' => $modelo->driver->camposConexion(),
            ]);
    }

    private function resumenConexion(Dispositivo $dispositivo): ?string
    {
        $conexion = $dispositivo->conexion();

        if ($conexion === []) {
            return null;
        }

        $partes = [];

        if (isset($conexion['host'])) {
            $partes[] = $conexion['host'].(isset($conexion['port']) ? ':'.$conexion['port'] : '');
        }
        if (isset($conexion['unit_id'])) {
            $partes[] = "unidad {$conexion['unit_id']}";
        }
        if (isset($conexion['device_instance'])) {
            $partes[] = "instancia {$conexion['device_instance']}";
        }

        return implode(' · ', $partes);
    }
```

- [ ] **Step 5: Actualizar `routes/api.php`**

- Línea 41: `'dispositivos.modelo',` → `'dispositivos.modelo_legacy', 'dispositivos.modelo_dispositivo_id',`; línea 43: `->with(['sitio.organizacion'])` → `->with(['sitio.organizacion', 'modeloDispositivo'])`.
- Línea 87: `'modelo' => $dispositivo->modelo,` → `'modelo' => $dispositivo->nombreModelo(),`.
- Línea 147 (texto SQL): `d.modelo,` → `d.modelo_legacy AS modelo,`.

- [ ] **Step 6: Pasar `DispositivosGlobalPanelTest` al esquema compartido**

En `tests/Unit/DispositivosGlobalPanelTest.php`:

1. Sustituir todo el `beforeEach` (los `dropIfExists` y los cinco `Schema::create`) por:

```php
beforeEach(function () {
    EsquemaDispositivos::crear();
    (new ModeloDispositivoSeeder)->run();
    Event::fake([DashboardLecturaActualizada::class]);
});
```

y el `afterEach` por `afterEach(fn () => EsquemaDispositivos::eliminar());`, añadiendo `use Tests\Support\EsquemaDispositivos;` y `use Database\Seeders\ModeloDispositivoSeeder;` (quitar `Blueprint` y `Schema` si quedan sin uso).
2. Quitar `'modelo' => 'Shelly EM3',` de cada `Dispositivo::create([...])` (ya no es fillable).
3. En el payload del `put` de «allows updating and syncing…», sustituir `'modelo' => 'Shelly Pro EM',` por `'modelo_dispositivo_id' => \App\Models\ModeloDispositivo::where('codigo', 'shelly-pro-3em')->value('id'), 'modo_canales' => 'circuitos', 'conexion' => [],`.

- [ ] **Step 7: Ejecutar y verificar que pasa**

Run: `php artisan test --filter="DispositivosModeloTest|DispositivosGlobalPanelTest"`
Expected: PASS. Después la suite completa: `php artisan test` → todo en verde (los tests que solo leen ficheros fuente, como `DashboardContextHeaderDesignTest`, no cambian).

- [ ] **Step 8: Commit**

```bash
git add app/Http/Requests/GuardarDispositivoRequest.php app/Http/Controllers/DispositivosController.php routes/api.php tests/Unit/DispositivosModeloTest.php tests/Unit/DispositivosGlobalPanelTest.php
git commit -m "feat: alta y edición de dispositivos validadas contra el modelo del catálogo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Formulario y ficha de dispositivo (frontend)

**Files:**
- Create: `resources/js/components/dispositivos/campos-conexion.tsx`
- Modify: `resources/js/pages/Dispositivos/Index.tsx` (interfaces 35-68, estado 80-155, `handleSubmit` 157-195, tabla 337-341 y 381-405, formulario 505-575, 589-611, 614-616, 743, 871, bloques de tipo/inversión de los canales 2 y 3)
- Modify: `resources/js/pages/Dispositivos/Show.tsx` (interfaz 69-73, botón 237-251, bloque «Información» 377-384)

**Interfaces:**
- Consumes: props de la Tarea 7.
- Produces: componente `CamposConexion({ campos, valores, onChange, errors })`.

Verificación: `npm run types`, `npm run lint` y prueba manual con un admin.

- [ ] **Step 1: Componente del bloque «Conexión»**

`resources/js/components/dispositivos/campos-conexion.tsx`:

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CampoConexion {
    nombre: string;
    etiqueta: string;
    tipo: 'texto' | 'entero';
    requerido: boolean;
    default: number | string | null;
}

interface Props {
    campos: CampoConexion[];
    valores: Record<string, string | number>;
    onChange: (valores: Record<string, string | number>) => void;
    errors?: Record<string, string>;
    avisoCredencial?: string | null;
}

/** Valores iniciales de conexión para un driver: los `default` de sus campos. */
export function conexionPorDefecto(campos: CampoConexion[]): Record<string, string | number> {
    return Object.fromEntries(campos.filter((c) => c.default !== null).map((c) => [c.nombre, c.default as string | number]));
}

export default function CamposConexion({ campos, valores, onChange, errors, avisoCredencial }: Props) {
    if (campos.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Este modelo se lee desde Shelly Cloud con el Device ID y la credencial de la organización.
                {avisoCredencial && <span className="ml-1 text-red-600 dark:text-red-400">{avisoCredencial}</span>}
            </p>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {campos.map((campo) => (
                <div key={campo.nombre} className="relative grid gap-2">
                    <Label htmlFor={`conexion_${campo.nombre}`} className="text-xs">
                        {campo.etiqueta} {campo.requerido && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        id={`conexion_${campo.nombre}`}
                        type={campo.tipo === 'entero' ? 'number' : 'text'}
                        value={valores[campo.nombre] ?? ''}
                        onChange={(e) =>
                            onChange({
                                ...valores,
                                [campo.nombre]: campo.tipo === 'entero' && e.target.value !== '' ? parseInt(e.target.value) : e.target.value,
                            })
                        }
                        required={campo.requerido}
                        className="h-9 text-sm"
                    />
                    {errors?.[`conexion.${campo.nombre}`] && <p className="text-xs text-red-600 dark:text-red-400">{errors[`conexion.${campo.nombre}`]}</p>}
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Tipos y estado en `Dispositivos/Index.tsx`**

1. Imports: añadir `import CamposConexion, { conexionPorDefecto, type CampoConexion } from '@/components/dispositivos/campos-conexion';`.
2. En `interface Dispositivo`, tras `modelo: string | null;`:

```ts
    modelo_dispositivo_id: number | null;
    modo_canales: 'circuitos' | 'fases';
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    conexion: Record<string, string | number>;
```

3. Nueva interfaz y prop:

```ts
interface ModeloParaFormulario {
    id: number;
    fabricante: string;
    nombre: string;
    activo: boolean;
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    num_canales: number;
    modo_canales_por_defecto: 'circuitos' | 'fases';
    modo_canales_configurable: boolean;
    campos_conexion: CampoConexion[];
}

interface Props {
    dispositivos: Dispositivo[];
    sitios: Sitio[];
    modelos: ModeloParaFormulario[];
    panel_global_mode: boolean;
}
```

y en la firma del componente `{ dispositivos, sitios, modelos, panel_global_mode }`.

4. En los tres objetos de estado (`useState` inicial, `abrirModalNuevo`, `abrirModalEditar`) sustituir la línea `modelo: …` por:

```ts
        modelo_dispositivo_id: '' as string,
        modo_canales: 'circuitos' as 'circuitos' | 'fases',
        conexion: {} as Record<string, string | number>,
```

y en `abrirModalEditar` esas tres líneas valen `dispositivo.modelo_dispositivo_id?.toString() ?? ''`, `dispositivo.modo_canales`, `dispositivo.conexion ?? {}`.

5. Derivados, justo después de `const [formData, setFormData] = useState({...})`:

```ts
    const modeloElegido = modelos.find((m) => m.id.toString() === formData.modelo_dispositivo_id) ?? null;
    const numCanales = modeloElegido?.num_canales ?? 3;
    const esFases = formData.modo_canales === 'fases';
    const modelosSeleccionables = modelos.filter((m) => m.activo || m.id === dispositivoEditando?.modelo_dispositivo_id);

    const elegirModelo = (id: string) => {
        const modelo = modelos.find((m) => m.id.toString() === id) ?? null;
        setFormData({
            ...formData,
            modelo_dispositivo_id: id,
            modo_canales: modelo?.modo_canales_por_defecto ?? 'circuitos',
            conexion: modelo ? conexionPorDefecto(modelo.campos_conexion) : {},
        });
    };
```

6. En `handleSubmit`, dentro de `datosEnvio`, añadir `modelo_dispositivo_id: formData.modelo_dispositivo_id ? parseInt(formData.modelo_dispositivo_id) : null,` (el resto se envía tal cual: `modo_canales` y `conexion` ya están en `formData`).

- [ ] **Step 3: Selector de modelo, modo de canales y conexión en el formulario**

Sustituir el bloque del campo «Modelo» (el `<div className="relative grid gap-2">` con `<Label htmlFor="modelo">` y su `<Input id="modelo" …>`) por:

```tsx
                                <div className="relative grid gap-2">
                                    <Label htmlFor="modelo_dispositivo_id">
                                        Modelo <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="modelo_dispositivo_id"
                                        value={formData.modelo_dispositivo_id}
                                        onChange={(e) => elegirModelo(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        required
                                    >
                                        <option value="">Selecciona un modelo</option>
                                        {modelosSeleccionables.map((modelo) => (
                                            <option key={modelo.id} value={modelo.id}>
                                                {modelo.fabricante} {modelo.nombre}
                                                {modelo.driver_disponible ? '' : ' (sin lector)'}
                                            </option>
                                        ))}
                                    </select>
                                    {modeloElegido && !modeloElegido.driver_disponible && (
                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                            Aún sin lector: el dispositivo se guardará pero no se leerán datos.
                                        </p>
                                    )}
                                    {errors?.modelo_dispositivo_id && (
                                        <p className="text-sm text-red-600 dark:text-red-400">{errors.modelo_dispositivo_id}</p>
                                    )}
                                </div>
```

Justo después de ese `grid` de dos columnas (dentro del mismo bloque «Datos Básicos»), añadir el modo de canales y la conexión:

```tsx
                            {modeloElegido?.modo_canales_configurable && (
                                <div className="grid gap-2">
                                    <Label>Modo de canales</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                                        {(['circuitos', 'fases'] as const).map((modo) => (
                                            <label key={modo} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="radio"
                                                    name="modo_canales"
                                                    value={modo}
                                                    checked={formData.modo_canales === modo}
                                                    onChange={() => setFormData({ ...formData, modo_canales: modo })}
                                                />
                                                {modo === 'circuitos' ? 'Circuitos independientes' : 'Fases de un mismo circuito'}
                                            </label>
                                        ))}
                                    </div>
                                    {errors?.modo_canales && <p className="text-sm text-red-600 dark:text-red-400">{errors.modo_canales}</p>}
                                </div>
                            )}

                            {modeloElegido && (
                                <div className="grid gap-2">
                                    <Label>Conexión</Label>
                                    <CamposConexion
                                        campos={modeloElegido.campos_conexion}
                                        valores={formData.conexion}
                                        onChange={(conexion) => setFormData({ ...formData, conexion })}
                                        errors={errors}
                                    />
                                </div>
                            )}
```

- [ ] **Step 4: Canales adaptados al modelo**

1. Envolver el `<div className="relative grid gap-2 sm:w-1/2">` del select `num_fases` en `{!esFases && ( … )}`.
2. Condiciones de visibilidad: `{(!formData.num_fases || formData.num_fases >= 1) && (` → `{numCanales >= 1 && (`; `{formData.num_fases && formData.num_fases >= 2 && (` → `{numCanales >= 2 && (`; `{formData.num_fases && formData.num_fases >= 3 && (` → `{numCanales >= 3 && (`.
3. En el canal 1, el `<Label htmlFor="tipo_canal_1">` pasa a `{esFases ? 'Tipo (todas las fases)' : 'Tipo'}` y el de inversión a `{esFases ? 'Invertir sentido (todas las fases)' : 'Invertir sentido'}`.
4. En los canales 2 y 3, envolver el `<div className="relative grid gap-2">` del `select` de tipo y el `<div className="flex items-center gap-2 pt-6">` de la inversión en `{!esFases && ( … )}` (el servidor replica el valor del canal 1).
5. Placeholders de nombre: en el canal N, `placeholder={esFases ? \`L${N}\` : 'Ej: Consumo General'}`.
6. Mensajes de error por canal: debajo de cada `select` de tipo, `{errors?.[\`tipo_canal_${N}\`] && <p className="text-xs text-red-600">{errors[\`tipo_canal_${N}\`]}</p>}`.

- [ ] **Step 5: Tabla y sincronización**

1. En la celda del nombre (línea 339-341), tras `{dispositivo.modelo}` añadir `{!dispositivo.driver_disponible && <span className="ml-1 text-amber-700 dark:text-amber-400">· sin lector</span>}`.
2. Botón de sincronizar (líneas 381-405): `disabled={sincronizando === dispositivo.id || !dispositivo.driver_disponible}`, clase `cursor-not-allowed text-gray-400` también cuando `!dispositivo.driver_disponible`, y `title={dispositivo.driver_disponible ? 'Sincronizar manualmente' : 'Este modelo aún no tiene lector'}`.

- [ ] **Step 6: Ficha (`Show.tsx`)**

1. Interfaz `Dispositivo`: tras `modelo: string | null;` añadir `driver_label: string; driver_disponible: boolean; conexion_resumen: string | null;`.
2. Botón «Sincronizar» (líneas 237-251): `disabled={sincronizando || !dispositivo.driver_disponible}`, clase gris también cuando `!dispositivo.driver_disponible`, y `title={dispositivo.driver_disponible ? undefined : 'Este modelo aún no tiene lector'}`.
3. En «Información del Dispositivo», tras el bloque `{dispositivo.modelo && (…)}` añadir:

```tsx
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Server className="h-4 w-4" />
                                    <span className="font-medium">Driver:</span>
                                    <span>{dispositivo.driver_label}</span>
                                    {!dispositivo.driver_disponible && <span className="text-amber-700 dark:text-amber-400">(sin lector)</span>}
                                </div>
                                {dispositivo.conexion_resumen && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Server className="h-4 w-4" />
                                        <span className="font-medium">Conexión:</span>
                                        <span className="font-mono">{dispositivo.conexion_resumen}</span>
                                    </div>
                                )}
```

- [ ] **Step 7: Verificar**

Run: `npm run types && npm run lint && php artisan test`
Expected: sin errores; suite en verde.

Prueba manual con un admin en `/dispositivos`: al elegir «Shelly Pro EM 50» aparecen dos canales y no hay radio de modo; con «Shelly Pro 3EM» aparece el radio y, en «fases», los canales 2 y 3 pierden tipo e inversión; con «Circutor CVM-E3-MINI» aparecen host/puerto/unidad rellenos con 502/1 y el aviso «sin lector»; el botón de sincronizar queda deshabilitado para ese dispositivo; editar un dispositivo de legado sin modelo obliga a elegir uno.

- [ ] **Step 8: Commit**

```bash
git add resources/js/components/dispositivos resources/js/pages/Dispositivos
git commit -m "feat: formulario y ficha de dispositivo adaptados al modelo del catálogo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Cierre

- [ ] Ejecutar la suite completa (`php artisan test`), `npm run types`, `npm run lint` y `npm run build`.
- [ ] Desplegar con `actualizar-produccion.sh` (ya apunta a `/var/www/energiaMonitor`): `php artisan migrate --pretend` primero y después `migrate --force`; comprobar en `/admin/modelos-dispositivo` que hay 5 modelos y en `/dispositivos` que los 7 dispositivos tienen modelo asignado (`modelo_legacy` solo sirve de traza); `php artisan schedule:list` muestra `lecturas:obtener`; el log `shelly-readings` sigue registrando «Lectura exitosa» cada 3 minutos y ya no contiene `key_start`.
- [ ] Actualizar en el vault Fury las páginas [[Modelo de Datos]], [[Integraciones y Tareas Programadas]] y [[Rutas y Funcionalidades]] de EnergiaMonitor con el catálogo, el comando nuevo y las rutas admin.

## Autorrevisión del plan

- **Cobertura del spec:** modelo de datos (T3), enums y campos de conexión (T2), lector y contrato (T1), comando con omitidos/códigos de salida/alias/sincronizar (T4), CRUD admin con las cuatro reglas de negocio (T5), páginas admin y botón (T6), formulario adaptativo, validación por modelo, listado/ficha y sincronizar deshabilitado (T7-T8), migraciones, seed, asignación del legado y despliegue (T3 y Cierre), manejo de errores (T1, T4, T5, T7), tests (todas).
- **Consistencia de nombres:** `LectorDispositivo::leer(Dispositivo, int $timeoutSegundos = 10)`, `pausaEntreLecturasMs()`, `LecturaNoDisponible`, `DriverDispositivo::{camposConexion, reglasConexion, lector, disponible, opcionesParaFormulario}`, `ModeloDispositivo::{esBorrable, nombreCompleto, scopeActivos}`, `Dispositivo::{modeloDispositivo, driver, conexion, modoCanales, nombreModelo}`, `GuardarDispositivoRequest::atributosParaGuardar(?Dispositivo)`, `EsquemaDispositivos::{crear, eliminar}`, comando `lecturas:obtener` con alias `shelly:obtener-lecturas`. Los props del frontend usan exactamente las claves que producen los controladores.
- **Sin placeholders:** cada paso de código lleva el código; los dos movimientos verbatim (T1) citan las líneas exactas del fichero de origen, que sigue en el repo hasta que se borra en la T4.
