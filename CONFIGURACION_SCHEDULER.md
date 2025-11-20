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

**⚠️ IMPORTANTE:** Para que el scheduler funcione en producción, necesitas tener configurado un **cron job** que ejecute `php artisan schedule:run` **cada minuto**.

Sin este cron job, el scheduler **NO funcionará automáticamente**, aunque el comando manual funcione correctamente.

### En Linux/Mac (Producción - CRÍTICO)

1. **Conecta al servidor de producción via SSH**

2. **Verifica la ruta de PHP:**
   ```bash
   which php
   # o
   whereis php
   ```

3. **Edita el crontab:**
   ```bash
   crontab -e
   ```

4. **Agrega esta línea (ajusta la ruta al proyecto y a PHP):**
   ```bash
   * * * * * cd /ruta/completa/al/proyecto && /ruta/completa/a/php artisan schedule:run >> /dev/null 2>&1
   ```

   Ejemplo:
   ```bash
   * * * * * cd /var/www/energiaMonitor && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
   ```

5. **Verifica que se agregó correctamente:**
   ```bash
   crontab -l
   ```

6. **Verifica que el cron service está corriendo:**
   ```bash
   sudo systemctl status cron
   # o
   sudo service cron status
   ```

### En Servidores Compartidos (cPanel, Plesk, etc.)

1. Accede al panel de control (cPanel, Plesk, etc.)
2. Ve a la sección **Cron Jobs**
3. Crea un nuevo cron job:
   - **Minuto:** `*`
   - **Hora:** `*`
   - **Día del mes:** `*`
   - **Mes:** `*`
   - **Día de la semana:** `*`
   - **Comando:** 
     ```bash
     cd /ruta/al/proyecto && php artisan schedule:run >> /dev/null 2>&1
     ```

### En Windows (Desarrollo Local - Herd)

Si usas Herd en Windows para desarrollo local, configura una **Tarea Programada** que ejecute:

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

**Nota:** Para desarrollo local, también puedes usar:
```bash
php artisan schedule:work
```
Esto ejecuta el scheduler cada minuto en foreground.

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

## ⚠️ Notas Importantes

1. **El scheduler de Laravel solo se ejecuta si `php artisan schedule:run` está configurado para ejecutarse cada minuto en el cron job o tarea programada.**

   **Sin el cron job/tarea programada configurado, el scheduler NO funcionará automáticamente.**

2. **El scheduler solo se ejecuta si `APP_ENV` NO es `local`.**

   Verifica que en producción tengas configurado:
   ```env
   APP_ENV=production
   ```

3. **Si el cron no funciona, verifica:**
   - Que el usuario del cron tenga permisos para ejecutar PHP
   - Que el usuario del cron tenga permisos de escritura en `storage/logs/`
   - Que la ruta al proyecto y PHP sea correcta
   - Los logs de Laravel: `storage/logs/laravel.log`

4. **Para debugging, puedes ejecutar el scheduler manualmente:**
   ```bash
   php artisan schedule:run
   ```
   
   O ejecutar en modo debug (foreground):
   ```bash
   php artisan schedule:work
   ```

## 🔍 Ver Documento de Diagnóstico

Si tienes problemas con el scheduler, consulta `DIAGNOSTICO_SCHEDULER.md` para un diagnóstico detallado paso a paso.

