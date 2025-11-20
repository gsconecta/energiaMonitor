# 📋 Resumen: Gestión de Fases en Dispositivos

## ✅ Implementación Completada

Se ha implementado un sistema completo para diferenciar dispositivos monofásicos, bifásicos y trifásicos en la aplicación Laravel.

## 🔧 Cambios Realizados

### 1. Base de Datos
- ✅ **Migración creada**: `2025_11_20_165841_add_num_fases_to_dispositivos_table.php`
- ✅ **Campo agregado**: `num_fases` (TINYINT, nullable) en tabla `dispositivos`
  - `1` = Monofásico
  - `2` = Bifásico
  - `3` = Trifásico
  - `NULL` = No determinado

### 2. Modelo Dispositivo
- ✅ Agregado `num_fases` a `$fillable` y `$casts`
- ✅ Métodos de detección:
  - `detectarNumFases()` - Detecta desde última lectura
  - `detectarNumFasesDesdeRaw()` - Detecta desde JSON raw (más preciso)
  - `actualizarNumFasesAuto()` - Actualiza automáticamente
- ✅ Métodos helper:
  - `esMonofasico()`, `esBifasico()`, `esTrifasico()`
  - `getFasesLabelAttribute()` - "Monofásico", "Bifásico", "Trifásico"
- ✅ Scopes:
  - `scopeMonofasico()`, `scopeBifasico()`, `scopeTrifasico()`
  - `scopeFases($numFases)`

### 3. Controlador
- ✅ Agregado `num_fases` a validaciones en `store()` y `update()`
- ✅ Actualización automática cuando se actualiza un dispositivo sin `num_fases`

### 4. API
- ✅ **Endpoint creado**: `POST /api/dispositivos/{dispositivo}/actualizar-fases`
  - Detecta automáticamente si no se envía `num_fases`
  - Permite actualización manual

### 5. Comando Artisan
- ✅ **Comando creado**: `php artisan dispositivos:actualizar-fases`
  - Actualiza todos los dispositivos activos
  - Opciones: `--dispositivo={id}`, `--only-null`, `--force`

### 6. Código n8n
- ✅ **Detección automática agregada** en el nodo "Procesar Response Shelly"
  - Calcula `num_fases` según el formato del JSON
  - Incluido en el output (opcional para actualización manual)

## 📊 Cómo Funciona la Detección

### En n8n (Automático)

El código detecta el formato del JSON de Shelly:

1. **Trifásico** (`num_fases = 3`):
   - Formato: `em:0` con prefijos `a_`, `b_`, `c_`
   - Ejemplo: `em:0.a_act_power`, `em:0.b_act_power`, `em:0.c_act_power`

2. **Bifásico** (`num_fases = 2`):
   - Formato: `em1:0` y `em1:1`
   - Ejemplo: Dispositivo con inversor solar + contador casa

3. **Monofásico** (`num_fases = 1`):
   - Formato: `emeters` array con 1 canal activo
   - Ejemplo: Solo `emeters[0].power > 0`

### En Laravel (Backup)

Si n8n no actualiza automáticamente, Laravel puede detectar desde:
- Última lectura: Cuenta canales válidos
- JSON raw: Analiza el formato del JSON almacenado

## 🚀 Pasos para Implementar

### 1. Ejecutar Migración

```bash
php artisan migrate
```

### 2. Actualizar Dispositivos Existentes

```bash
# Actualizar todos los dispositivos
php artisan dispositivos:actualizar-fases

# Solo los que no tienen num_fases
php artisan dispositivos:actualizar-fases --only-null
```

### 3. Actualizar n8n Workflow (Opcional)

Después del nodo "Insertar Lectura en MySQL", agregar un nodo HTTP Request:

**Configuración:**
- **URL**: `{{$env.APP_URL}}/api/dispositivos/{{$json.dispositivo_id}}/actualizar-fases`
- **Method**: POST
- **Headers**:
  - `X-API-Key`: `{{$env.API_KEY}}`
  - `Content-Type`: `application/json`

Esto actualizará automáticamente el número de fases cada vez que se inserte una lectura.

### 4. Actualizar desde Laravel (Alternativa)

Si prefieres actualizar desde Laravel en lugar de n8n, puedes usar un **Observer** o **Event**:

**Crear Observer:**
```bash
php artisan make:observer LecturaObserver --model=Lectura
```

**En el Observer:**
```php
public function created(Lectura $lectura)
{
    // Actualizar número de fases del dispositivo
    $lectura->dispositivo->actualizarNumFasesAuto();
}
```

## 💡 Uso en la Aplicación

### Filtrar Dispositivos

```php
// Dispositivos trifásicos
$trifasicos = Dispositivo::trifasico()->get();

// Dispositivos bifásicos
$bifasicos = Dispositivo::bifasico()->get();

// Dispositivos monofásicos
$monofasicos = Dispositivo::monofasico()->get();
```

### Verificar Tipo

```php
if ($dispositivo->esTrifasico()) {
    // Mostrar información para 3 fases
    $fases = ['A', 'B', 'C'];
} elseif ($dispositivo->esBifasico()) {
    // Mostrar información para 2 canales
    $canales = ['Inversor', 'Contador'];
}
```

### Obtener Label

```php
$label = $dispositivo->fases_label; // "Monofásico", "Bifásico", "Trifásico"
```

## 🔄 Flujo Recomendado

### Opción 1: Automático desde n8n (Recomendado)

1. n8n procesa datos de Shelly
2. Detecta número de fases automáticamente
3. Inserta lectura en MySQL
4. Llama a API para actualizar `num_fases` del dispositivo
5. ✅ Dispositivo siempre tiene `num_fases` actualizado

### Opción 2: Semiautomático con Comando

1. n8n inserta lecturas normalmente
2. Ejecutar comando periódicamente:
   ```bash
   php artisan dispositivos:actualizar-fases --only-null
   ```
3. ✅ Dispositivos se actualizan en batch

### Opción 3: Observer en Laravel

1. Crear Observer para el modelo Lectura
2. Cada vez que se crea una lectura, actualizar automáticamente
3. ✅ Actualización inmediata desde Laravel

## 📝 Ejemplo de Actualización Manual

Desde Laravel Tinker:

```php
php artisan tinker

// Actualizar un dispositivo específico
$dispositivo = Dispositivo::find(1);
$dispositivo->actualizarNumFasesAuto();

// Ver resultado
$dispositivo->fresh();
echo $dispositivo->num_fases; // 1, 2, o 3
echo $dispositivo->fases_label; // "Monofásico", etc.
```

## ✨ Ventajas de esta Implementación

1. **Detección Automática**: No requiere configuración manual
2. **Múltiples Métodos**: Detección desde n8n, Laravel, o manual
3. **Backward Compatible**: Funciona con dispositivos existentes
4. **Flexible**: Permite actualización manual si es necesario
5. **Escalable**: Fácil de extender para otros tipos de dispositivos

## 🎯 Próximos Pasos Sugeridos

1. ✅ Ejecutar migración
2. ✅ Actualizar dispositivos existentes con el comando
3. ⚠️  Actualizar workflow de n8n (opcional pero recomendado)
4. ⚠️  Actualizar interfaz de usuario para mostrar `num_fases`
5. ⚠️  Agregar filtros en la interfaz por número de fases

