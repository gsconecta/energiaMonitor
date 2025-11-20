# ✅ Solución: Configurar Cron Job para el Scheduler

## 🔍 Problema Identificado

El diagnóstico muestra que **no hay un cron job configurado** para ejecutar el scheduler. Este es el problema principal por el cual las tareas programadas no se ejecutan automáticamente en producción.

## 🚀 Solución Rápida

### Opción 1: Script Automático (Recomendado)

Ejecuta el script helper que configurará automáticamente el cron job:

```bash
./configurar-cron.sh
```

Este script:
- ✅ Verifica si ya existe un cron job
- ✅ Configura el cron job con las rutas correctas
- ✅ Muestra los cron jobs configurados
- ✅ Confirma que todo está listo

### Opción 2: Configuración Manual

Si prefieres configurarlo manualmente:

1. **Abre el editor del crontab:**
   ```bash
   crontab -e
   ```

2. **Agrega esta línea al final del archivo:**
   ```bash
   * * * * * cd /home/cloudmallorca-monitor/htdocs/energiaMonitor && /usr/bin/php8.4 artisan schedule:run >> /dev/null 2>&1
   ```

3. **Guarda y cierra el editor** (en nano: `Ctrl+X`, luego `Y`, luego `Enter`)

4. **Verifica que se agregó correctamente:**
   ```bash
   crontab -l
   ```

## ✅ Verificación

Después de configurar el cron job:

1. **Verifica el cron job:**
   ```bash
   crontab -l | grep schedule:run
   ```

   Deberías ver:
   ```
   * * * * * cd /home/cloudmallorca-monitor/htdocs/energiaMonitor && /usr/bin/php8.4 artisan schedule:run >> /dev/null 2>&1
   ```

2. **Ejecuta el diagnóstico nuevamente:**
   ```bash
   php artisan schedule:diagnostico
   ```

   Ahora debería mostrar: `✅ Se encontró un cron job con schedule:run`

3. **Espera 3-5 minutos** y verifica que el scheduler está funcionando:

   - **Ver los logs en tiempo real:**
     ```bash
     tail -f storage/logs/laravel.log
     ```

   - **Verificar en la base de datos que se están creando nuevas lecturas:**
     ```bash
     # Desde MySQL/MariaDB
     mysql -u usuario -p nombre_base_datos
     ```
     ```sql
     SELECT dispositivo_id, MAX(fecha_lectura) as ultima_lectura 
     FROM lecturas 
     GROUP BY dispositivo_id
     ORDER BY ultima_lectura DESC
     LIMIT 10;
     ```

   - **O ejecuta el comando manualmente para probar:**
     ```bash
     php artisan shelly:obtener-lecturas
     ```

## 🔧 Detalles del Cron Job

### ¿Qué hace cada parte?

- `* * * * *` - Se ejecuta cada minuto
- `cd /home/cloudmallorca-monitor/htdocs/energiaMonitor` - Cambia al directorio del proyecto
- `&&` - Solo ejecuta el siguiente comando si el anterior fue exitoso
- `/usr/bin/php8.4 artisan schedule:run` - Ejecuta el scheduler de Laravel
- `>> /dev/null 2>&1` - Redirige el output a /dev/null (sin mostrar salida)

### ¿Por qué cada minuto?

El scheduler de Laravel se ejecuta **cada minuto** para verificar qué tareas están programadas. La tarea real (`shelly:obtener-lecturas`) está configurada para ejecutarse **cada 3 minutos**, pero el scheduler necesita ejecutarse cada minuto para verificar si debe ejecutar esa tarea o no.

## ⚠️ Notas Importantes

1. **El cron job se ejecuta con el usuario actual** (`cloudmallorca-monitor` en tu caso)
   
2. **Asegúrate de que el usuario tenga permisos:**
   - ✅ Lectura en el directorio del proyecto
   - ✅ Ejecución de PHP
   - ✅ Escritura en `storage/logs/`

3. **Si cambias la ruta del proyecto o la versión de PHP**, deberás actualizar el cron job.

4. **Para verificar que el cron service está corriendo:**
   ```bash
   sudo systemctl status cron
   # o
   sudo service cron status
   ```

## 🐛 Troubleshooting

### El cron no se ejecuta

1. **Verifica que el cron service está activo:**
   ```bash
   sudo systemctl status cron
   ```

2. **Verifica permisos del archivo `artisan`:**
   ```bash
   ls -la artisan
   ```
   Debe ser ejecutable: `-rwxr-xr-x`

3. **Prueba ejecutar el comando manualmente:**
   ```bash
   cd /home/cloudmallorca-monitor/htdocs/energiaMonitor && /usr/bin/php8.4 artisan schedule:run
   ```
   
   Si funciona manualmente pero no desde el cron, puede ser un problema de PATH o variables de entorno.

4. **Revisa los logs del sistema para errores del cron:**
   ```bash
   sudo grep CRON /var/log/syslog | tail -20
   # o
   sudo tail -f /var/log/cron.log
   ```

### El cron se ejecuta pero no hay lecturas

1. **Verifica los logs de Laravel:**
   ```bash
   tail -50 storage/logs/laravel.log
   ```

2. **Busca errores específicos:**
   ```bash
   grep -i error storage/logs/laravel.log | tail -20
   ```

3. **Verifica que el comando funciona manualmente:**
   ```bash
   php artisan shelly:obtener-lecturas
   ```

4. **Verifica que hay dispositivos activos con credenciales:**
   ```bash
   php artisan tinker
   ```
   ```php
   \App\Models\Dispositivo::with('sitio.organizacion')
       ->activos()
       ->whereHas('sitio.organizacion', function($q) {
           $q->where('activa', true)
             ->whereNotNull('shelly_api_key')
             ->whereNotNull('shelly_server');
       })
       ->get();
   ```

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Ejecuta `php artisan schedule:diagnostico` y guarda la salida completa
2. Revisa `storage/logs/laravel.log` para errores
3. Verifica los logs del sistema: `sudo grep CRON /var/log/syslog | tail -50`

