# ⏰ Configuración del Scheduler - Lecturas Shelly

## 📋 Frecuencia Actual

Las lecturas se ejecutan automáticamente **cada 5 minutos**.

La configuración está en `routes/console.php`:

```php
Schedule::command('shelly:obtener-lecturas')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Log::error('Error al ejecutar comando shelly:obtener-lecturas');
    });
```

## 🔧 Cambiar la Frecuencia

Si quieres cambiar la frecuencia, puedes modificar `routes/console.php`. Aquí tienes algunas opciones:

### Opciones de Frecuencia

```php
// Cada minuto
->everyMinute()

// Cada 2 minutos
->everyTwoMinutes()

// Cada 3 minutos
->everyThreeMinutes()

// Cada 5 minutos (actual)
->everyFiveMinutes()

// Cada 10 minutos
->everyTenMinutes()

// Cada 15 minutos
->everyFifteenMinutes()

// Cada 30 minutos
->everyThirtyMinutes()

// Cada hora
->hourly()

// A una hora específica
->dailyAt('13:00')  // Todos los días a las 13:00

// En días específicos
->weekdays()        // Solo días laborables
->weekends()        // Solo fines de semana

// En horarios específicos
->hourlyAt(15)      // A los 15 minutos de cada hora (ej: 10:15, 11:15)
```

### Ejemplo: Cambiar a cada 3 minutos

```php
Schedule::command('shelly:obtener-lecturas')
    ->everyThreeMinutes()  // Cambiado de everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Log::error('Error al ejecutar comando shelly:obtener-lecturas');
    });
```

### Ejemplo: Cada 10 minutos

```php
Schedule::command('shelly:obtener-lecturas')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->onFailure(function () {
        \Log::error('Error al ejecutar comando shelly:obtener-lecturas');
    });
```

## ⚙️ Requisitos para que Funcione

Para que el scheduler funcione, necesitas tener configurado un **cron job** que ejecute `php artisan schedule:run` **cada minuto**.

### En Linux/Mac (crontab)

Agrega esto a tu crontab (`crontab -e`):

```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

### En Windows (Herd/Windows)

Si usas Herd en Windows, configura una **Tarea Programada** que ejecute:

```
php artisan schedule:run
```

cada minuto.

**Pasos para configurar en Windows:**

1. Abre el **Programador de tareas** de Windows
2. Crea una nueva tarea
3. En la pestaña **General**:
   - Nombre: `Laravel Scheduler`
   - Ejecutar: `Si el usuario no ha iniciado sesión`
4. En la pestaña **Desencadenadores**:
   - Nuevo → Configurar para que se ejecute **cada minuto**
5. En la pestaña **Acciones**:
   - Nueva acción → Iniciar un programa
   - Programa/script: Ruta completa a `php.exe` (ej: `C:\Program Files\PHP\php.exe`)
   - Agregar argumentos: `artisan schedule:run`
   - Iniciar en: Ruta de tu proyecto (ej: `C:\Users\Francesc\Herd\energiaMonitor`)

### Verificar que Funciona

1. **Ver las tareas programadas**:

```bash
php artisan schedule:list
```

Esto mostrará todas las tareas programadas y cuándo se ejecutarán:

```
shelly:obtener-lecturas ........ Every five minutes 2025-11-20 19:15:00
```

2. **Probar manualmente**:

```bash
php artisan schedule:test
```

O ejecutar el comando directamente:

```bash
php artisan shelly:obtener-lecturas
```

## 📊 Frecuencias Recomendadas

- **Cada 1-2 minutos**: Si necesitas datos muy actualizados (más carga en la API de Shelly)
- **Cada 5 minutos**: Buen equilibrio (actual - recomendado)
- **Cada 10-15 minutos**: Si no necesitas datos tan actualizados (menos carga)
- **Cada hora**: Solo para análisis históricos

## 🔍 Verificar Última Ejecución

Puedes verificar cuándo se ejecutó por última vez revisando:

1. **Los logs de Laravel**: `storage/logs/laravel.log`
2. **La base de datos**: Última lectura guardada

```sql
SELECT dispositivo_id, MAX(fecha_lectura) as ultima_lectura 
FROM lecturas 
GROUP BY dispositivo_id;
```

## ⚠️ Nota Importante

El scheduler de Laravel solo se ejecuta si `php artisan schedule:run` está configurado para ejecutarse cada minuto en el cron job o tarea programada.

**Sin el cron job/tarea programada configurado, el scheduler NO funcionará automáticamente.**

