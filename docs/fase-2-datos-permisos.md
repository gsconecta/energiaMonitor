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
