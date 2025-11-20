# Verificación de Base de Datos - Tabla `lecturas`

## ✅ Estado: BASE DE DATOS PREPARADA

La estructura de la tabla `lecturas` está **100% preparada** para recibir los datos que n8n está insertando desde los dispositivos Shelly.

## 📊 Comparativa: Estructura BD vs Datos n8n

| Campo en BD | Tipo en BD | Datos de n8n | Estado |
|------------|------------|--------------|--------|
| `dispositivo_id` | `bigint(20) UNSIGNED NOT NULL` | ✅ Enviado | ✅ OK |
| `fecha_lectura` | `timestamp NOT NULL` | ✅ Enviado (formato: 'YYYY-MM-DD HH:MM:SS') | ✅ OK |
| `potencia_total_w` | `decimal(10,2) NOT NULL` | ✅ Enviado | ✅ OK |
| `potencia_canal_1_w` | `decimal(10,2) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `potencia_canal_2_w` | `decimal(10,2) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `potencia_canal_3_w` | `decimal(10,2) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `energia_total_kwh` | `decimal(12,3) NOT NULL` | ✅ Enviado | ✅ OK |
| `energia_retornada_kwh` | `decimal(12,3) NOT NULL DEFAULT 0.000` | ✅ Enviado | ✅ OK |
| `energia_canal_1_kwh` | `decimal(12,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `energia_canal_2_kwh` | `decimal(12,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `energia_canal_3_kwh` | `decimal(12,3) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `voltaje_canal_1` | `decimal(6,2) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `voltaje_canal_2` | `decimal(6,2) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `voltaje_canal_3` | `decimal(6,2) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `voltaje_promedio` | `decimal(6,2) DEFAULT NULL` | ✅ Enviado (calculado) | ✅ OK |
| `corriente_canal_1` | `decimal(8,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `corriente_canal_2` | `decimal(8,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `corriente_canal_3` | `decimal(8,3) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `corriente_neutro` | `decimal(8,3) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `pf_canal_1` | `decimal(4,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `pf_canal_2` | `decimal(4,3) DEFAULT NULL` | ✅ Enviado | ✅ OK |
| `pf_canal_3` | `decimal(4,3) DEFAULT NULL` | ✅ Enviado (0 si no hay) | ✅ OK |
| `online` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `wifi_conectado` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `wifi_rssi` | `int(11) DEFAULT NULL` | ✅ Enviado (int o null) | ✅ OK |
| `cloud_conectado` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `uptime_segundos` | `int(11) DEFAULT NULL` | ✅ Enviado (int o null) | ✅ OK |
| `canal_1_valido` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `canal_2_valido` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `canal_3_valido` | `tinyint(1) NOT NULL DEFAULT 1` | ✅ Enviado (1 o 0) | ✅ OK |
| `datos_raw` | `longtext JSON` | ✅ Enviado (JSON stringificado) | ✅ OK |
| `created_at` | `timestamp NULL DEFAULT NULL` | ⚠️ No enviado (Laravel lo genera) | ✅ OK |
| `updated_at` | `timestamp NULL DEFAULT NULL` | ⚠️ No enviado (Laravel lo genera) | ✅ OK |

## 📝 Observaciones

### ✅ Campos Obligatorios (`NOT NULL`)
Todos los campos obligatorios están siendo enviados correctamente:
- `dispositivo_id`: ✅
- `fecha_lectura`: ✅
- `potencia_total_w`: ✅
- `energia_total_kwh`: ✅

### ✅ Tipos de Datos Compatibles
- **Decimales**: Los valores numéricos se envían como `parseFloat()` y coinciden con los tipos `decimal()` de MySQL
- **Booleanos**: Se envían como `1` o `0` (compatible con `tinyint(1)`)
- **Enteros**: Se envían como `int` o `null` (compatible con `int(11) DEFAULT NULL`)
- **JSON**: Se envía como string JSON (compatible con `longtext` con validación JSON)

### ✅ Precisión de Decimales
La precisión de los campos decimales es suficiente para los valores que se están enviando:

| Campo | Precisión BD | Valor Máximo Esperado | Estado |
|-------|--------------|----------------------|--------|
| `potencia_total_w` | `decimal(10,2)` | Máx: 99999999.99 W | ✅ Suficiente |
| `energia_total_kwh` | `decimal(12,3)` | Máx: 999999999.999 kWh | ✅ Suficiente |
| `voltaje_canal_X` | `decimal(6,2)` | Máx: 9999.99 V | ✅ Suficiente |
| `corriente_canal_X` | `decimal(8,3)` | Máx: 99999.999 A | ✅ Suficiente |
| `pf_canal_X` | `decimal(4,3)` | Máx: 1.000 | ✅ Suficiente |

### ✅ Campos Opcionales
Todos los campos opcionales pueden ser `NULL` o tener valores por defecto, lo cual permite que n8n inserte datos incluso si algunos campos no están disponibles.

## 🔍 Validaciones en la Base de Datos

### Constraint JSON
El campo `datos_raw` tiene una validación JSON:
```sql
CHECK (json_valid(`datos_raw`))
```
✅ n8n envía el JSON correctamente stringificado con `JSON.stringify()`, por lo que es válido.

### Foreign Key
```sql
FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivos` (`id`) ON DELETE CASCADE
```
✅ n8n envía el `dispositivo_id` que existe en la tabla `dispositivos`, por lo que no habrá errores de foreign key.

### Índices
```sql
INDEX `lecturas_dispositivo_id_fecha_lectura_index` (`dispositivo_id`, `fecha_lectura`)
```
✅ Los índices están configurados correctamente para optimizar las consultas por dispositivo y fecha.

## 📊 Ejemplo de Inserción desde n8n

El siguiente JSON que n8n envía es **100% compatible** con la estructura de la base de datos:

```json
{
  "dispositivo_id": 1,
  "fecha_lectura": "2025-11-20 22:29:00",
  "potencia_total_w": 2414.6,
  "potencia_canal_1_w": 2258.4,
  "potencia_canal_2_w": 156.2,
  "potencia_canal_3_w": 0.0,
  "energia_total_kwh": 165148.12,
  "energia_retornada_kwh": 86990.16,
  "energia_canal_1_kwh": 310.62,
  "energia_canal_2_kwh": 164837.5,
  "energia_canal_3_kwh": 0.0,
  "voltaje_canal_1": 219.4,
  "voltaje_canal_2": 219.4,
  "voltaje_canal_3": 0.0,
  "voltaje_promedio": 219.4,
  "corriente_canal_1": 11.406,
  "corriente_canal_2": 5.03,
  "corriente_canal_3": 0.0,
  "corriente_neutro": 0.0,
  "pf_canal_1": 0.98,
  "pf_canal_2": 0.51,
  "pf_canal_3": 0.0,
  "online": 1,
  "wifi_conectado": 1,
  "wifi_rssi": -80,
  "cloud_conectado": 1,
  "uptime_segundos": 693741,
  "canal_1_valido": 1,
  "canal_2_valido": 1,
  "canal_3_valido": 0,
  "datos_raw": "{...JSON completo...}"
}
```

## ✅ Conclusión

**La base de datos está completamente preparada y lista para recibir los datos de n8n.**

- ✅ Todos los campos coinciden
- ✅ Los tipos de datos son compatibles
- ✅ La precisión de decimales es suficiente
- ✅ Las validaciones (JSON, Foreign Key) están correctas
- ✅ Los índices están optimizados
- ✅ No hay conflictos de tipos o restricciones

**No se requiere ninguna modificación en la base de datos.**

