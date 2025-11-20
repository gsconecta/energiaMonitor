# ✅ Actualización Completa del Workflow n8n

## 📋 Cambios Realizados

El workflow `db/Shelly GS - Actualizado.json` ha sido actualizado con las siguientes mejoras:

### 1. ✅ Detección Automática de Número de Fases

El nodo **"Procesar Response Shelly"** ahora detecta automáticamente el número de fases:
- **Trifásico (3)**: Detecta formato `em:0` con prefijos `a_`, `b_`, `c_`
- **Bifásico (2)**: Detecta formato `em1:0` y `em1:1`
- **Monofásico (1)**: Detecta formato `emeters` con canales activos

El resultado se almacena en `_num_fases` en el output del nodo.

### 2. ✅ Nuevo Nodo: "Actualizar Num Fases Dispositivo"

Se ha agregado un nuevo nodo HTTP Request que:
- Se ejecuta después de "Insertar Lectura en MySQL"
- Llama al endpoint API: `/api/dispositivos/{dispositivo_id}/actualizar-fases`
- Envía el número de fases detectado
- Actualiza automáticamente el campo `num_fases` en la base de datos

## 🔧 Configuración Requerida

### Paso 1: Importar el Workflow Actualizado

1. Abre n8n
2. Importa el archivo: `db/Shelly GS - Actualizado.json`
3. O actualiza manualmente tu workflow existente

### Paso 2: Configurar el Nodo "Actualizar Num Fases Dispositivo"

**URL del Endpoint:**
```
https://monitor.cloudmallorca.com/api/dispositivos/{{ $json.dispositivo_id }}/actualizar-fases
```

Para desarrollo:
```
http://localhost/api/dispositivos/{{ $json.dispositivo_id }}/actualizar-fases
```

**Headers:**
- `X-API-Key`: Tu API Key de Laravel (del archivo `.env`)
- `Content-Type`: `application/json`

**Body (JSON):**
```json
{
  "num_fases": {{ $json._num_fases }}
}
```

En n8n, configura el body como:
- **Specify Body**: JSON
- **JSON Body**: `={{ JSON.stringify({ num_fases: $json._num_fases !== null && $json._num_fases !== undefined ? $json._num_fases : null }) }}`

**Options:**
- ✅ Activar **"Ignore Response Code"** (para que no falle si hay error)
- **Timeout**: 5000 ms (5 segundos)

### Paso 3: Verificar API Key

Asegúrate de que el header `X-API-Key` tenga el mismo valor que `API_KEY` en tu archivo `.env` de Laravel.

## 🔄 Flujo del Workflow Actualizado

```
1. Schedule Trigger (cada 5 min)
   ↓
2. Obtener Dispositivos por Organización
   ↓
3. Extraer Dispositivos con Credenciales
   ↓
4. Loop Over Dispositivos
   ↓
5. Wait 1s entre requests
   ↓
6. Preparar Request Shelly
   ↓
7. Request Shelly Cloud
   ↓
8. Procesar Response Shelly
   ├─ Detecta número de fases automáticamente
   ├─ Calcula todos los campos de la lectura
   └─ Genera JSON con _num_fases incluido
   ↓
9. Insertar Lectura en MySQL
   ↓
10. Actualizar Num Fases Dispositivo ⭐ NUEVO
    ├─ POST a /api/dispositivos/{id}/actualizar-fases
    └─ Actualiza campo num_fases del dispositivo
   ↓
11. Loop Back
```

## ✅ Verificación

### 1. Verificar que el Workflow Funciona

1. Activa el workflow en n8n
2. Ejecuta una prueba manual
3. Verifica los logs de cada nodo

### 2. Verificar que se Actualiza num_fases

Ejecuta en Laravel:
```bash
php artisan tinker

# Ver dispositivos con su número de fases
Dispositivo::activos()->get(['id', 'nombre', 'num_fases']);

# Verificar un dispositivo específico
$dispositivo = Dispositivo::find(1);
echo "Dispositivo: {$dispositivo->nombre}\n";
echo "Num Fases: {$dispositivo->num_fases} ({$dispositivo->fases_label})\n";
```

### 3. Verificar en la Base de Datos

```sql
SELECT id, nombre, num_fases 
FROM dispositivos 
WHERE activo = 1 
ORDER BY id;
```

Todos los dispositivos deberían tener `num_fases` con valor 1, 2, o 3 (no NULL).

## 🔍 Solución de Problemas

### Problema: El nodo "Actualizar Num Fases Dispositivo" falla

**Solución:**
- Verifica que la URL del endpoint sea correcta
- Verifica que el header `X-API-Key` tenga el valor correcto
- Activa "Ignore Response Code" para que no bloquee el workflow

### Problema: num_fases sigue siendo NULL

**Posibles causas:**
1. El código no detecta correctamente el formato
2. El endpoint no está siendo llamado
3. El endpoint falla al detectar

**Solución:**
- Revisa los logs del nodo "Procesar Response Shelly" para ver si `_num_fases` tiene valor
- Revisa los logs del nodo "Actualizar Num Fases Dispositivo" para ver la respuesta del endpoint
- Verifica manualmente con: `php artisan dispositivos:actualizar-fases --dispositivo=1`

### Problema: Error 404 en el endpoint

**Solución:**
- Verifica que la URL del endpoint sea correcta
- Verifica que el `dispositivo_id` en el JSON tenga un valor válido
- Verifica que el dispositivo exista en la base de datos

## 📊 Estado Actual

### ✅ Completado:
- ✅ Migración de base de datos ejecutada
- ✅ Modelo Dispositivo actualizado con métodos helper
- ✅ Endpoint API creado y funcionando
- ✅ Comando artisan funcionando (4 dispositivos actualizados)
- ✅ Código n8n actualizado para detectar fases
- ✅ Nuevo nodo HTTP Request agregado al workflow

### ⚠️ Pendiente:
- ⚠️ Importar el workflow actualizado en n8n
- ⚠️ Configurar el API Key en el nodo HTTP Request
- ⚠️ Probar el workflow completo
- ⚠️ Verificar que los dispositivos se actualizan automáticamente

## 📝 Notas Finales

1. **El workflow actualizado está listo** en `db/Shelly GS - Actualizado.json`
2. **Importa el workflow** en n8n y configura el API Key
3. **El sistema detectará automáticamente** el número de fases después de cada lectura
4. **Si falla la actualización automática**, puedes ejecutar manualmente:
   ```bash
   php artisan dispositivos:actualizar-fases --only-null
   ```

## 🎯 Resultado Esperado

Después de actualizar el workflow en n8n:

- ✅ Cada vez que se inserta una lectura, el dispositivo se actualiza automáticamente con `num_fases`
- ✅ Los dispositivos tendrán valores: 1 (monofásico), 2 (bifásico), o 3 (trifásico)
- ✅ Puedes filtrar y gestionar dispositivos por tipo de fase desde Laravel

¡El sistema está completamente implementado y listo para usar! 🚀

