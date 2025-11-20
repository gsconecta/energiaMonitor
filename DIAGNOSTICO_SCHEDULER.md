# 🔍 Diagnóstico del Scheduler - Problema en Producción

## 📋 Problema
Las tareas programadas no se ejecutan automáticamente en producción, aunque funcionan manualmente desde `/dispositivos`.

## 🚀 Diagnóstico Rápido

Ejecuta el comando de diagnóstico automático:

```bash
php artisan schedule:diagnostico
```

Este comando verificará automáticamente:
- ✅ El entorno de la aplicación
- ✅ La configuración del scheduler
- ✅ Los permisos de escritura
- ✅ La existencia del comando
- ✅ El cron job (verificación automática)

### 🔧 Solución Automática (Recomendada)

Si el diagnóstico muestra que falta el cron job, puedes usar el script helper:

```bash
./configurar-cron.sh
```

Este script configurará automáticamente el cron job con las rutas correctas de tu servidor.

## ✅ Verificaciones Paso a Paso

### 1. Verificar que el Comando Funciona Manualmente

Ejecuta el comando directamente para verificar que funciona:

```bash
php artisan shelly:obtener-lecturas
```

Si este comando funciona correctamente, el problema está en el scheduler, no en el comando.

### 2. Verificar la Configuración del Scheduler

Ver todas las tareas programadas:

```bash
php artisan schedule:list
```

Deberías ver algo como:
```
shelly:obtener-lecturas ........ Every three minutes 2025-01-XX XX:XX:XX
```

### 3. Verificar el Entorno

Verifica que `APP_ENV` esté configurado correctamente en `.env`:

```bash
# En producción debe ser "production" o cualquier valor que NO sea "local"
APP_ENV=production
```

El scheduler solo se ejecuta si `APP_ENV` **NO** es `local` (ver línea 13 de `routes/console.php`).

### 4. Verificar el Cron Job (MÁS IMPORTANTE) ⚠️

**El problema más común es que falta el cron job en producción.**

El scheduler de Laravel requiere que se ejecute `php artisan schedule:run` **cada minuto** mediante un cron job.

#### En Linux/Mac (servidor de producción):

1. **Verificar si existe el cron job:**
   ```bash
   crontab -l
   ```

2. **Si NO existe, agregarlo:**
   ```bash
   crontab -e
   ```

3. **Agregar esta línea (ajusta la ruta al proyecto):**
   ```bash
   * * * * * cd /ruta/completa/al/proyecto && php artisan schedule:run >> /dev/null 2>&1
   ```

   Ejemplo con ruta completa:
   ```bash
   * * * * * cd /var/www/energiaMonitor && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
   ```

   **Importante:** Usa la ruta completa a `php` si no está en el PATH.

4. **Verificar la ruta de PHP:**
   ```bash
   which php
   # o
   whereis php
   ```

#### En Servidores Compartidos o con cPanel:

Si usas cPanel u otro panel de control:

1. Ve a **Cron Jobs** en el panel de control
2. Crea un nuevo cron job con:
   - **Minuto:** `*`
   - **Hora:** `*`
   - **Día del mes:** `*`
   - **Mes:** `*`
   - **Día de la semana:** `*`
   - **Comando:** `cd /ruta/al/proyecto && php artisan schedule:run >> /dev/null 2>&1`

### 5. Probar el Cron Job Manualmente

Ejecuta manualmente el comando que debería ejecutar el cron:

```bash
cd /ruta/al/proyecto && php artisan schedule:run
```

Deberías ver output similar a:
```
Running scheduled command: shelly:obtener-lecturas
```

### 6. Verificar los Logs

Revisa los logs de Laravel para ver si hay errores:

```bash
tail -f storage/logs/laravel.log
```

O busca errores específicos:

```bash
grep "shelly:obtener-lecturas" storage/logs/laravel.log
grep "schedule" storage/logs/laravel.log
```

### 7. Verificar Permisos

Asegúrate de que el usuario del cron tenga permisos para:
- Ejecutar PHP
- Escribir en `storage/logs/`
- Acceder a la base de datos

```bash
# Verificar permisos del directorio storage
ls -la storage/logs/
```

### 8. Verificar que el Cron Está Corriendo

En el servidor, verifica que el servicio cron esté activo:

```bash
# En sistemas systemd
sudo systemctl status cron

# En sistemas con service
sudo service cron status
```

## 🔧 Solución Rápida

Si el problema es que falta el cron job, sigue estos pasos:

### Paso 1: Encuentra la ruta completa de tu proyecto y PHP

```bash
pwd  # Ruta del proyecto
which php  # Ruta de PHP
```

### Paso 2: Crea el cron job

**Opción A: Script automático (Recomendado)**

```bash
./configurar-cron.sh
```

**Opción B: Manual**

```bash
crontab -e
```

Agrega esta línea (con las rutas correctas de tu servidor):
```bash
* * * * * cd /home/cloudmallorca-monitor/htdocs/energiaMonitor && /usr/bin/php8.4 artisan schedule:run >> /dev/null 2>&1
```

**Para otros servidores, ajusta las rutas:**
```bash
* * * * * cd /ruta/completa/al/proyecto && /ruta/completa/a/php artisan schedule:run >> /dev/null 2>&1
```

### Paso 3: Verifica que se agregó correctamente

```bash
crontab -l
```

### Paso 4: Espera 1-2 minutos y verifica

```bash
# Ver los logs
tail -f storage/logs/laravel.log

# O verificar en la base de datos si se están creando nuevas lecturas
```

## 🐛 Problemas Comunes

### 1. Cron no ejecuta porque el PATH no incluye PHP

**Solución:** Usa la ruta completa a PHP en el cron job:
```bash
* * * * * cd /var/www/proyecto && /usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

### 2. El cron se ejecuta pero hay errores de permisos

**Solución:** Asegúrate de que el usuario del cron pueda escribir en `storage/logs/`:
```bash
chmod -R 775 storage/logs/
```

### 3. APP_ENV está configurado como "local"

**Solución:** Cambia `APP_ENV` en `.env` a `production`:
```env
APP_ENV=production
```

### 4. El proyecto usa variables de entorno del servidor web

Si usas Apache/Nginx con variables de entorno, el cron no las tiene. 

**Solución:** Especifica explícitamente el archivo `.env` o carga las variables en el cron:

```bash
* * * * * cd /ruta/al/proyecto && /usr/bin/php artisan schedule:run --env=production >> /dev/null 2>&1
```

## ✅ Verificación Final

Después de configurar el cron, espera 3-5 minutos y verifica:

1. **Ver nuevas lecturas en la base de datos:**
   ```sql
   SELECT dispositivo_id, MAX(fecha_lectura) as ultima_lectura 
   FROM lecturas 
   GROUP BY dispositivo_id
   ORDER BY ultima_lectura DESC;
   ```

2. **Ver los logs para confirmar ejecución:**
   ```bash
   tail -20 storage/logs/laravel.log | grep "shelly:obtener-lecturas"
   ```

3. **Ver el scheduler ejecutarse en tiempo real:**
   ```bash
   php artisan schedule:work
   ```
   (Esto ejecuta el scheduler cada minuto en foreground - útil para debugging)

## 📝 Notas Adicionales

- El scheduler se ejecuta **cada minuto**, pero tu tarea (`shelly:obtener-lecturas`) está configurada para ejecutarse **cada 3 minutos**.
- Si el cron no está configurado, el scheduler **NUNCA** se ejecutará automáticamente.
- El comando manual (`php artisan shelly:obtener-lecturas`) siempre funciona independientemente del cron.

