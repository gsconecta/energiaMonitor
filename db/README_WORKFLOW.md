# Workflow n8n - Recuperación de Lecturas de Dispositivos Shelly

## Descripción

Este workflow actualizado recupera las lecturas de los dispositivos Shelly agrupados por organización, utilizando la API Key y el servidor configurados para cada organización.

## Cambios Principales

### ❌ Workflow Original (`Shelly GS.json`)
- ❌ API Key hardcodeada en el código
- ❌ Servidor de Shelly hardcodeado (`https://shelly-149-eu.shelly.cloud`)
- ❌ Consulta SQL directa a la base de datos
- ❌ No tiene en cuenta las organizaciones

### ✅ Workflow Actualizado (`Shelly GS - Actualizado.json`)
- ✅ Usa el endpoint API `/api/dispositivos-activos-por-organizacion`
- ✅ Obtiene dinámicamente la API Key de cada organización
- ✅ Usa el servidor de Shelly configurado para cada organización
- ✅ Agrupa dispositivos por organización
- ✅ Filtra organizaciones sin API Key o servidor configurado

## Flujo del Workflow

1. **Schedule Trigger**: Se ejecuta cada 5 minutos
2. **Obtener Dispositivos por Organización**: 
   - Llamada GET a `/api/dispositivos-activos-por-organizacion`
   - Retorna dispositivos agrupados por organización con sus credenciales
3. **Extraer Dispositivos con Credenciales**:
   - Extrae cada dispositivo con su información de organización
   - Filtra organizaciones sin API Key o servidor
4. **Loop Over Dispositivos**: Itera sobre cada dispositivo
5. **Wait 1s**: Espera 1 segundo entre requests para no sobrecargar
6. **Preparar Request Shelly**:
   - Construye la URL del servidor de Shelly según la organización
   - Prepara los parámetros con device_id y auth_key
7. **Request Shelly Cloud**:
   - POST a `{shelly_server}/device/status`
   - Envía device_id y auth_key específicos de la organización
8. **Procesar Response Shelly**:
   - Extrae datos de potencia, energía, voltajes, corrientes, etc.
   - Formatea según la estructura de la tabla `lecturas`
9. **Insertar Lectura en MySQL**: Inserta la lectura en la base de datos
10. **Loop Back**: Vuelve al loop para procesar el siguiente dispositivo

## Configuración

### 1. URL del Endpoint API

Actualiza la URL en el nodo "Obtener Dispositivos por Organización":
- Desarrollo: `http://localhost/api/dispositivos-activos-por-organizacion`
- Producción: `https://monitor.cloudmallorca.com/api/dispositivos-activos-por-organizacion`

### 2. Credenciales MySQL

Asegúrate de tener configuradas las credenciales de MySQL en el nodo "Insertar Lectura en MySQL".

### 3. Requisitos

- Cada organización debe tener configurada:
  - `shelly_api_key`: Clave API de Shelly Cloud
  - `shelly_server`: URL del servidor de Shelly (ej: `https://shelly-149-eu.shelly.cloud`)
- Solo se procesan dispositivos activos (`activo = 1`)
- Se omiten organizaciones sin credenciales configuradas

## Estructura de Datos

### Entrada (del endpoint API)
```json
[
  {
    "organizacion": {
      "id": 1,
      "nombre": "Mi Organización",
      "codigo": "mi-org",
      "shelly_api_key": "clave-desencriptada",
      "shelly_server": "https://shelly-149-eu.shelly.cloud"
    },
    "dispositivos": [
      {
        "id": 1,
        "device_id": "shellyem3-C8C9A33E6505",
        "nombre": "Dispositivo 1",
        "tipo": "produccion",
        "modelo": "Shelly EM3"
      }
    ]
  }
]
```

### Salida (a la tabla lecturas)
```json
{
  "dispositivo_id": 1,
  "fecha_lectura": "2025-11-20 14:30:00",
  "potencia_total_w": 1234.56,
  "potencia_canal_1_w": 400.00,
  "potencia_canal_2_w": 400.00,
  "potencia_canal_3_w": 434.56,
  "energia_total_kwh": 123.45,
  "energia_retornada_kwh": 0.00,
  "energia_canal_1_kwh": 41.15,
  "energia_canal_2_kwh": 41.15,
  "energia_canal_3_kwh": 41.15,
  "voltaje_canal_1": 230.5,
  "voltaje_canal_2": 230.3,
  "voltaje_canal_3": 230.4,
  "voltaje_promedio": 230.4,
  "corriente_canal_1": 1.734,
  "corriente_canal_2": 1.738,
  "corriente_canal_3": 1.886,
  "corriente_neutro": 0.0,
  "pf_canal_1": 1.0,
  "pf_canal_2": 1.0,
  "pf_canal_3": 1.0,
  "online": 1,
  "wifi_conectado": 1,
  "wifi_rssi": -45,
  "cloud_conectado": 1,
  "uptime_segundos": 86400,
  "canal_1_valido": 1,
  "canal_2_valido": 1,
  "canal_3_valido": 1,
  "datos_raw": "{...}"
}
```

## Mejoras Futuras

- [ ] Agregar manejo de errores más robusto
- [ ] Agregar logging de errores por organización
- [ ] Implementar reintentos automáticos en caso de fallo
- [ ] Agregar métricas de tiempo de respuesta por dispositivo
- [ ] Agregar notificaciones cuando un dispositivo no responde

