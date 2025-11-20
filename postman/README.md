# Colección de Postman para Shelly Cloud API

Esta carpeta contiene una colección de Postman para probar las peticiones a la API de Shelly Cloud.

## Archivos incluidos

1. **Shelly_API_Collection.postman_collection.json** - Colección con todas las peticiones
2. **Shelly_API_Environment.postman_environment.json** - Variables de entorno para desarrollo
3. **README.md** - Este archivo con instrucciones

## Instalación en Postman

### Opción 1: Importar desde archivos

1. Abre Postman
2. Haz clic en **Import** (botón superior izquierdo)
3. Arrastra los archivos `.json` o selecciona "Upload Files"
4. Importa tanto la colección como el entorno

### Opción 2: Importar desde URL

Si los archivos están en un repositorio, puedes usar la URL del archivo raw.

## Configuración

### 1. Importar el entorno

1. En Postman, ve a **Environments** (icono de ojo en la barra superior)
2. Selecciona "Shelly API - Desarrollo" o crea uno nuevo
3. Configura las siguientes variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `shelly_server` | URL del servidor de Shelly Cloud | `https://shelly-149-eu.shelly.cloud` |
| `device_id` | ID del dispositivo Shelly | `8813bffeabf0` |
| `shelly_api_key` | API Key de Shelly Cloud | `Mzg3ZDVmdWlkB2415D1B7F9AA0DEE25014600F3EEC3B5B84D0E846541BAC6C39A99DD81DAB09ED8C1B89DE9EEEEA` |
| `app_url` | URL base de tu aplicación Laravel | `http://localhost` o `https://monitor.cloudmallorca.com` |
| `app_api_key` | API Key de tu aplicación Laravel | Tu API key configurada en Laravel |

### 2. Obtener las credenciales

#### API Key de Shelly Cloud

1. Inicia sesión en [Shelly Cloud](https://my.shelly.cloud/)
2. Ve a **Settings** > **Cloud Settings**
3. Copia tu **Auth Key** o **API Key**

#### API Key de Laravel

La API Key de Laravel debe estar configurada en tu aplicación. Puedes obtenerla desde:
- La base de datos (tabla `api_keys` si existe)
- El archivo `.env` si está configurada allí
- O crearla usando un comando artisan personalizado

#### Device ID

El Device ID es el identificador único del dispositivo Shelly. Puedes obtenerlo:
- Desde la aplicación móvil de Shelly
- Desde el panel web del dispositivo (normalmente en la URL: `http://{ip_dispositivo}/settings`)
- Desde la respuesta de la API cuando listas dispositivos

## Peticiones incluidas

### 1. Obtener Status del Dispositivo (GET)
Obtiene el estado actual del dispositivo usando método GET.

**URL:** `{{shelly_server}}/device/status?id={{device_id}}&auth_key={{shelly_api_key}}`

**Respuesta esperada:**
```json
{
  "isok": true,
  "data": {
    "online": true,
    "device_status": {
      "wifi_sta": {
        "connected": true,
        "rssi": -45
      },
      "cloud": {
        "connected": true
      },
      "emeters": [
        {
          "power": 1234.5,
          "voltage": 230.5,
          "current": 5.35,
          "total": 12345.67,
          "total_returned": 0,
          "is_valid": true
        }
      ],
      "total_power": 1234.5
    }
  }
}
```

### 2. Obtener Status del Dispositivo (POST)
Misma funcionalidad pero usando método POST con form-urlencoded.

**URL:** `{{shelly_server}}/device/status`

**Body (form-urlencoded):**
- `id`: Device ID
- `auth_key`: API Key

### 3. Listar Dispositivos (Shelly Cloud)
Lista todos los dispositivos asociados a tu cuenta de Shelly Cloud.

**URL:** `{{shelly_server}}/device/list?auth_key={{shelly_api_key}}`

### 4. Obtener Dispositivos desde nuestra API
Obtiene los dispositivos activos agrupados por organización desde la API de Laravel.

**URL:** `{{app_url}}/api/dispositivos-activos-por-organizacion`

**Headers:**
- `X-API-Key`: Tu API key de Laravel
- `Accept`: `application/json`

**Alternativa:** También puedes pasar la API key como query parameter: `?api_key=xxx`

## Ejemplos de uso

### Ejemplo 1: Probar un dispositivo específico

1. Configura las variables de entorno:
   - `shelly_server`: `https://shelly-149-eu.shelly.cloud`
   - `device_id`: `8813bffeabf0`
   - `shelly_api_key`: Tu API key de Shelly

2. Selecciona la petición "1. Obtener Status del Dispositivo (GET)"
3. Haz clic en **Send**
4. Revisa la respuesta JSON

### Ejemplo 2: Obtener dispositivos desde Laravel

1. Configura las variables:
   - `app_url`: `http://localhost` (o tu URL de producción)
   - `app_api_key`: Tu API key de Laravel

2. Selecciona la petición "4. Obtener Dispositivos desde nuestra API"
3. Haz clic en **Send**
4. La respuesta incluirá dispositivos agrupados por organización con sus credenciales de Shelly

## Troubleshooting

### Error 401 (Unauthorized)
- Verifica que la `shelly_api_key` sea correcta
- Asegúrate de que la API key no haya expirado
- Verifica que estés usando el servidor correcto (algunos servidores son específicos por región)

### Error 404 (Not Found)
- Verifica que el `device_id` sea correcto
- Asegúrate de que el dispositivo esté registrado en tu cuenta de Shelly Cloud
- Verifica que la URL del servidor sea correcta

### Error 500 (Internal Server Error)
- Verifica que el dispositivo esté online
- Revisa los logs de Shelly Cloud
- Intenta con otro método (GET vs POST)

### Dispositivo no aparece en la lista
- Verifica que el dispositivo esté conectado a Shelly Cloud
- Asegúrate de que el dispositivo esté activo en la aplicación Laravel
- Verifica que la organización tenga configurada la `shelly_api_key` y `shelly_server`

## Notas importantes

1. **Seguridad**: Nunca compartas tus API keys. Usa variables de entorno en Postman marcadas como "secret".

2. **Servidores de Shelly**: Los servidores pueden variar según la región:
   - EU: `https://shelly-149-eu.shelly.cloud`
   - US: `https://shelly-XX-us.shelly.cloud`
   - Otros: Consulta la documentación de Shelly

3. **Rate Limiting**: Shelly Cloud puede tener límites de rate. No hagas demasiadas peticiones en poco tiempo.

4. **Device ID**: El Device ID puede tener diferentes formatos:
   - Formato corto: `8813bffeabf0`
   - Formato completo: `shellyem3-8813bffeabf0`
   - Verifica qué formato espera tu servidor

## Referencias

- [Documentación de Shelly Cloud API](https://shelly-api-docs.shelly.cloud/)
- [Shelly Cloud Dashboard](https://my.shelly.cloud/)

