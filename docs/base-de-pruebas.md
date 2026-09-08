# Base de pruebas de EnergiaMonitor

Fase 1, 05/09/2026, sobre `febd82d`. Objetivo: reconstruir el esquema real, detectar regresiones y probar cambios con datos sintéticos. Integrada mediante PR #1 y desplegada en CT 1140 el 08/09/2026 (`48e428d`), sin migraciones pendientes ni modificaciones del histórico.

## Ejecución rápida

Requisitos: PHP 8.4 y las extensiones de `composer.lock`, incluido PDO SQLite; Composer 2.

```bash
composer install --no-interaction --prefer-dist --no-scripts
composer test
```

No necesita Node, build, clave real, `.env` de producción ni red. `tests/bootstrap.php` fija SQLite en memoria, una clave aleatoria de pruebas y transportes locales. `.env.testing` aporta los valores inocuos restantes. Se excluye la caché habitual de configuración/rutas; se bloquea HTTP sin fake mediante `Http::preventStrayRequests`. Vite se desactiva en pruebas PHP; la compilación tiene su propio job de CI.

No ejecutar `migrate:fresh` contra una base de la aplicación para preparar las pruebas: los runners seleccionan su base desechable y las pruebas gestionan su ciclo de vida.

## MariaDB equivalente a producción

Producción consultada: MariaDB 10.11.14. Compose y CI usan la rama 10.11. Las contraseñas que aparecen aquí pertenecen exclusivamente a instancias desechables sin datos reales.

```bash
docker compose -f compose.testing.yaml up -d --wait
TEST_DB_PASSWORD=local-tests-only composer test:mariadb
docker compose -f compose.testing.yaml down
```

El contenedor publica solo `127.0.0.1:3307` y almacena la BD en tmpfs. Al detenerlo pierde los datos. El usuario de pruebas tiene permisos únicamente sobre `energiamonitor_test`.

Para una MariaDB de pruebas ya disponible, el runner acepta `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_DATABASE`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD` y `TEST_DB_SOCKET`. Solo acepta localhost y nombres `energiamonitor_test` o `energiamonitor_test_<sufijo>`. Ignora `DB_URL`, `DB_DATABASE`, credenciales y transportes heredados de la aplicación. Ejemplo para una instancia local sin puerto:

```bash
TEST_DB_SOCKET=/ruta/instancia-desechable/mysql.sock composer test:mariadb
```

El runner MariaDB ejecuta Feature, Integration y Migrations. Las Unit históricas que crean sus propias tablas SQLite permanecen en la suite rápida: no cuentan como evidencia del esquema MariaDB.

## Qué comprueba

| Área | Cobertura y criterio de salida |
|---|---|
| Instalación limpia | Todas las migraciones se ejecutan; no queda `naves` ni faltan columnas de producción |
| Contrato del esquema | En MariaDB compara todas las tablas de aplicación, tipos, nulabilidad, defaults, índices ordenados y FK con reglas de borrado/actualización; en SQLite compara tablas/columnas esperadas |
| Actualización del catálogo | Reconstruye la versión anterior, inserta legado sintético y aplica las migraciones; mantiene sitio, configuración, inversión, fases, lecturas, dispositivos borrados y modelos desconocidos |
| Reintento | Volver a aplicar la migración no duplica modelos ni pisa ediciones o modo de equipos asignados |
| Reversibilidad | Retirada de `tipo` puede revertirse/repetirse sin duplicar índices; DatabaseMigrations también ejecuta rollback al terminar |
| Integridad de datos | Decimales y JSON sobreviven a persistencia; FK rechaza lecturas huérfanas; pivot rechaza membresías duplicadas |
| HTTP con esquema real | Cliente con contexto ve su equipo; contexto de otro cliente es rechazado; autenticación y ajustes existentes |
| Aislamiento del runner | Variables de producción se sustituyen; host/base no permitidos fallan antes de arrancar Laravel |

`tests/Support/EnergyScenario.php` construye dos clientes, dos sitios, un usuario viewer, dos medidores y seis lecturas. Las factories de organización, sitio, dispositivo y lectura permiten ampliar escenarios. No contiene cuentas, claves, IP ni mediciones copiadas de clientes. Es una alternativa sintética al volcado anonimizado: reproduce relaciones y condiciones controladas, no la distribución estadística de producción ni sus volúmenes.

Las nuevas pruebas que toquen BD deben ir a Integration/Feature con `RefreshDatabase`; los cambios DDL y actualizaciones a Migrations con `DatabaseMigrations`. Evitar nuevos esquemas manuales en Unit. El criterio inicial es cubrir invariantes críticos, no un porcentaje artificial de cobertura.

## Reconciliación del esquema

Se restauraron los cuerpos incompletos de migraciones históricas: organizaciones, membresías, renombrado de naves/sitios y FK, y obligatoriedad de organización. Sus definiciones proceden de metadatos consultados en CT 1140; no de modelos de pruebas inventados.

Se sustituyeron `SHOW INDEX` y `ALTER ... ENUM` por operaciones del schema builder compatibles con SQLite y MariaDB. Se preserva el índice de la FK al retirar `tipo`. Si una instalación antigua tiene sitios sin organización, la migración se detiene con un mensaje explícito; no inventa un cliente al que atribuirlos.

Las migraciones ya registradas en producción no se vuelven a ejecutar por cambiar sus archivos. Esta fase repara la reproducción desde cero; no es una migración correctora automática para instalaciones intermedias que marcaron los cuerpos vacíos como ejecutados. Esas instalaciones requieren inspección y reconciliación específica antes de actualizarlas.

El catálogo inicial y su asignación histórica están congelados en la migración y `database/migrations/data/2026_09_04_modelos_dispositivo.json`. El seeder del catálogo actual puede evolucionar sin alterar esa transformación histórica. No editar ese JSON para añadir modelos nuevos: usar cambios posteriores.

## Contrato de producción y evolución

`tests/Fixtures/schema/production-2026-09-05.json` contiene únicamente metadatos obtenidos de CT 1140 en `febd82d`. Se normalizan nombres/orden de índices y constraints para comparar su significado. No compara collation, CHECK, triggers, privilegios, datos ni rendimiento; tampoco garantiza unidades o cálculos correctos. Cambios futuros deliberados del esquema necesitan actualizar el contrato con el diff revisado, no regenerarlo ciegamente para hacer pasar una prueba.

El exportador de solo lectura usa la conexión de la aplicación del entorno donde se ejecute:

```bash
php scripts/testing/export-schema.php 'Entorno, revisión y fecha verificados' > /tmp/schema-candidate.json
```

Revisar el resultado contra el contrato versionado antes de aceptarlo. Usa transacción READ ONLY y consultas limitadas a cinco segundos; no vuelca filas de negocio.

## CI y resultados

`.github/workflows/tests.yml` separa tres jobs obligatorios en el workflow: suite SQLite, pruebas MariaDB 10.11 y build de assets con `npm ci`. No se ha modificado la protección de ramas; marcar estos checks como requeridos es configuración del repositorio.

Validación local del 05/09/2026: PHP 8.4.24 y MariaDB 11.8.6 instalada en este equipo, con instancia temporal independiente y sin puerto de red. El contrato se obtuvo de producción 10.11.14 y coincidió en 11.8.6. La ejecución remota del nuevo workflow y del contenedor 10.11 queda pendiente de CI; no se ha presentado como realizada.

Resultado local final:

- `composer test`: **173 pruebas pasan, 962 aserciones**, sin fallos ni warnings.
- `composer test:mariadb`: **49 pruebas pasan, 199 aserciones**, contra MariaDB 11.8.6 local. Son parte de las 173, no pruebas adicionales para sumar a esa cifra.
- Exportador: contrato de **24 tablas** validado contra el esquema migrado local.
- Build de frontend correcto; persisten los avisos de tamaño de chunks ya conocidos.
- Composer válido y formato PHP de los archivos cambiados comprobado. YAML de Compose y CI parseado; no se ha ejecutado Docker ni el workflow remoto.

Los dos tests desactualizados ahora verifican el mensaje traducido de throttling y la redirección al selector cuando falta contexto. Se añadió además la entrada válida al dashboard con contexto/datos reales del esquema, en lugar de eliminar esa cobertura.

Persisten fuera de esta fase los problemas de autorización, unidades y cálculo energético, captura offline/duplicados, agregados y los 16 errores TypeScript del análisis. Una suite verde es la base para corregirlos; no significa que esas incidencias estén resueltas.


## CI ejecutado — 08/09/2026

Rama publicada en `codex/fase-1-base-pruebas`, implementación `35f0450`, [PR #1 en borrador](https://github.com/gsconecta/energiaMonitor/pull/1). [Workflow tests](https://github.com/gsconecta/energiaMonitor/actions/runs/34207061470): **SQLite 173/173 (962 aserciones), MariaDB 49/49 (199 aserciones) y assets correctos**. El contenedor utilizado fue MariaDB **10.11.19**. Queda verificada la rama 10.11 en GitHub; se supera la limitación de validación solo local indicada arriba.

El [workflow adicional linter](https://github.com/gsconecta/energiaMonitor/actions/runs/34207061411) falla en Pint con `routes/api.php: Index invalid or out of range`; las etapas frontend no llegan a ejecutarse. Se reprodujo el mismo error sobre el archivo extraído de `main` (`febd82d`), sin cambios de esta fase. El workflow tests está verde, pero el conjunto de checks de la PR **no está completamente verde**. Pendiente corregir ese bloqueo heredado antes de considerar la integración. Sin merge ni despliegue.

## Cierre de calidad del frontend — 2026-09-08

Se corrigieron los hooks condicionales de cinco gráficos: la suscripción a pantalla
completa se monta siempre, incluso cuando no hay lecturas. Se sustituyeron tipos
`any`, se retiró un formulario de organización inalcanzable (el alta utiliza el
asistente existente) y se corrigieron las dependencias de los formularios de sitios.
La selección de coordenadas usa ahora los eventos de React Leaflet. La preferencia
de apariencia sigue manteniendo el tema claro.

El archivo de bloqueo de npm actualiza dependencias dentro de los rangos declarados,
sin forzar cambios de versión mayor. Auditoría npm del 8 de septiembre: de 20 avisos
a 0 vulnerabilidades conocidas. Esto no equivale a una auditoría de seguridad de
la aplicación ni sustituye las pruebas de autorización multi-tenant.

Validación local: 173 pruebas PHP / 962 aserciones; ESLint sin errores ni avisos;
TypeScript sin errores; compilación de producción correcta. Vite mantiene el aviso
por un paquete superior a 500 kB, pendiente de optimización posterior. No se ha
realizado todavía una comprobación visual autenticada de todas las pantallas.

El CI usa `npm ci` y Node 22 para instalar las mismas dependencias del archivo de
bloqueo. El trabajo de recursos comprueba también TypeScript antes de compilar.
Los trabajos de formato existentes siguen aplicando el formato en su entorno de
CI; no constituyen una comprobación de que todo el repositorio ya esté formateado.
No se añaden migraciones pendientes para producción en este cierre.


## Despliegue y cierre de fase 1

PR #1 integrada en `48e428d`; producción y main verificados el 08/09/2026.
CI completo correcto tanto en PR como después de integrar: SQLite 173/962,
MariaDB 49/199, calidad, tipos y compilación. Web, login, health y recursos JS
responden HTTP 200. Dos workers y Reverb activos; nuevas lecturas posteriores
al despliegue y cero trabajos fallidos. Existe copia privada de los archivos de
la versión anterior en el servidor; detalles operativos en el vault.

La fase 2 comienza por reproducir y corregir elevación de privilegios, exposición
de metadatos y escrituras de viewers. La asignación explícita por sitio y el
contrato de unidades del histórico requieren tratamiento separado; estas
correcciones iniciales no completan el aislamiento por instalación.
