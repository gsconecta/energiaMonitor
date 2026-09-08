# Fase 2: datos y permisos

Estado 08/09/2026: primer bloque de autorización implementado y probado; fase 2 en curso.
Base: fase 1 desplegada en `48e428d`. No hay despliegue de estos cambios todavía.

## Primer bloque implementado

- Solo el administrador global cambia roles globales. Los técnicos conservan la
  edición de datos de clientes y de su propia cuenta sin cambiar el rol. No pueden
  editar ni eliminar cuentas de otros técnicos o administradores; cambiar su correo
  permitiría apropiarse de ellas mediante recuperación de contraseña.
- Los listados de organizaciones para clientes incluyen únicamente sus organizaciones
  activas. El supervisor conserva el listado global. La unicidad de códigos sigue
  comprobándose en servidor; el navegador no necesita un catálogo de clientes ajenos.
- La clave Shelly queda oculta en la serialización del modelo; sigue disponible en
  servidor para el colector. La administración ya utiliza `tiene_api_key`.
- Las escrituras de dispositivos exigen un rol owner/admin/member de su organización,
  o el modo global existente del supervisor. Se comprueban origen y destino al mover
  un dispositivo y el sitio del registro borrado antes de reemplazarlo. Viewer no
  puede dar de alta, editar, eliminar, activar/desactivar ni forzar una sincronización.

Pruebas HTTP con datos sintéticos: seis fallaban antes de la corrección; ocho casos
iniciales pasan después. Ampliadas a doce incluyendo cuentas privilegiadas, permisos
legítimos y dispositivo de otro cliente. Suite completa: 185 pruebas, 1.031 aserciones.
No se han usado credenciales ni lecturas reales en estas pruebas.

## Trabajo siguiente y límites

La pertenencia actual a una organización sigue abriendo sus sitios. Falta definir
la transición a asignaciones explícitas, cubrir selección de contexto, consultas,
exportaciones y Reverb, y probar soporte global. Se ha consultado a Xisco el acceso
por defecto de nuevos usuarios; no se han migrado asignaciones existentes.

La energía requiere un contrato de unidades antes de modificar la captura o el histórico.
En `ShellyCloudLector` la rama antigua `emeters` divide contadores por 1.000; las ramas
`emdata`/`em1data` guardan sus valores sin esa división. El dashboard decide una escala
según el tamaño de cada diferencia: esto permite sumar canales en escalas distintas.
Cambiar solo la captura introduciría una discontinuidad en los contadores almacenados.

Siguiente entrega de energía: clasificar formatos persistidos mediante `datos_raw`,
contrastar unidades con documentación del fabricante, fijar una representación kWh
versionada y probar consumos pequeños/grandes, cambios de formato, reinicios, huecos y
valores desconocidos. Después compartir el cálculo entre dashboard, informes y
compactación. No convertir históricos masivamente ni considerar el informe actual una
referencia certificada. La discrepancia real ya analizada está documentada en el vault.

Pendientes adicionales de autorización: CRUD global de KPIs, asignación de credenciales
en altas de clientes, gestión de miembros y alcance del soporte. Este bloque no
constituye una auditoría completa de seguridad ni completa la fase 2.

## Reconciliación de contadores implementada — 08/09/2026

`ContadoresEnergia` interpreta el almacenamiento histórico por lectura: formato
EM/EM1 conservado en Wh, emeters ya convertido a kWh por el lector existente.
No utiliza el tamaño del consumo ni el modelo actual del dispositivo. Normaliza
cada extremo antes de restar; detecta reinicios intermedios, unidades desconocidas,
contadores ausentes, dispositivos mezclados y duplicados contradictorios. Devuelve
`kwh: null` con motivo cuando no puede dar un resultado fiable. Duplicados idénticos
no suman consumo. No estima los extremos del día sin muestras ni integra potencia.
Un hueco entre contadores acumulativos no se interpreta como cero ni invalida por
sí solo su diferencia; no permite descartar un reinicio oculto durante ese hueco.

Herramienta administrativa de solo consulta:

```bash
php artisan energia:auditar-contadores ID_DISPOSITIVO YYYY-MM-DD
```

Consulta un único dispositivo/día con límites de fecha semiabiertos y hasta 10.001
filas; rechaza más de 10.000 para no devolver parciales. La salida contiene fechas,
número de muestras, valores y estado, sin datos raw ni credenciales. No ejecuta
captura, cambios de configuración, backfill ni escritura de lecturas. El comando
está disponible por consola, no expone un endpoint web.

La comprobación operativa de esta clase contra el caso histórico analizado confirmó
la conciliación del total con la suma de los tres canales. Los detalles de producción
están en el vault. La comprobación utilizó una sesión SQL READ ONLY con timeout de
cinco segundos, sin instalar estos archivos en producción.

Fuentes de unidades: [EMData](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/EMData/)
y [Gen1](https://shelly-api-docs.shelly.cloud/gen1/). Es necesario distinguir los
contadores totales en Wh de campos de intervalo en otras unidades. La interpretación
histórica depende también de la conversión que aplicó nuestro lector al persistir.

**Aún no conectado al dashboard, informes o compactación.** La siguiente integración
debe transportar el estado de fiabilidad hasta la pantalla y distinguir contadores
de estimaciones; no sustituir resultados desconocidos por cero. Tampoco se ha
cambiado la escala de nuevas lecturas: hacerlo aisladamente rompería la continuidad
del histórico. La futura versión del lector necesitará metadatos explícitos para
que esta interpretación histórica no se aplique a datos ya normalizados.

## Dashboard conectado al cálculo y su fiabilidad

El dashboard utiliza ahora `ContadoresEnergia` para total, retorno y canales;
se elimina el heurístico de diferencias mayores de 1.000. Los indicadores de
flujo distinguen `contadores`, `estimada` y `no_disponible`. El estado, los motivos
por contador y las fechas de primera/última muestra viajan en `calidad_energia`.
La pantalla muestra el método y el intervalo observado, tanto en móvil como en
escritorio. Valores energéticos desconocidos se presentan como «Sin datos»; cero
real continúa mostrando cero. Las potencias instantáneas siguen separadas.

Se mantiene el método trapezoidal existente como alternativa cuando faltan
contadores fiables o la solar requiere la estimación existente. Solo se admite
con dos o más medidas, potencias conocidas en los canales configurados y sin
intervalos superiores a diez minutos ni marcas temporales duplicadas. Es un
límite conservador para la captura prevista cada 1–3 minutos, no una certificación
metrológica. Si no se cumple, se evita publicar un cero o estimar toda una
interrupción. Una estimación parcial no se presenta como total del periodo.

Pruebas HTTP: conciliación de canales pequeños/grandes, formato desconocido,
reinicio, ausencia de datos, hueco de 30 minutos y potencia ausente. Los escenarios
solares previos ahora tienen lecturas cada tres minutos durante las dos horas;
conservan sus resultados físicos esperados sin simular continuidad a través de
huecos de una hora. Verificación local de render React con consumo medido, null
y cero; no sustituye una revisión visual autenticada completa.

Esta sección sustituye el estado anterior «aún no conectado al dashboard».
Informes, compactación, versionado de captura y asignación por sitio siguen
pendientes. No se modifica el histórico ni se despliega automáticamente este PR.
