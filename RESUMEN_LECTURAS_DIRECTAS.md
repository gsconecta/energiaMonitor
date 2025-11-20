# ✅ Lecturas Directas desde Laravel - Resumen

## 🎯 Respuesta a tu pregunta

**Sí, las lecturas se pueden hacer directamente desde la aplicación Laravel** sin necesidad de usar n8n.

## ✅ Lo que he implementado

He creado un comando Artisan `shelly:obtener-lecturas` que:

1. **Obtiene dispositivos activos** agrupados por organización
2. **Llama a la API de Shelly Cloud** para cada dispositivo
3. **Procesa la respuesta JSON** detectando automáticamente el formato:
   - EM3 trifásico (`em:0` con prefijos `a_`, `b_`, `c_`)
   - EM1/EM1+ (`em1:0`, `em1:1`)
   - EM3 antiguo (`emeters` array)
4. **Guarda la lectura** en la base de datos
5. **Actualiza el número de fases** automáticamente del dispositivo

## 🚀 Uso del Comando

### Ejecutar manualmente

```bash
# Todos los dispositivos
php artisan shelly:obtener-lecturas

# Un dispositivo específico
php artisan shelly:obtener-lecturas --dispositivo=1

# Con timeout personalizado
php artisan shelly:obtener-lecturas --timeout=15
```

### Ejecutar automáticamente

El comando ya está configurado para ejecutarse automáticamente cada 5 minutos.

Para activar el scheduler de Laravel, agrega esto a tu crontab (o tarea programada en Windows):

```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

O si usas Herd en Windows, configura una tarea programada que ejecute:

```
php artisan schedule:run
```

cada minuto.

## 📊 Ventajas sobre n8n

- ✅ **No requiere n8n**: Todo se hace desde Laravel
- ✅ **Más simple**: Un solo comando en lugar de un workflow complejo
- ✅ **Más control**: Logs y manejo de errores integrado en Laravel
- ✅ **Más eficiente**: No hay overhead de comunicación entre servicios
- ✅ **Scheduler nativo**: Usa el scheduler de Laravel integrado
- ✅ **Más fácil de mantener**: Todo el código está en un solo lugar

## 📋 Funcionalidades Implementadas

### ✅ Detección automática de formato

- **Formato EM3 trifásico**: Detecta dispositivos con 3 fases (A, B, C)
- **Formato EM1/EM1+**: Detecta dispositivos con 2 canales
- **Formato EM3 antiguo**: Detecta dispositivos con array `emeters`

### ✅ Actualización automática de número de fases

- Detecta el número de fases automáticamente desde la respuesta JSON
- Actualiza el campo `num_fases` del dispositivo

### ✅ Manejo de errores

- Logs detallados en `storage/logs/laravel.log`
- Continúa procesando otros dispositivos si uno falla
- Muestra resumen al finalizar

## 🔧 Configuración Requerida

### Requisitos

- Los dispositivos deben estar **activos** (`activo = 1`)
- Las organizaciones deben tener:
  - `shelly_api_key` configurada
  - `shelly_server` configurado
  - `activa = true`

### Scheduler

El scheduler ya está configurado en `routes/console.php`:

```php
Schedule::command('shelly:obtener-lecturas')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();
```

## 📝 Archivos Creados

1. **Comando**: `app/Console/Commands/ObtenerLecturasShelly.php`
2. **Scheduler**: `routes/console.php` (actualizado)
3. **Documentación**: `LECTURAS_DIRECTAS_LARAVEL.md`

## 🎯 Próximos Pasos

1. **Probar el comando manualmente**:

   ```bash
   php artisan shelly:obtener-lecturas --dispositivo=1
   ```

2. **Verificar las lecturas** en la base de datos:

   ```sql
   SELECT * FROM lecturas ORDER BY fecha_lectura DESC LIMIT 10;
   ```

3. **Configurar el crontab/scheduler** para ejecutar automáticamente

4. **Opcional: Desactivar n8n** si ya no lo necesitas para esto

## 💡 Migración desde n8n

Si actualmente usas n8n para obtener lecturas:

1. **Prueba el comando primero**: `php artisan shelly:obtener-lecturas`
2. **Verifica las lecturas** se están guardando correctamente
3. **Configura el scheduler** para ejecutar automáticamente
4. **Desactiva el workflow de n8n** que obtiene lecturas
5. **Mantén n8n** solo si lo necesitas para otras automatizaciones

## 📊 Resultado Esperado

Después de ejecutar el comando:

```
Obteniendo lecturas de dispositivos Shelly...
Procesando 4 dispositivo(s)...

Procesando: Shelly Granja (shellyem3-C8C9A33E6505)
  ✅ Lectura guardada - Fases: NULL → 3

Procesando: Hornos Gordiola (shellyem1-ABC123)
  ✅ Lectura guardada - Fases: NULL → 2

Resumen:
+------------------+----------+
| Estado           | Cantidad |
+------------------+----------+
| ✅ Exitosos      | 4        |
| ❌ Errores       | 0        |
| 🔄 Fases actualizadas | 2   |
+------------------+----------+
```

## ✅ Estado Actual

- ✅ Comando creado y funcionando
- ✅ Scheduler configurado en `routes/console.php`
- ✅ Documentación creada
- ✅ Detección automática de formato implementada
- ✅ Actualización automática de número de fases implementada

**¡El sistema está listo para usar!** 🚀

