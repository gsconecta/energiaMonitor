# Solución: Error de Conexión a MySQL

## Problema
```
SQLSTATE[HY000] [1045] Access denied for user 'root'@'192.168.200.14'
```

El servidor MySQL está rechazando la conexión porque el usuario `root` no tiene permisos para conectarse desde la IP `192.168.200.14`.

## Soluciones

### Opción 1: Otorgar permisos en MySQL (Recomendado)

Conéctate al servidor MySQL (`192.168.200.104`) y ejecuta:

```sql
-- Conectar como administrador
mysql -u root -p

-- Otorgar permisos al usuario root desde tu IP específica
GRANT ALL PRIVILEGES ON energiadb.* TO 'root'@'192.168.200.14' IDENTIFIED BY 'tu_contraseña';

-- O si quieres permitir desde cualquier IP de la red local
GRANT ALL PRIVILEGES ON energiadb.* TO 'root'@'192.168.200.%' IDENTIFIED BY 'tu_contraseña';

-- Aplicar los cambios
FLUSH PRIVILEGES;
```

### Opción 2: Crear un usuario específico para la aplicación

```sql
-- Crear usuario
CREATE USER 'energia_user'@'192.168.200.14' IDENTIFIED BY 'contraseña_segura';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON energiadb.* TO 'energia_user'@'192.168.200.14';

-- Aplicar cambios
FLUSH PRIVILEGES;
```

Luego actualiza tu `.env`:
```
DB_USERNAME=energia_user
DB_PASSWORD=contraseña_segura
```

### Opción 3: Verificar configuración de MySQL

Asegúrate de que MySQL esté configurado para aceptar conexiones remotas:

1. **Verificar `bind-address` en `my.cnf` o `my.ini`:**
   ```
   bind-address = 0.0.0.0  # Permite conexiones desde cualquier IP
   # o
   bind-address = 192.168.200.104  # Permite conexiones a esta IP específica
   ```

2. **Reiniciar MySQL:**
   ```bash
   sudo systemctl restart mysql
   # o
   sudo service mysql restart
   ```

### Opción 4: Verificar credenciales en .env

Verifica que las siguientes variables en tu `.env` sean correctas:

```env
DB_CONNECTION=mysql
DB_HOST=192.168.200.104
DB_PORT=3306
DB_DATABASE=energiadb
DB_USERNAME=root
DB_PASSWORD=tu_contraseña_correcta
```

## Verificar la conexión

Después de aplicar los cambios, verifica la conexión:

```bash
php test_db_connection.php
```

O intenta las migraciones nuevamente:

```bash
php artisan migrate
```




