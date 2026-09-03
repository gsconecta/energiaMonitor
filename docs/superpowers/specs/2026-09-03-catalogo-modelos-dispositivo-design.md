# Catálogo de modelos de dispositivo compatibles — Diseño

## Alcance

EnergiaMonitor solo sabe leer medidores Shelly y guarda el modelo del dispositivo como texto libre (`dispositivos.modelo`, con cuatro grafías en producción para tres familias). Este cambio introduce un **catálogo de modelos compatibles** gestionado desde el panel de administración, del que cuelga cada dispositivo, y que decide por modelo:

1. **Identidad**: fabricante, familia y nombre normalizados.
2. **Capacidades**: número de canales, cómo se interpretan (circuitos independientes o fases de un circuito) y qué magnitudes aporta.
3. **Captura**: el driver (protocolo) y los datos de conexión que pide cada dispositivo.

Decisiones tomadas en el brainstorming del 2026-09-03:

- El catálogo vive en base de datos con **CRUD real** desde `/admin`; el `driver` se elige de una lista cerrada definida en código. Añadir un modelo de una familia ya soportada no requiere despliegue; un protocolo nuevo sí.
- El tope de canales por modelo es **3**, porque `lecturas` guarda los canales en columnas (`*_canal_1..3`). El catálogo declara `num_canales` y lo valida contra `Lectura::MAX_CANALES`, de modo que el tope es una regla, no una limitación estructural del catálogo.
- El modo de canales tiene un valor por defecto en el catálogo y, cuando el modelo lo permite, se fija por instalación en el dispositivo, porque el mismo hardware (Shelly 3EM, Pro 3EM) se usa en producción tanto para medir dos circuitos distintos como para medir las tres fases de uno.

Fuera de alcance, a propósito: implementar los lectores Modbus TCP y BACnet/IP; rediseñar `lecturas` para N canales o magnitudes nuevas; retención y agregados; cadencia o paralelismo del colector; eliminar la columna `modelo_legacy` (limpieza posterior).

## Modelo de datos

### Tabla `modelos_dispositivo`

| Columna | Tipo | Regla |
|---|---|---|
| `id` | bigint | |
| `codigo` | string(60), único | slug estable (`shelly-pro-3em`); lo usan seeders, migraciones y logs; inmutable tras el alta |
| `fabricante` | string(60) | obligatorio |
| `familia` | string(60), nullable | texto libre para agrupar el listado |
| `nombre` | string(120) | obligatorio, nombre comercial visible |
| `driver` | string(30) | valor del enum `DriverDispositivo` |
| `num_canales` | tinyint | entre 1 y `Lectura::MAX_CANALES` (3) |
| `modo_canales_por_defecto` | string(20) | valor del enum `ModoCanales` |
| `modo_canales_configurable` | boolean | si el instalador puede cambiar el modo en cada dispositivo |
| `magnitudes` | json | lista de valores del enum `Magnitud`; descriptiva (qué mostrar), no altera `lecturas` |
| `activo` | boolean, default true | si aparece en el selector de alta de dispositivos |
| `notas` | text, nullable | |
| `created_at` / `updated_at` | | sin soft-deletes: el borrado se bloquea si hay dispositivos que usan el modelo |

### Cambios en `dispositivos`

- `modelo_dispositivo_id`: FK nullable a `modelos_dispositivo` con `restrictOnDelete`. Nullable solo para el legado (ver «Migración»); el formulario lo exige al crear y al guardar.
- `modo_canales`: string(20), valor del enum `ModoCanales`, obligatorio, default `circuitos`.
- `modelo` se renombra a `modelo_legacy` y deja de escribirse. Se conserva para trazabilidad hasta una limpieza posterior.
- `configuracion` (JSON existente sin uso) guarda la conexión bajo la clave `conexion`, con la forma que dicta el driver del modelo. El resto del JSON no se toca.
- `device_id` sigue siendo el identificador único de todo dispositivo (para Circutor, el número de serie).
- `num_fases` se mantiene. Al guardar un dispositivo con `modo_canales = fases` se rellena con `num_canales` del modelo; con `circuitos` sigue como hasta ahora (nullable, autodetección Shelly intacta).

### Enums (`app/Enums/`, carpeta nueva)

**`DriverDispositivo`** (`string`): `ShellyCloud = 'shelly_cloud'`, `ModbusTcp = 'modbus_tcp'`, `BacnetIp = 'bacnet_ip'`.

- `label(): string` — «Shelly Cloud», «Modbus TCP», «BACnet/IP».
- `camposConexion(): array` — definición de los campos que pide por dispositivo, cada uno con `nombre`, `etiqueta`, `tipo` (`texto`|`entero`), `requerido`, `default` y `reglas` de validación Laravel:

  | Driver | Campos |
  |---|---|
  | `shelly_cloud` | ninguno: usa `device_id` («ID Shelly Cloud») y la credencial de la organización |
  | `modbus_tcp` | `host` (obligatorio, IP o nombre), `port` (entero 1–65535, default 502), `unit_id` (entero 1–247, default 1) |
  | `bacnet_ip` | `host` (obligatorio), `port` (entero 1–65535, default 47808), `device_instance` (entero 0–4194302, obligatorio) |

- `lector(): ?LectorDispositivo` — resuelve la implementación desde el contenedor (`app(ShellyCloudLector::class)` para `shelly_cloud`); `null` para los drivers sin lector.
- `disponible(): bool` — `lector() !== null`.

**`ModoCanales`** (`string`): `Circuitos = 'circuitos'` (cada canal es un circuito distinto: fotovoltaica, red…), `Fases = 'fases'` (los canales son L1–L3 de un mismo circuito).

**`Magnitud`** (`string`): `potencia_activa`, `potencia_reactiva`, `potencia_aparente`, `tension`, `corriente`, `corriente_neutro`, `factor_potencia`, `frecuencia`, `energia_activa_importada`, `energia_activa_exportada`, `energia_reactiva`, `thd`. Con `label()`.

### Eloquent

- `ModeloDispositivo`: `$fillable` con todas las columnas editables; casts `driver` → `DriverDispositivo`, `modo_canales_por_defecto` → `ModoCanales`, `magnitudes` → array, booleanos; `hasMany Dispositivo`; scope `activos()`; `esBorrable(): bool` (sin dispositivos).
- `Dispositivo`: `belongsTo ModeloDispositivo` (`modeloDispositivo()`), cast `modo_canales` → `ModoCanales`; `driver(): DriverDispositivo` (devuelve `ShellyCloud` si no hay modelo asignado); `conexion(): array` (`configuracion['conexion'] ?? []`); `getNombreCanal()` propone `L1`/`L2`/`L3` cuando `modo_canales = fases` y no hay nombre guardado.
- `Lectura::MAX_CANALES = 3`, única fuente del tope.

Usos actuales de `dispositivos.modelo` que pasan a la relación (`modeloDispositivo?->nombre ?? modelo_legacy`): `DispositivosController` (índice, ficha y ambas validaciones), `Dispositivo::$fillable`, `routes/api.php` (el `select` y el `map` del endpoint de n8n, y el texto SQL de `/sql-dispositivos-activos`), `Dispositivos/Index.tsx` y `Dispositivos/Show.tsx`.

## Drivers y colector

### Contrato

```php
interface LectorDispositivo
{
    /** @return array atributos normalizados para Lectura::create() */
    public function leer(Dispositivo $dispositivo): array;

    public function pausaEntreLecturasMs(): int;
}
```

Excepción `LecturaNoDisponible` (con `motivo`): equipo fuera de línea o inalcanzable, respuesta inválida, formato desconocido, organización sin credencial. Ubicación: `app/Services/Lectores/`.

### `ShellyCloudLector`

Es el código actual de `ObtenerLecturasShelly` extraído a una clase: petición `GET {server}/device/status`, validación de `isok` y `data`, normalización de los tres formatos (`em:0` trifásico, `em1:x` de dos canales, `emeters` antiguo con Wh→kWh), reactiva por `√(S²−P²)`, voltaje promedio, fecha desde `ts`/`sys.unixtime` en `Europe/Madrid`, y `datos_raw` podado. `pausaEntreLecturasMs()` devuelve 1000 (el `sleep(1)` actual, por el límite de peticiones de la API de Shelly).

Dos cambios de comportamiento respecto a hoy, ambos hallazgos del análisis del 2026-09-03:

- Si el JSON no encaja en ningún formato conocido, lanza `LecturaNoDisponible('formato de respuesta desconocido')` en vez de guardar una lectura con todos los valores a cero.
- Se elimina la línea de log que escribía la longitud y los cinco primeros caracteres de la API key en cada consulta.

### Comando `lecturas:obtener`

Sustituye a `shelly:obtener-lecturas`, que se mantiene como alias (`$aliases`) durante una versión. `routes/console.php` pasa a programar el nombre nuevo. Opciones `--dispositivo` y `--timeout` sin cambios.

Por cada dispositivo activo de una organización activa (la condición actual de «tener credencial Shelly» desaparece de la consulta: es el lector quien la comprueba):

1. `driver = $dispositivo->driver()`; `lector = driver->lector()`.
2. Sin lector ⇒ se cuenta como **omitido**, se registra una vez por ejecución en el canal `shelly_readings` («modelo X sin lector disponible») y se pasa al siguiente. No es un error.
3. Con lector ⇒ `lector->leer()`, `Lectura::create()`, y sin cambios: evaluación de umbrales, `actualizarNumFasesAuto()`, broadcast por el evento del modelo.
4. `LecturaNoDisponible` ⇒ aviso con el motivo, cuenta como error, continúa. Cualquier otra excepción ⇒ error con traza, cuenta como error, continúa.
5. Entre dispositivos se espera `pausaEntreLecturasMs()` del lector usado.

El resumen final muestra Exitosos, Errores, **Omitidos** y Fases actualizadas. Código de salida: con `--dispositivo`, `FAILURE` si ese dispositivo no se leyó (error u omitido), para que la sincronización manual pueda informar; en ejecución completa, `FAILURE` solo si hubo errores y ningún éxito. Una ejecución en la que todo queda omitido termina en `SUCCESS` con aviso, para no disparar `onFailure` cada tres minutos por modelos que aún no tienen lector.

### Sincronización manual

`DispositivosController::sincronizar` comprueba el código de salida de `Artisan::call('lecturas:obtener', ['--dispositivo' => …])` y devuelve error con la salida del comando cuando no es `SUCCESS`. Hoy responde «sincronizado correctamente» aunque el comando falle.

## Panel admin

### Rutas y autorización

`Route::resource('admin/modelos-dispositivo', Admin\ModeloDispositivoController::class)->names('admin.modelos-dispositivo')->parameters(['modelos-dispositivo' => 'modelo'])->except(['show'])`. Cada acción exige `esAdminOTecnico()` con `abort(403)`, como el resto del área admin. En la cabecera del «Centro de Mando Técnico» se añade el botón **«Modelos compatibles»** junto a «Credenciales Shelly».

### Páginas (`resources/js/pages/Admin/ModelosDispositivo/`)

- `Index.tsx`: tabla ordenada por fabricante y nombre con driver (badge; badge adicional «sin lector» si `driver_disponible` es falso), canales (`3 · fases`, `2 · circuitos`), nº de dispositivos que lo usan, interruptor de activo y acciones editar/eliminar. Props: `modelos[]` con `id, codigo, fabricante, familia, nombre, driver, driver_label, driver_disponible, num_canales, modo_canales_por_defecto, modo_canales_configurable, magnitudes, activo, dispositivos_count`.
- `Create.tsx` / `Edit.tsx`: fabricante, familia, nombre, código (propuesto desde fabricante + nombre; editable solo en el alta, de solo lectura en edición), driver (select con etiqueta y estado disponible/pendiente), nº de canales (1–3), modo por defecto (radio) y «configurable por dispositivo» (checkbox), magnitudes (checkboxes), activo, notas. Props: `drivers[]`, `modos[]`, `magnitudes[]` con valor y etiqueta.

### Validación y reglas de negocio

`GuardarModeloDispositivoRequest`, compartido por `store` y `update`:

- `codigo` obligatorio, `alpha_dash`, máx. 60, único (ignorando el propio registro en edición); en edición se ignora cualquier valor recibido y se conserva el existente.
- `fabricante`, `nombre` obligatorios; `familia`, `notas` opcionales.
- `driver` `Rule::enum(DriverDispositivo::class)`; `modo_canales_por_defecto` `Rule::enum(ModoCanales::class)`; `magnitudes` array de `Rule::enum(Magnitud::class)`, sin duplicados.
- `num_canales` entero entre 1 y `Lectura::MAX_CANALES`.
- **Reducir `num_canales`**: rechazado (422 con mensaje) si algún dispositivo del modelo tiene `tipo_canal_N` o `nombre_canal_N` configurado para `N` mayor que el nuevo valor.
- **Cambiar `driver`**: rechazado si el modelo tiene dispositivos; el mensaje indica crear otro modelo.
- **Desactivar `modo_canales_configurable`**: permitido; los dispositivos conservan su `modo_canales` actual.
- **Eliminar**: bloqueado con dispositivos («No se puede eliminar porque hay dispositivos usando este modelo»).
- **Desactivar**: siempre permitido; solo retira el modelo del selector de alta.

## Formulario y ficha de dispositivo

### Selector de modelo

El campo de texto «Modelo» de `Dispositivos/Index.tsx` se sustituye por un select obligatorio de modelos activos agrupados por fabricante. Los modelos sin lector se pueden elegir y muestran el aviso «aún sin lector: no se leerán datos». En edición de un dispositivo de legado (sin modelo), el select aparece vacío y es obligatorio para guardar.

`DispositivosController` pasa a la página `modelos[]` con `id, fabricante, nombre, driver, driver_label, driver_disponible, num_canales, modo_canales_por_defecto, modo_canales_configurable, campos_conexion[]`.

### Comportamiento según el modelo elegido

- Se muestran exactamente `num_canales` bloques de canal.
- `modo_canales`: prellenado con el valor por defecto del modelo; radio visible solo si el modelo es configurable.
- Con `fases`: un único tipo (fotovoltaica / red eléctrica) y una única inversión de sentido para el equipo, que el servidor replica en los `num_canales` canales; nombres propuestos `L1`/`L2`/`L3`, editables; colores por canal como hoy. Con `circuitos`: tipo, nombre, color e inversión por canal, como hoy.
- Bloque «Conexión» generado desde `campos_conexion`: Shelly Cloud muestra solo `device_id` y el aviso «La credencial Shelly se toma de la organización» (en rojo si la organización del sitio no tiene credencial; no bloquea el guardado); Modbus TCP y BACnet/IP muestran `device_id` más sus campos con los valores por defecto.
- `num_fases` oculto con `fases` (se rellena en el servidor); visible y opcional con `circuitos`.

### Validación

`GuardarDispositivoRequest`, compartido por `store` y `update`, con reglas construidas a partir del modelo recibido:

- `modelo_dispositivo_id` obligatorio, existente y activo (en edición se acepta el modelo ya asignado aunque esté inactivo).
- `modo_canales` `Rule::enum`; si el modelo no es configurable debe coincidir con su valor por defecto.
- Canales `N > num_canales` deben llegar vacíos (`nombre_canal_N`, `color_canal_N`, `tipo_canal_N` nulos, `invertir_sentido_canal_N` falso).
- Campos de conexión según `camposConexion()` del driver, guardados en `configuracion.conexion`; para `shelly_cloud` la clave `conexion` queda vacía.
- Resto de reglas actuales (`sitio_id`, `device_id` único entre no borrados, colores, `ip_local`, `firmware`, `activo`).

Cambiar de modelo en edición está permitido; la validación completa se aplica contra el nuevo modelo.

### Listado, ficha y sincronización

Índice y ficha muestran «Fabricante · Modelo» desde la relación, el driver y un resumen de conexión (`192.168.1.50:502 · unidad 1`; nada para Shelly Cloud). El botón «Sincronizar» se deshabilita, con tooltip «Este modelo aún no tiene lector», cuando `driver_disponible` es falso.

## Migración y seeds

### Migraciones (reversibles)

1. `create_modelos_dispositivo_table`.
2. `add_modelo_dispositivo_to_dispositivos_table`: añade `modelo_dispositivo_id` (nullable, FK `restrictOnDelete`) y `modo_canales` (default `circuitos`), renombra `modelo` → `modelo_legacy`, ejecuta `ModeloDispositivoSeeder` y después `AsignadorModeloLegado` sobre todas las filas. `down()` deshace en orden inverso: quita la FK y las columnas nuevas, restaura `modelo` desde `modelo_legacy` y, en la primera migración, elimina la tabla (y con ella los modelos sembrados).

### Seed inicial (`ModeloDispositivoSeeder`, upsert por `codigo`, idempotente)

| código | fabricante / nombre | familia | driver | canales | modo por defecto | configurable | magnitudes |
|---|---|---|---|---|---|---|---|
| `shelly-3em` | Shelly / 3EM (SHEM-3) | EM Gen1 | shelly_cloud | 3 | fases | sí | potencia_activa, potencia_reactiva, tension, corriente, factor_potencia, energia_activa_importada, energia_activa_exportada |
| `shelly-pro-3em` | Shelly / Pro 3EM | Pro EM | shelly_cloud | 3 | fases | sí | potencia_activa, potencia_reactiva, potencia_aparente, tension, corriente, corriente_neutro, factor_potencia, frecuencia, energia_activa_importada, energia_activa_exportada |
| `shelly-pro-em-50` | Shelly / Pro EM 50 | Pro EM | shelly_cloud | 2 | circuitos | no | potencia_activa, potencia_aparente, tension, corriente, factor_potencia, frecuencia, energia_activa_importada, energia_activa_exportada |

`nombre` no repite el fabricante: `nombreCompleto()` los une («Shelly Pro 3EM») y es lo que ven listados, fichas y logs.
| `circutor-cvm-mini-mc-itf-bacnet-c2` | Circutor / CVM-MINI-MC-ITF-BACnet-C2 | CVM-MINI | bacnet_ip | 3 | fases | no | tension, corriente, corriente_neutro, potencia_activa, potencia_reactiva, potencia_aparente, factor_potencia, frecuencia, energia_activa_importada, energia_activa_exportada, energia_reactiva, thd |
| `circutor-cvm-e3-mini-mc-wieth` | Circutor / CVM-E3-MINI-MC-WiEth | CVM-E3-MINI | modbus_tcp | 3 | fases | no | tension, corriente, potencia_activa, potencia_reactiva, potencia_aparente, factor_potencia, frecuencia, energia_activa_importada, energia_activa_exportada, energia_reactiva, thd |

Las magnitudes de los dos Circutor se han tomado de la documentación general de la familia y **deben confirmarse con la hoja de datos de cada referencia** antes de implementar sus lectores; corregirlas es una edición desde el panel, no un despliegue.

### Asignación del legado (`AsignadorModeloLegado`)

Clase pequeña y testeable, invocada desde la migración, que para cada dispositivo toma `modelo_legacy` y asigna:

| texto actual | código |
|---|---|
| `SHEM-3`, `Shelly EM3` | `shelly-3em` |
| `Shelly Pro 3EM` | `shelly-pro-3em` |
| `Shelly Pro EM 50` | `shelly-pro-em-50` |
| cualquier otro (incluido vacío) | `null` |

La comparación ignora mayúsculas y espacios sobrantes. Todos los dispositivos migran con `modo_canales = circuitos`, que es exactamente la semántica actual (configuración por canal): cero cambio de comportamiento. Pasar un Pro 3EM a `fases` es una edición posterior desde el formulario.

### Despliegue

`php artisan migrate --force` basta: cron (`/etc/cron.d/energiamonitor`) y Supervisor no cambian, y el alias del comando mantiene el scheduler operativo aunque el código y `routes/console.php` se desplieguen en momentos distintos. Tras migrar, comprobar en el panel que los siete dispositivos tienen modelo asignado.

## Manejo de errores

- **Lector**: toda causa prevista de fallo se expresa como `LecturaNoDisponible` con motivo legible; el comando la registra como aviso y continúa. Excepciones no previstas se registran con traza y también continúan.
- **Driver sin lector**: nunca es un error del comando ni del formulario; se cuenta como omitido, se avisa en el panel y en la ficha, y `sincronizar` explica el motivo.
- **Organización sin credencial Shelly**: aviso en el formulario; en el colector, `LecturaNoDisponible('organización sin credencial Shelly')`.
- **Validación**: mensajes en español, por campo, siguiendo el estilo actual de Inertia (`withErrors`); las reglas de negocio del catálogo (reducir canales, cambiar driver, eliminar con dispositivos) devuelven 422 con un mensaje que dice qué dispositivos lo impiden o qué hacer.
- **Migración**: un texto de modelo no reconocido no aborta la migración; deja el modelo a `null` y el texto en `modelo_legacy`. La migración registra en el log cuántos dispositivos quedaron sin asignar.

## Tests

Pest, con un helper compartido en `tests/Support/` para crear `modelos_dispositivo` y las columnas nuevas de `dispositivos` dentro del patrón actual de `Schema::create` en `beforeEach`. Desarrollo en TDD por tarea.

- **Enums**: `camposConexion()` devuelve los campos y reglas esperados por driver; `lector()`/`disponible()` resuelven `ShellyCloudLector` para `shelly_cloud` y `null` para `modbus_tcp` y `bacnet_ip`.
- **`ShellyCloudLector`** (`Http::fake()` con fixtures JSON de los tres formatos): array normalizado campo a campo, incluida la conversión Wh→kWh del formato `emeters`, reactiva, voltaje promedio, fecha y `datos_raw` podado; HTTP no 2xx, `isok=false` y formato desconocido lanzan `LecturaNoDisponible`. Los fixtures se construyen desde los formatos documentados y se contrastan con una respuesta real por familia capturada a mano durante la implementación.
- **Comando `lecturas:obtener`** (lector falso ligado en el contenedor): dispositivo sin modelo se lee como Shelly; driver sin lector se cuenta como omitido y no crea `Lectura`; `LecturaNoDisponible` cuenta como error sin detener el bucle; el éxito crea la `Lectura` y respeta la pausa del lector; el alias antiguo resuelve; `--dispositivo` sobre un modelo sin lector devuelve `FAILURE`.
- **Panel admin** (Inertia): índice para admin y técnico, 403 para cliente; alta valida enums y rango de canales; edición rechaza reducir `num_canales` por debajo de canales configurados y cambiar de driver con dispositivos; borrado bloqueado con dispositivos; desactivar permitido; el código no cambia en edición.
- **Dispositivos**: alta exige modelo activo; rechaza canales por encima de `num_canales`; exige los campos de conexión del driver y los guarda en `configuracion.conexion`; con `fases` replica tipo e inversión y rellena `num_fases`; `modo_canales` solo editable si el modelo lo permite; editar un legado obliga a asignar modelo; `sincronizar` devuelve error cuando el comando falla; el índice expone `modelos[]` y el nombre desde la relación.
- **Migración**: `AsignadorModeloLegado` mapea los cuatro textos, deja `null` para desconocidos y fija `circuitos`; el seeder ejecutado dos veces deja las mismas filas.
