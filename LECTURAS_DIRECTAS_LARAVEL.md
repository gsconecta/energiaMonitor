# 📊 Obtener Lecturas Shelly Directamente desde Laravel

## ✅ Comando Creado

Se ha creado un comando Artisan que obtiene las lecturas directamente desde la API de Shelly Cloud, sin necesidad de usar n8n.

## 🚀 Uso del Comando

### Ejecutar para todos los dispositivos

```bash
php artisan shelly:obtener-lecturas
```

### Ejecutar para un dispositivo específico

```bash
php artisan shelly:obtener-lecturas --dispositivo=1
```

### Configurar timeout de las peticiones HTTP

```bash
php artisan shelly:obtener-lecturas --timeout=15
```

## ⚙️ Configuración Automática con Scheduler

Para ejecutar automáticamente cada 5 minutos, agrega esto al método `schedule()` en `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    // Obtener lecturas de Shelly cada 5 minutos
    $schedule->command('shelly:obtener-lecturas')
        ->everyFiveMinutes()
        ->withoutOverlapping()
        ->runInBackground();
}
```

Luego, agrega esto a tu crontab:

```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

O si usas Herd en Windows, configura una tarea programada que ejecute:

```
php artisan schedule:run
```

cada minuto.

## 📋 Funcionalidades

### ✅ Lo que hace el comando

1. **Obtiene dispositivos activos** con credenciales de Shelly configuradas
2. **Agrupa por organización** para usar las credenciales correctas
3. **Llama a la API de Shelly Cloud** para cada dispositivo
4. **Procesa la respuesta JSON** detectando automáticamente el formato:
   - Formato EM3 trifásico (`em:0` con prefijos `a_`, `b_`, `c_`)
   - Formato EM1/EM1+ (`em1:0`, `em1:1`)
   - Formato EM3 antiguo (`emeters` array)
5. **Guarda la lectura** en la base de datos
6. **Actualiza el número de fases** automáticamente del dispositivo
7. **Espera 1 segundo** entre requests para no sobrecargar

### ✅ Ventajas sobre n8n

- **No requiere n8n**: Todo se hace desde Laravel
- **Más simple**: Un solo comando en lugar de un workflow complejo
- **Más control**: Logs y manejo de errores integrado en Laravel
- **Más eficiente**: No hay overhead de comunicación entre servicios
- **Scheduler nativo**: Usa el scheduler de Laravel integrado

## 📊 Salida del Comando

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

## 🔧 Requisitos

- Los dispositivos deben estar **activos** (`activo = 1`)
- Las organizaciones deben tener:
  - `shelly_api_key` configurada
  - `shelly_server` configurado
  - `activa = true`

## 📝 Logs

El comando registra errores en los logs de Laravel:

```php
Log::error("Error obteniendo lectura de Shelly", [
    'dispositivo_id' => $dispositivo->id,
    'error' => $e->getMessage()
]);
```

Revisa los logs en `storage/logs/laravel.log`.

## 🔄 Migración desde n8n

Si actualmente usas n8n para obtener lecturas:

1. **Mantén n8n** para otras automatizaciones si lo necesitas
2. **Configura el scheduler** de Laravel para ejecutar el comando
3. **Desactiva el workflow de n8n** que obtiene lecturas
4. **Prueba el comando** manualmente primero:

   ```bash
   php artisan shelly:obtener-lecturas --dispositivo=1
   ```

5. **Verifica las lecturas** en la base de datos:

   ```sql
   SELECT * FROM lecturas ORDER BY fecha_lectura DESC LIMIT 10;
   ```

## ⚡ Optimizaciones

El comando ya incluye:
- ✅ Espera de 1 segundo entre requests
- ✅ Timeout configurable (por defecto 10 segundos)
- ✅ Manejo de errores por dispositivo
- ✅ Actualización automática de número de fases
- ✅ Logs de errores detallados

## 🎯 Próximos Pasos

1. **Probar el comando manualmente**:

   ```bash
   php artisan shelly:obtener-lecturas
   ```

2. **Configurar el scheduler** si quieres que se ejecute automáticamente

3. **Desactivar n8n** si ya no lo necesitas para esto

4. **Monitorear los logs** para asegurar que todo funciona correctamente

## 📚 Referencias

- **Modelos**: `app/Models/Dispositivo.php`, `app/Models/Lectura.php`, `app/Models/Organizacion.php`
- **Comando**: `app/Console/Commands/ObtenerLecturasShelly.php`
- **Workflow n8n original**: `db/Shelly GS - Actualizado.json`

