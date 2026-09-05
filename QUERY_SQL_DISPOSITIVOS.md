# Consulta SQL para Dispositivos Activos Agrupados por Organización

## Para uso en n8n con Base de Datos MySQL

Esta consulta SQL devuelve todos los dispositivos activos con la información de su organización (API Key y servidor de Shelly).

> **Nota:** la columna `dispositivos.modelo` se renombró a `modelo_legacy` al añadir el catálogo
> de modelos de dispositivo (cada dispositivo puede colgar ahora de un `modelo_dispositivo_id`, y
> `modelo_legacy` conserva solo el texto antiguo). Si ejecutas esta consulta directamente contra
> MySQL desde un nodo n8n, usa `d.modelo_legacy AS modelo`: `d.modelo` ya no existe y la consulta
> fallaría con "Unknown column".

```sql
SELECT 
    d.id,
    d.device_id,
    d.nombre,
    d.tipo,
    d.modelo_legacy AS modelo,
    o.id as organizacion_id,
    o.nombre as organizacion_nombre,
    o.codigo as organizacion_codigo,
    o.shelly_api_key,
    o.shelly_server
FROM dispositivos d
INNER JOIN sitios s ON d.sitio_id = s.id
INNER JOIN organizaciones o ON s.organizacion_id = o.id
WHERE d.activo = 1
    AND d.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND o.deleted_at IS NULL
ORDER BY o.id, d.id;
```

### Nota sobre shelly_api_key

El campo `shelly_api_key` está encriptado en la base de datos. Laravel lo desencripta automáticamente cuando se accede a través de Eloquent.

**Para usar en n8n con consulta SQL directa**, tendrás que:
1. Usar el endpoint API: `/api/dispositivos-activos-por-organizacion` (recomendado)
2. O desencriptar la clave manualmente usando el método de Laravel

### Endpoint API (Recomendado)

**URL:** `GET /api/dispositivos-activos-por-organizacion`

**Respuesta:**
```json
[
  {
    "organizacion": {
      "id": 1,
      "nombre": "Mi Organización",
      "codigo": "mi-org",
      "shelly_api_key": "clave-desencriptada",
      "shelly_server": "https://api.shelly.cloud"
    },
    "dispositivos": [
      {
        "id": 1,
        "device_id": "shellyem3-C8C9A33E6505",
        "nombre": "Dispositivo 1",
        "tipo": "produccion",
        "modelo": "Shelly EM3"
      },
      {
        "id": 2,
        "device_id": "shellyem3-ABC123",
        "nombre": "Dispositivo 2",
        "tipo": "consumo",
        "modelo": "Shelly EM3"
      }
    ]
  }
]
```

### Ejemplo de uso en n8n

1. **Con HTTP Request Node:**
   - Method: GET
   - URL: `https://tu-dominio.com/api/dispositivos-activos-por-organizacion`
   - Headers: `Authorization: Bearer {token}` (si aplica)

2. **Con MySQL Node:**
   - Usa la consulta SQL proporcionada arriba
   - Agrupa los resultados por `organizacion_id` en un nodo Function
   - **Nota:** La clave API estará encriptada y necesitarás desencriptarla

