# Gestión de Fases en Dispositivos

## 📋 Resumen

Se ha implementado un sistema completo para diferenciar y gestionar dispositivos monofásicos (1 fase), bifásicos (2 fases) y trifásicos (3 fases).

## 🗄️ Cambios en la Base de Datos

### Nueva Migración
- **Archivo**: `database/migrations/2025_11_20_165841_add_num_fases_to_dispositivos_table.php`
- **Campo agregado**: `num_fases` (TINYINT, nullable)
  - `1` = Monofásico
  - `2` = Bifásico  
  - `3` = Trifásico
  - `NULL` = No determinado

### Ejecutar Migración
```bash
php artisan migrate
```

## 🎯 Métodos de Detección

### 1. Detección Automática desde n8n

El código de n8n detecta automáticamente el formato del dispositivo:

```javascript
// Formato EM3 trifásico (em:0 con a_, b_, c_)
if (deviceStatus["em:0"] && deviceStatus["em:0"].a_act_power !== undefined) {
  num_fases = 3; // Trifásico
}

// Formato EM1/EM1+ (em1:0, em1:1)
else if (deviceStatus["em1:0"] || deviceStatus["em1:1"]) {
  num_fases = 2; // Bifásico
}

// Formato EM3 antiguo (emeters array)
else if (deviceStatus.emeters && Array.isArray(deviceStatus.emeters)) {
  num_fases = deviceStatus.emeters.filter(e => e.power > 0).length; // 1-3
}
```

### 2. Detección desde Modelo Laravel

El modelo `Dispositivo` incluye métodos para detectar el número de fases:

```php
// Detectar desde última lectura (método 1)
$numFases = $dispositivo->detectarNumFases();

// Detectar desde datos_raw JSON (método 2 - más preciso)
$numFases = $dispositivo->detectarNumFasesDesdeRaw();

// Actualizar automáticamente
$dispositivo->actualizarNumFasesAuto();
```

## 🔌 Endpoint API

### Actualizar Número de Fases

**POST** `/api/dispositivos/{dispositivo_id}/actualizar-fases`

**Headers:**
```
X-API-Key: tu-api-key
```

**Body (opcional):**
```json
{
  "num_fases": 3
}
```

Si no se envía `num_fases`, se detecta automáticamente desde la última lectura.

**Respuesta:**
```json
{
  "success": true,
  "message": "Número de fases detectado y actualizado automáticamente",
  "dispositivo_id": 1,
  "num_fases": 3,
  "fases_label": "Trifásico",
  "actualizado": true
}
```

## 🛠️ Comando Artisan

### Actualizar Todos los Dispositivos

```bash
php artisan dispositivos:actualizar-fases
```

Este comando:
1. Recorre todos los dispositivos activos
2. Detecta automáticamente el número de fases desde su última lectura
3. Actualiza el campo `num_fases` en la base de datos
4. Muestra un resumen de los dispositivos actualizados

**Opciones:**
- `--force`: Actualiza incluso si ya tiene un valor asignado
- `--dispositivo={id}`: Actualiza solo un dispositivo específico

## 📊 Métodos Helper en Modelo

### Scopes para Consultas

```php
// Dispositivos monofásicos
Dispositivo::monofasico()->get();

// Dispositivos bifásicos
Dispositivo::bifasico()->get();

// Dispositivos trifásicos
Dispositivo::trifasico()->get();

// Por número de fases específico
Dispositivo::fases(3)->get();
```

### Verificaciones

```php
$dispositivo->esMonofasico();  // true/false
$dispositivo->esBifasico();    // true/false
$dispositivo->esTrifasico();   // true/false
$dispositivo->fases_label;     // "Monofásico", "Bifásico", "Trifásico"
```

## 🔄 Flujo Automático en n8n

### Opción 1: Actualizar después de insertar lectura

Después del nodo "Insertar Lectura en MySQL", agregar un nodo HTTP Request:

**URL:** `{{$env.APP_URL}}/api/dispositivos/{{$json.dispositivo_id}}/actualizar-fases`
**Method:** POST
**Headers:**
- `X-API-Key`: `{{$env.API_KEY}}`

Esto actualizará automáticamente el número de fases cada vez que se inserte una lectura.

### Opción 2: Calcular en el código y actualizar manualmente

En el nodo "Procesar Response Shelly", agregar la detección:

```javascript
// Detectar número de fases
let numFases = null;
if (deviceStatus["em:0"] && deviceStatus["em:0"].a_act_power !== undefined) {
  numFases = 3; // Trifásico
} else if (deviceStatus["em1:0"] || deviceStatus["em1:1"]) {
  numFases = 2; // Bifásico
} else if (deviceStatus.emeters && Array.isArray(deviceStatus.emeters)) {
  numFases = deviceStatus.emeters.filter(e => (e.power || 0) > 0).length;
}

// Agregar al JSON de salida (opcional)
return [{
  json: {
    // ... otros campos ...
    num_fases: numFases
  }
}];
```

Luego, actualizar el dispositivo con un nodo MySQL UPDATE o llamar al endpoint API.

## 📝 Actualizar Dispositivos Existentes

### Desde Laravel Tinker

```php
php artisan tinker

// Actualizar un dispositivo específico
$dispositivo = Dispositivo::find(1);
$dispositivo->actualizarNumFasesAuto();

// Actualizar todos los dispositivos
Dispositivo::activos()->each(function ($dispositivo) {
    $dispositivo->actualizarNumFasesAuto();
});
```

### Desde Comando Artisan

```bash
# Actualizar todos los dispositivos
php artisan dispositivos:actualizar-fases

# Actualizar solo dispositivos sin num_fases
php artisan dispositivos:actualizar-fases --only-null

# Forzar actualización incluso si ya tiene valor
php artisan dispositivos:actualizar-fases --force
```

## 🎨 Uso en Interfaz

En el controlador y vistas, ahora puedes:

```php
// En el controlador
$dispositivos = Dispositivo::with('sitio')->get()->map(function ($dispositivo) {
    return [
        'id' => $dispositivo->id,
        'nombre' => $dispositivo->nombre,
        'num_fases' => $dispositivo->num_fases,
        'fases_label' => $dispositivo->fases_label, // "Monofásico", etc.
        'es_trifasico' => $dispositivo->esTrifasico(),
    ];
});
```

## ✅ Checklist de Implementación

- [x] Migración creada
- [x] Modelo actualizado con métodos helper
- [x] Endpoint API creado
- [ ] Comando artisan creado (en progreso)
- [ ] Código n8n actualizado para detectar fases
- [ ] Actualizar dispositivos existentes
- [ ] Interfaz de usuario para mostrar/gestionar fases

## 🔍 Ejemplos de Detección

### Dispositivo Trifásico
```json
{
  "device_status": {
    "em:0": {
      "a_act_power": 405.5,
      "b_act_power": 619.3,
      "c_act_power": 42.9
    }
  }
}
```
**Resultado:** `num_fases = 3` ✅

### Dispositivo Bifásico (EM1)
```json
{
  "device_status": {
    "em1:0": { "act_power": 2258.4 },
    "em1:1": { "act_power": 156.2 }
  }
}
```
**Resultado:** `num_fases = 2` ✅

### Dispositivo Monofásico (EM3 antiguo con 1 canal activo)
```json
{
  "device_status": {
    "emeters": [
      { "power": 1000 },
      { "power": 0 },
      { "power": 0 }
    ]
  }
}
```
**Resultado:** `num_fases = 1` ✅

