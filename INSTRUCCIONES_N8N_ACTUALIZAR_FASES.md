# Instrucciones para Actualizar Workflow de n8n

## ✅ Cambios Realizados en el Workflow

Se ha agregado un nuevo nodo **"Actualizar Num Fases Dispositivo"** que actualiza automáticamente el número de fases del dispositivo después de insertar cada lectura.

## 📋 Pasos para Actualizar el Workflow en n8n

### Opción 1: Importar el Workflow Actualizado

1. Abre n8n
2. Ve a **Workflows**
3. Haz clic en **Import from File** o **Import from URL**
4. Selecciona el archivo: `db/Shelly GS - Actualizado.json`
5. Asegúrate de actualizar las URLs y API Keys según tu entorno

### Opción 2: Agregar el Nodo Manualmente

Si prefieres agregar el nodo manualmente a tu workflow existente:

#### 1. Agregar el Nodo HTTP Request

1. Abre tu workflow en n8n
2. Haz clic en el nodo **"Insertar Lectura en MySQL"**
3. Haz clic derecho y selecciona **Add Node** → **Add Node After**
4. Busca y selecciona **HTTP Request**

#### 2. Configurar el Nodo HTTP Request

**Configuración Básica:**
- **Name**: `Actualizar Num Fases Dispositivo`
- **Method**: `POST`
- **URL**: 
  ```
  https://monitor.cloudmallorca.com/api/dispositivos/{{ $json.dispositivo_id }}/actualizar-fases
  ```
  (Para desarrollo, usa: `http://localhost/api/dispositivos/{{ $json.dispositivo_id }}/actualizar-fases`)

**Headers:**
- Agrega un header:
  - **Name**: `X-API-Key`
  - **Value**: Tu API Key de Laravel (configurada en el `.env`)
- Agrega otro header:
  - **Name**: `Content-Type`
  - **Value**: `application/json`

**Body (JSON):**
- En **Body Parameters**, agrega:
  - **Name**: `num_fases`
  - **Value**: `={{ $json._num_fases }}`

**Options:**
- Activa **"Ignore Response Code"** para que no falle si hay un error
- Timeout: `5000` ms (5 segundos)

#### 3. Actualizar el Código del Nodo "Procesar Response Shelly"

El código ya detecta el número de fases, pero asegúrate de que incluya `_num_fases` en el output.

Busca en el código del nodo "Procesar Response Shelly" esta sección:

```javascript
return [{
  json: {
    dispositivo_id: dispositivo_id,
    // ... otros campos ...
    datos_raw: JSON.stringify(response.data),
    _num_fases: numFases  // ← Debe estar esta línea
  }
}];
```

Si no está, agrega `_num_fases: numFases` al final del objeto JSON, justo antes de `datos_raw` o después.

#### 4. Conectar los Nodos

1. Desconecta el nodo "Insertar Lectura en MySQL" del nodo "Loop Back"
2. Conecta "Insertar Lectura en MySQL" → "Actualizar Num Fases Dispositivo"
3. Conecta "Actualizar Num Fases Dispositivo" → "Loop Back"

El flujo debe quedar así:
```
Insertar Lectura en MySQL → Actualizar Num Fases Dispositivo → Loop Back
```

## 🔧 Variables de Entorno en n8n

Para facilitar la configuración, puedes usar variables de entorno en n8n:

1. Ve a **Settings** → **Community Nodes** → **Environment Variables**
2. Agrega las siguientes variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `APP_URL` | URL base de tu aplicación Laravel | `https://monitor.cloudmallorca.com` |
| `LARAVEL_API_KEY` | API Key de Laravel | Tu clave del `.env` |

Luego, en los nodos HTTP Request, usa:
- **URL**: `={{ $env.APP_URL }}/api/dispositivos/{{ $json.dispositivo_id }}/actualizar-fases`
- **X-API-Key**: `={{ $env.LARAVEL_API_KEY }}`

## ✅ Verificación

Después de actualizar el workflow:

1. **Activa el workflow** en n8n
2. **Ejecuta una prueba manual** haciendo clic en "Execute Workflow"
3. **Verifica los logs** para asegurarte de que:
   - El nodo "Procesar Response Shelly" detecta `_num_fases`
   - El nodo "Actualizar Num Fases Dispositivo" hace la llamada HTTP correctamente
   - El endpoint responde con `success: true`

4. **Verifica en la base de datos**:
   ```sql
   SELECT id, nombre, num_fases FROM dispositivos WHERE activo = 1;
   ```
   
   Todos los dispositivos activos deberían tener `num_fases` actualizado (1, 2, o 3).

## 🔍 Solución de Problemas

### Error: "num_fases is null"

**Causa**: El código no detectó correctamente el formato del dispositivo.

**Solución**: 
- Verifica que el código de detección en "Procesar Response Shelly" esté completo
- Revisa el JSON de `datos_raw` de una lectura para ver el formato exacto

### Error 401 (Unauthorized)

**Causa**: La API Key no es correcta o no está configurada.

**Solución**: 
- Verifica que el header `X-API-Key` tenga el valor correcto
- Verifica que `API_KEY` en el `.env` de Laravel coincida

### Error 404 (Not Found)

**Causa**: La URL del endpoint no es correcta o el dispositivo no existe.

**Solución**: 
- Verifica la URL del endpoint
- Verifica que `dispositivo_id` tenga un valor válido

### El nodo no actualiza num_fases

**Causa**: El valor `_num_fases` es `null` y el endpoint no puede detectar desde la lectura.

**Solución**: 
- Verifica que el código de detección funcione correctamente
- Revisa que el formato del JSON de Shelly sea compatible

## 📝 Notas Importantes

1. **El nodo "Actualizar Num Fases Dispositivo" es opcional pero recomendado**: Si falla, el workflow continúa normalmente (gracias a "Ignore Response Code").

2. **Detección automática**: Si `num_fases` es `null`, el endpoint intentará detectarlo automáticamente desde la última lectura del dispositivo.

3. **No bloquea el workflow**: Si el endpoint falla, el workflow continúa con el siguiente dispositivo.

4. **Actualización incremental**: El número de fases solo se actualiza cuando cambia o cuando es `null`.

## 🎯 Resultado Esperado

Después de cada ejecución del workflow, los dispositivos deberían tener su campo `num_fases` actualizado automáticamente:

- **Dispositivos trifásicos**: `num_fases = 3`
- **Dispositivos bifásicos**: `num_fases = 2`  
- **Dispositivos monofásicos**: `num_fases = 1`

Esto permite filtrar y gestionar dispositivos por su tipo de fase desde Laravel.

