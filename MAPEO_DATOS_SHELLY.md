# Mapeo de Datos de Shelly a la Base de Datos

## ✅ Problema Resuelto

El código de n8n ha sido actualizado para soportar **TRES formatos diferentes**:
1. **Shelly EM3 Trifásico** (con `em:0` y prefijos `a_`, `b_`, `c_`, `emdata:0`) - Dispositivo trifásico con 3 fases (A, B, C)
2. **Shelly EM1/EM1+** (con `em1:0`, `em1:1`, `em1data:0`, `em1data:1`) - Dispositivo de 2 canales (inversor solar + contador casa)
3. **Shelly EM3 Antiguo** (con `emeters` array) - Formato anterior con array de emeters

**Tu dispositivo tiene 2 canales:**
- **Canal 1**: Fase del inversor solar (producción)
- **Canal 2**: Fase del contador de la casa (consumo)

## Datos que el código actual de n8n INTENTA insertar:

Basado en el código del nodo "Procesar Response Shelly" en `db/Shelly GS - Actualizado.json`:

### Campos que se insertan en la tabla `lecturas`:

| Campo en BD | Origen en JSON esperado | Valor en tu JSON actual |
|------------|------------------------|-------------------------|
| `dispositivo_id` | Del nodo anterior (ID del dispositivo en Laravel) | ✅ Disponible |
| `fecha_lectura` | Generado automáticamente (timestamp actual en timezone Madrid) | ✅ Se genera |
| `potencia_total_w` | `device_status.total_power` | ❌ No existe en tu JSON |
| `potencia_canal_1_w` | `device_status.emeters[0].power` | ❌ Debe ser `em1:0.act_power` (2258.4) |
| `potencia_canal_2_w` | `device_status.emeters[1].power` | ❌ Debe ser `em1:1.act_power` (156.2) |
| `potencia_canal_3_w` | `device_status.emeters[2].power` | ❌ No existe |
| `energia_total_kwh` | Suma de `emeters[].total / 1000` | ❌ Debe calcularse |
| `energia_retornada_kwh` | Suma de `emeters[].total_returned / 1000` | ❌ Debe calcularse |
| `energia_canal_1_kwh` | `emeters[0].total / 1000` | ✅ `em1data:0.total_act_energy` (310.62) |
| `energia_canal_2_kwh` | `emeters[1].total / 1000` | ✅ `em1data:1.total_act_energy` (164837.5) |
| `energia_canal_3_kwh` | `emeters[2].total / 1000` | ❌ No existe |
| `voltaje_canal_1` | `emeters[0].voltage` | ✅ `em1:0.voltage` (219.4) |
| `voltaje_canal_2` | `emeters[1].voltage` | ✅ `em1:1.voltage` (219.4) |
| `voltaje_canal_3` | `emeters[2].voltage` | ❌ No existe |
| `voltaje_promedio` | Promedio de los 3 voltajes | ✅ Calculable |
| `corriente_canal_1` | `emeters[0].current` | ✅ `em1:0.current` (11.406) |
| `corriente_canal_2` | `emeters[1].current` | ✅ `em1:1.current` (5.03) |
| `corriente_canal_3` | `emeters[2].current` | ❌ No existe |
| `corriente_neutro` | `device_status.emeter_n.current` | ❌ No existe en tu JSON |
| `pf_canal_1` | `emeters[0].pf` | ✅ `em1:0.pf` (0.98) |
| `pf_canal_2` | `emeters[1].pf` | ✅ `em1:1.pf` (0.51) |
| `pf_canal_3` | `emeters[2].pf` | ❌ No existe |
| `online` | `data.online` | ✅ `data.online` (true) |
| `wifi_conectado` | `device_status.wifi_sta.connected` | ❌ Debe ser `device_status.wifi.status === "got ip"` |
| `wifi_rssi` | `device_status.wifi_sta.rssi` | ✅ `device_status.wifi.rssi` (-80) |
| `cloud_conectado` | `device_status.cloud.connected` | ✅ `device_status.cloud.connected` (true) |
| `uptime_segundos` | `device_status.uptime` | ✅ `device_status.sys.uptime` (693741) |
| `canal_1_valido` | `emeters[0].is_valid` | ❌ No existe en tu JSON |
| `canal_2_valido` | `emeters[1].is_valid` | ❌ No existe en tu JSON |
| `canal_3_valido` | `emeters[2].is_valid` | ❌ No existe |
| `datos_raw` | `JSON.stringify(response.data)` | ✅ Todo el JSON completo |

## 📊 Datos REALES disponibles en tu JSON de Shelly:

### Del JSON que proporcionaste:

```json
{
  "data": {
    "online": true,
    "device_status": {
      "em1:0": {
        "act_power": 2258.4,        // ✅ Potencia canal 1
        "aprt_power": 2507.8,       // Potencia aparente
        "current": 11.406,          // ✅ Corriente canal 1
        "freq": 50,                 // Frecuencia
        "pf": 0.98,                 // ✅ Factor de potencia canal 1
        "voltage": 219.4,           // ✅ Voltaje canal 1
        "id": 0
      },
      "em1:1": {
        "act_power": 156.2,         // ✅ Potencia canal 2
        "aprt_power": 1117.3,       // Potencia aparente
        "current": 5.03,            // ✅ Corriente canal 2
        "freq": 49.9,               // Frecuencia
        "pf": 0.51,                 // ✅ Factor de potencia canal 2
        "voltage": 219.4,           // ✅ Voltaje canal 2
        "id": 1
      },
      "em1data:0": {
        "total_act_energy": 310.62,           // ✅ Energía activa canal 1 (ya en kWh)
        "total_act_ret_energy": 85830.92,     // ✅ Energía retornada canal 1 (ya en kWh)
        "id": 0
      },
      "em1data:1": {
        "total_act_energy": 164837.5,         // ✅ Energía activa canal 2 (ya en kWh)
        "total_act_ret_energy": 1159.24,      // ✅ Energía retornada canal 2 (ya en kWh)
        "id": 1
      },
      "wifi": {
        "sta_ip": "192.168.1.123",
        "status": "got ip",          // ✅ Estado WiFi
        "ssid": "TP-Link_03CC",
        "rssi": -80,                 // ✅ RSSI
        "connected": false           // ⚠️ Confuso: status dice "got ip" pero connected es false
      },
      "cloud": {
        "connected": true            // ✅ Cloud conectado
      },
      "sys": {
        "uptime": 693741,            // ✅ Uptime en segundos
        "unixtime": 1763648985,      // Timestamp Unix
        "time": "22:29",
        "mac": "08F9E0E62CC0"
      },
      "ts": 1763656381.52            // ✅ Timestamp
    }
  }
}
```

## 🔧 Solución Necesaria

El código de n8n necesita actualizarse para manejar el formato de tu dispositivo Shelly. Aquí está el mapeo correcto:

### Mapeo Correcto para tu dispositivo:

```javascript
// Potencia
potencia_canal_1_w: deviceStatus["em1:0"].act_power
potencia_canal_2_w: deviceStatus["em1:1"].act_power
potencia_total_w: deviceStatus["em1:0"].act_power + deviceStatus["em1:1"].act_power

// Energía (ya viene en kWh, no dividir por 1000)
energia_canal_1_kwh: deviceStatus["em1data:0"].total_act_energy
energia_canal_2_kwh: deviceStatus["em1data:1"].total_act_energy
energia_retornada_kwh: deviceStatus["em1data:0"].total_act_ret_energy + deviceStatus["em1data:1"].total_act_ret_energy

// Voltajes
voltaje_canal_1: deviceStatus["em1:0"].voltage
voltaje_canal_2: deviceStatus["em1:1"].voltage
voltaje_promedio: (deviceStatus["em1:0"].voltage + deviceStatus["em1:1"].voltage) / 2

// Corrientes
corriente_canal_1: deviceStatus["em1:0"].current
corriente_canal_2: deviceStatus["em1:1"].current

// Factor de potencia
pf_canal_1: deviceStatus["em1:0"].pf
pf_canal_2: deviceStatus["em1:1"].pf

// Estado
online: response.data.online
wifi_conectado: deviceStatus.wifi.status === "got ip"
wifi_rssi: deviceStatus.wifi.rssi
cloud_conectado: deviceStatus.cloud.connected
uptime_segundos: deviceStatus.sys.uptime

// Fecha
fecha_lectura: deviceStatus.ts (convertir a timestamp MySQL) o deviceStatus.sys.unixtime
```

## 📝 Resumen - Datos que AHORA se insertan correctamente

**✅ TODOS los campos se insertan correctamente:**

### Datos de Potencia (W):
- ✅ `potencia_total_w`: Suma de ambos canales (2258.4 + 156.2 = 2414.6 W)
- ✅ `potencia_canal_1_w`: Canal inversor solar (2258.4 W)
- ✅ `potencia_canal_2_w`: Canal contador casa (156.2 W)
- ✅ `potencia_canal_3_w`: 0 (solo 2 canales)

### Datos de Energía (kWh):
- ✅ `energia_canal_1_kwh`: Energía activa canal 1 (310.62 kWh)
- ✅ `energia_canal_2_kwh`: Energía activa canal 2 (164837.5 kWh)
- ✅ `energia_total_kwh`: Suma de ambos (165148.12 kWh)
- ✅ `energia_retornada_kwh`: Suma de energías retornadas (86990.16 kWh)
- ✅ `energia_canal_3_kwh`: 0 (solo 2 canales)

### Datos de Voltaje (V):
- ✅ `voltaje_canal_1`: 219.4 V
- ✅ `voltaje_canal_2`: 219.4 V
- ✅ `voltaje_promedio`: Promedio calculado (219.4 V)
- ✅ `voltaje_canal_3`: 0

### Datos de Corriente (A):
- ✅ `corriente_canal_1`: 11.406 A
- ✅ `corriente_canal_2`: 5.03 A
- ✅ `corriente_canal_3`: 0

### Factor de Potencia:
- ✅ `pf_canal_1`: 0.98
- ✅ `pf_canal_2`: 0.51
- ✅ `pf_canal_3`: 0

### Estado del Dispositivo:
- ✅ `online`: true (1)
- ✅ `wifi_conectado`: true si `wifi.status === "got ip"` (1)
- ✅ `wifi_rssi`: -80
- ✅ `cloud_conectado`: true (1)
- ✅ `uptime_segundos`: 693741 segundos

### Validez de Canales:
- ✅ `canal_1_valido`: 1 (si tiene datos válidos)
- ✅ `canal_2_valido`: 1 (si tiene datos válidos)
- ✅ `canal_3_valido`: 0 (solo 2 canales)

### Metadatos:
- ✅ `fecha_lectura`: Timestamp del dispositivo (`device_status.ts`) o actual
- ✅ `datos_raw`: JSON completo en formato string

